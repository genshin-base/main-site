import { promises as fs } from 'fs'
import { webcrypto } from 'crypto'
import { getJSON, postJSON } from './requests.js'

const subtle = /**@type {SubtleCrypto}*/ (/**@type{*}*/ (webcrypto).subtle)

const JWT_HEADER = { alg: 'RS256', typ: 'JWT' }

function base64url(str) {
	if (typeof str === 'object') str = JSON.stringify(str)
	return Buffer.from(str).toString('base64url')
}

function log(text) {
	console.log('GOOGLE: ' + text)
}

/** @typedef {{accessToken:string, expiresAt:Date}} AccessTokenInfo */

/**
 * @param {CryptoKey} privateKey
 * @param {string} clientEmail
 * @returns {Promise<AccessTokenInfo>}
 */
async function requestToken(privateKey, clientEmail) {
	const nowUnix = (Date.now() / 1000) | 0

	const jwtClaimSet = {
		iss: clientEmail,
		scope: [
			'https://www.googleapis.com/auth/spreadsheets.readonly',
			'https://www.googleapis.com/auth/drive.readonly',
		].join(' '),
		aud: 'https://oauth2.googleapis.com/token', //access token request
		exp: nowUnix + 3600,
		iat: nowUnix,
	}

	const sigBase = base64url(JWT_HEADER) + '.' + base64url(jwtClaimSet)
	const signature = Buffer.from(
		await subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(sigBase)),
	).toString('base64url')

	const resp = await postJSON('https://oauth2.googleapis.com/token', {
		grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
		assertion: sigBase + '.' + signature,
	})
	return {
		accessToken: resp.data.access_token,
		expiresAt: new Date((nowUnix + resp.data.expires_in) * 1000),
	}
}

/**
 * @param {string} authFilePath
 * @param {string} tokenFilePath
 * @returns {Promise<AccessTokenInfo>}
 */
async function updateTokenIfNeed(authFilePath, tokenFilePath) {
	let data = /**@type {AccessTokenInfo|null}*/ (null)
	try {
		data = JSON.parse(await fs.readFile(tokenFilePath, 'utf-8'), (key, val) =>
			key === 'expiresAt' ? new Date(val) : val,
		)
	} catch (ex) {
		if (ex.code !== 'ENOENT') throw ex
	}
	if (data !== null && data.expiresAt.getTime() > Date.now() + 60 * 1000) {
		log('using existing token')
		return data
	}

	log((data === null ? 'token not found' : 'token has expired') + ', requesting new one')

	const auth = JSON.parse(await fs.readFile(authFilePath, 'utf-8'))
	// console.log(auth)

	const privateKeyData = auth.private_key
		.replace(/-+(?:BEGIN|END) PRIVATE KEY-+/g, '')
		.replace(/\n/g, '')
		.trim()
	const privateKey = await subtle.importKey(
		'pkcs8',
		Buffer.from(privateKeyData, 'base64'), //
		{ name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
		false,
		['sign'], //'verify'
	)

	data = await requestToken(privateKey, auth.client_email)
	await fs.writeFile(tokenFilePath, JSON.stringify(data, null, '\t'))
	return data
}

/**
 * @param {string} authFilePath
 * @param {string} tokenFilePath
 * @param {string} spreadsheetId
 * @param {string[]} fields
 */
export async function loadSpreadsheet(authFilePath, tokenFilePath, spreadsheetId, fields) {
	const { accessToken } = await updateTokenIfNeed(authFilePath, tokenFilePath)

	log('requesting spreadsheet ' + spreadsheetId)

	const resp = await getJSON('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId, {
		fields: fields.join(','),
		includeGridData: 'true',
		access_token: accessToken,
	})
	return resp.data
}

/**
 * @param {string} authFilePath
 * @param {string} tokenFilePath
 * @param {string} spreadsheetFileFPath
 * @param {string} spreadsheetId
 * @param {string[]} fields
 */
export async function loadSpreadsheetCached(
	authFilePath,
	tokenFilePath,
	spreadsheetFileFPath,
	spreadsheetId,
	fields,
) {
	const stat = await fs.stat(spreadsheetFileFPath).catch(err => {
		if (err.code === 'ENOENT') return null
		throw err
	})

	const isOld = false //stat && Date.now() - stat.mtime.getTime() > cacheDurationMS
	if (!stat || isOld) {
		console.log(spreadsheetFileFPath + (isOld ? ' is old' : ' is missing') + ', downloading')
		const resp = await loadSpreadsheet(authFilePath, tokenFilePath, spreadsheetId, fields)
		await fs.writeFile(spreadsheetFileFPath, resp)
	}
}

/**
 * @param {string} authFilePath
 * @param {string} tokenFilePath
 * @param {string} spreadsheetId
 */
export async function loadFileInfo(authFilePath, tokenFilePath, spreadsheetId) {
	const { accessToken } = await updateTokenIfNeed(authFilePath, tokenFilePath)

	log('requesting file info ' + spreadsheetId)

	// console.log(
	// 	(
	// 		await getJSON(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/export`, {
	// 			access_token: accessToken,
	// 			mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
	// 		})
	// 	).data,
	// )

	const resp = await getJSON(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}`, {
		access_token: accessToken,
		fields: 'exportLinks',
	})
	return resp.data
}

/*
const resp = await loadSpreadsheet(
	`${baseDir}/google.private_key.json`,
	`${CACHE_DIR}/google.access_token.json`,
	DOC_ID,
	[
		'sheets.properties',
		'sheets.data.rowData.values.userEnteredValue',
		'sheets.data.rowData.values.userEnteredFormat.textFormat',
	],
)

console.log(
	await loadFileInfo(
		`${baseDir}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
	),
)
*/
