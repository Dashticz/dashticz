 //add custom javascript in here
function afterGetDevices(){
	
	
}

function getExtendedBlockTypes(blocktypes){
	//blocktypes.Type['Lighting 2'] = { icon: 'fa fa-lightbulb-o', title: '<Name>', value: 'ds' }
	blocktypes.Type['Wind'] = {
	//	icon: 'fas fa-car',
		title: 'title <DirectionStr>',
		value: 'value <DirectionStr>'
	}
	return blocktypes;
} 
