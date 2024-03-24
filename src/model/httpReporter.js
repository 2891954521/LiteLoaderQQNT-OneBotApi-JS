const { Log } = require("../logger");
const { Setting, Reporter } = require('../main/core');

function report(data){
	try{
		if(data == null) return;
		data = JSON.stringify(data)
		fetch(Setting.setting.http.host, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: data
		}).then(() => {}, (err) => {
			Log.w(`http report fail: ${err}\n${data}`);
		});
	}catch(e){
		Log.e(e.toString());
	}
}


function startHttpReport(){
	Reporter.httpReporter = report;
}

function stopHttpReport(){
	Reporter.httpReporter = null;
}


module.exports = {
	startHttpReport,
	stopHttpReport
}