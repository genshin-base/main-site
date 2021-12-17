import { promises as fs } from 'fs'
import { webcrypto } from 'crypto'
import { getJSON, postJSON } from './requests.js'
import { relativeToCwd } from './utils.js'

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ErrorType}
 * @typedef {'ERROR_TYPE_UNSPECIFIED' | 'ERROR' | 'NULL_VALUE'
 *   | 'DIVIDE_BY_ZERO' | 'VALUE' | 'REF' | 'NAME' | 'NUM' | 'N_A' | 'LOADING'} ErrorType
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ErrorValue}
 * @typedef {{type: ErrorType, message: string}} ErrorValue
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue}
 * @typedef {{numberValue: number}
 *   | {stringValue: string}
 *   | {boolValue: boolean}
 *   | {formulaValue: string}
 *   | {errorValue: ErrorValue}
 * } ExtendedValue
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Color}
 * @typedef {{red:number, green:number, blue:number}} Color
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ThemeColorType}
 * @typedef {'THEME_COLOR_TYPE_UNSPECIFIED' | 'TEXT' | 'BACKGROUND'
 *   | 'ACCENT1' | 'ACCENT2' | 'ACCENT3' | 'ACCENT4' | 'ACCENT5' | 'ACCENT6' | 'LINK'} ThemeColorType
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#ColorStyle}
 * @typedef {{rgbColor:Color} | {themeColor:ThemeColorType}} ColorStyle
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#Link}
 * @typedef {{uri: string}} Link
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/other#TextFormat}
 * @typedef {object} TextFormat
 * @prop {Color} [foregroundColor]
 * @prop {ColorStyle} [foregroundColorStyle]
 * @prop {string} [fontFamily]
 * @prop {number} [fontSize]
 * @prop {boolean} [bold]
 * @prop {boolean} [italic]
 * @prop {boolean} [strikethrough]
 * @prop {boolean} [underline]
 * @prop {Link} [link]
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellFormat}
 * @typedef {object} CellFormat
 * prop {NumberFormat} numberFormat
 * prop {Color} backgroundColor
 * prop {ColorStyle} backgroundColorStyle
 * prop {Borders} borders
 * prop {Padding} padding
 * prop {HorizontalAlign} horizontalAlignment
 * prop {VerticalAlign} verticalAlignment
 * prop {WrapStrategy} wrapStrategy
 * prop {TextDirection} textDirection
 * @prop {TextFormat} textFormat
 * prop {HyperlinkDisplayType} hyperlinkDisplayType
 * prop {TextRotation} textRotation
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#TextFormatRun}
 * @typedef {object} TextFormatRun
 * @prop {number} [startIndex]
 * @prop {TextFormat} format
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/cells#CellData}
 * @typedef {object} CellData
 * @prop {ExtendedValue} [userEnteredValue]
 * prop {ExtendedValue} effectiveValue
 * prop {string} formattedValue
 * @prop {CellFormat} [userEnteredFormat]
 * prop {CellFormat} effectiveFormat
 * prop {string} hyperlink
 * prop {string} note
 * @prop {TextFormatRun[]} [textFormatRuns]
 * prop {DataValidationRule} dataValidation
 * prop {PivotTable} pivotTable
 * prop {DataSourceTable} dataSourceTable
 * prop {DataSourceFormula} dataSourceFormula
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#RowData}
 * @typedef {object} RowData
 * @prop {CellData[]} [values]
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridData}
 * @typedef {object} GridData
 * prop {integer} startRow
 * prop {integer} startColumn
 * @prop {RowData[]} rowData
 * prop {DimensionProperties[]} rowMetadata
 * prop {DimensionProperties[]} columnMetadata
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetType}
 * @typedef {'SHEET_TYPE_UNSPECIFIED' | 'GRID' | 'OBJECT' | 'DATA_SOURCE'} SheetType
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#GridProperties}
 * @typedef {object} GridProperties
 * @prop {number} rowCount
 * @prop {number} columnCount
 * @prop {number} [frozenRowCount]
 * @prop {number} [frozenColumnCount]
 * @prop {boolean} [hideGridlines]
 * @prop {boolean} [rowGroupControlAfter]
 * @prop {boolean} [columnGroupControlAfter]
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#SheetProperties}
 * @typedef {object} SheetProperties
 * @prop {number} sheetId
 * @prop {string} title
 * @prop {number} index
 * @prop {SheetType} sheetType
 * @prop {GridProperties} gridProperties
 * @prop {boolean} [hidden]
 * @prop {Color} [tabColor]
 * @prop {ColorStyle} [tabColorStyle]
 * @prop {boolean} [rightToLeft]
 * prop {DataSourceSheetProperties} dataSourceSheetProperties
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/sheets#Sheet}
 * @typedef {object} Sheet
 * @prop {SheetProperties} properties
 * @prop {GridData[]} data
 * prop {GridRange[]} merges
 * prop {ConditionalFormatRule[]} conditionalFormats
 * prop {FilterView[]} filterViews
 * prop {ProtectedRange[]} protectedRanges
 * prop {BasicFilter} basicFilter
 * prop {EmbeddedChart[]} charts
 * prop {BandedRange[]} bandedRanges
 * prop {DeveloperMetadata[]} developerMetadata
 * prop {DimensionGroup[]} rowGroups
 * prop {DimensionGroup[]} columnGroups
 * prop {Slicer[]} slicers
 */

/**
 * {@link https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets#Spreadsheet}
 * @typedef {object} Spreadsheet
 * prop {string} spreadsheetId
 * prop {SpreadsheetProperties} properties
 * @prop {Sheet[]} sheets
 * prop {NamedRange[]} namedRanges
 * prop {string} spreadsheetUrl
 * prop {DeveloperMetadata[]} developerMetadata
 * prop {DataSource[]} dataSources
 * prop {DataSourceRefreshSchedule[]} dataSourceSchedules
 */

/**
 * @typedef {{error:{code:number, message:string, status:string, details:unknown[]}}} RequestError
 */

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
 * @returns {Promise<Spreadsheet>}
 */
export async function loadSpreadsheet(authFilePath, tokenFilePath, spreadsheetId, fields) {
	const { accessToken } = await updateTokenIfNeed(authFilePath, tokenFilePath)

	log('requesting spreadsheet ' + spreadsheetId)

	const resp = await getJSON('https://sheets.googleapis.com/v4/spreadsheets/' + spreadsheetId, {
		fields: fields.join(','),
		includeGridData: 'true',
		access_token: accessToken,
	})
	/** @type {Spreadsheet | RequestError} */
	const data = JSON.parse(resp.data)
	if ('error' in data) throw new Error(`[${data.error.status}]: ${data.error.message}`)
	return data
}

/**
 * @param {string} authFilePath
 * @param {string} tokenFilePath
 * @param {string} spreadsheetFileFPath
 * @param {string} spreadsheetId
 * @param {string[]} fields
 * @returns {Promise<Spreadsheet>}
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
		log(`${relativeToCwd(spreadsheetFileFPath)} is ${isOld ? 'old' : 'missing'}, downloading`)
		const resp = await loadSpreadsheet(authFilePath, tokenFilePath, spreadsheetId, fields)
		await fs.writeFile(spreadsheetFileFPath, JSON.stringify(resp, null, '\t'))
		return resp
	} else {
		return JSON.parse(await fs.readFile(spreadsheetFileFPath, 'utf-8'))
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
