import './character-picker.scss'
import icon_Sword from '../media/Icon_Sword.png'
import icon_Bow from '../media/Icon_Bow.png'
import icon_Catalyst from '../media/Icon_Catalyst.png'
import icon_Claymore from '../media/Icon_Claymore.png'
import icon_Polearm from '../media/Icon_Polearm.png'

import { elements } from '../utils/elements'
const desctopRows = elements.map(el => (
	<div className="row">
		<div className="col-2 ">
			<img className="rounded-circle d-block mx-auto" src={el.imgSrc} />
		</div>
		<div className="col">
			<img className="rounded-circle d-block mx-auto" src={icon_Sword} />
		</div>
		<div className="col">
			<img className="rounded-circle d-block mx-auto" src={icon_Bow} />
		</div>
		<div className="col">
			<img className="rounded-circle d-block mx-auto" src={icon_Claymore} />
		</div>
		<div className="col">
			<img className="rounded-circle d-block mx-auto" src={icon_Polearm} />
		</div>
		<div className="col">
			<img className="rounded-circle d-block mx-auto" src={icon_Catalyst} />
		</div>
	</div>
))

export function CharacterPicker() {
	return (
		<div className="character-picker">
			<div class="d-none d-lg-block container">
				<div className="row">
					<div className="col-2 "></div>
					<div className="col">
						<img className="rounded-circle d-block mx-auto" src={icon_Sword} />
					</div>
					<div className="col">
						<img className="rounded-circle d-block mx-auto" src={icon_Bow} />
					</div>
					<div className="col">
						<img className="rounded-circle d-block mx-auto" src={icon_Claymore} />
					</div>
					<div className="col">
						<img className="rounded-circle d-block mx-auto" src={icon_Polearm} />
					</div>
					<div className="col">
						<img className="rounded-circle d-block mx-auto" src={icon_Catalyst} />
					</div>
				</div>
				{desctopRows}
			</div>
			<div class="d-lg-none">
				<div className="row">
					<div className="col-2 ">огонь</div>
					<div className="col">
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
					</div>
				</div>
				<div className="row">
					<div className="col-2 ">огонь</div>
					<div className="col">
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
						<img className="rounded-circle d-inline" src="" />
					</div>
				</div>
			</div>
		</div>
	)
}
{
	/* <div className="col">огонь</div>
<div className="col">вода</div>
<div className="col">воздух</div>
<div className="col">электро</div>
<div className="col">дендро ТУДУ</div>
<div className="col">крио</div>
<div className="col">гео</div> */
	/* <div className="col">меч</div>
<div className="col">клеймор</div>
<div className="col">копье</div>
<div className="col">каталист</div>
<div className="col">лук</div> */
}
