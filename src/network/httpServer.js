const http = require('http');
const querystring = require('querystring');

const { Log } = require('../logger');
const { oneBot11API} = require("../oneBot11/oneBot11");


let errorMsg = null;

let isRunning = false;

const server = http.createServer(async (req, res) => {
    if(req.method !== 'POST'){
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Http server is running');
        return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async() => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');

        try{
            let contentType = req.headers['content-type'];
            let form;

            if(contentType === "application/json"){
                form = body !== "" ? JSON.parse(body) : {}

            }else if(contentType === "application/x-www-form-urlencoded"){
                form = querystring.parse(body);

            }else if(contentType === "multipart/form-data"){
                res.end('{ "code": 403, "msg": "Unsupport content type" }');
                return;

            }else if(body.length > 0){
                res.end('{ "code": 400, "msg": "Wrong content type" }');
                return;

            }else{
                form = { };
            }

            const handler = oneBot11API[req.url[0] == '/' ? req.url.slice(1) : req.url];
            if(handler){
                res.end(JSON.stringify(await handler(form)));
            }else{
                res.end('{ "code": 404, "msg": "Not Found" }');
            }
        }catch(error){
            Log.e(error);
            res.end(`{ "code": 500, "msg": ${error.toString()} }`);
        }
    });

});


function startHttpServer(port){
    if(isRunning) return;

    server.on('error', (e) => {
        if(e.code === 'EADDRINUSE'){
            errorMsg = "端口已被占用";
            Log.w(`Port ${port} is already in used`);
        }
    });

    server.listen(port, '0.0.0.0', () => {
        isRunning = true;
        Log.i(`HTTP Server running at http://0.0.0.0:${port}/`);
    });
}


async function restartHttpServer(port){
    if(isRunning){
        await stopHttpServer();
        Log.i(`restarting Http Server.`);
        startHttpServer(port)
    }else{
        startHttpServer(port);
    }
}


function stopHttpServer(){
    return new Promise((resolve) => {
        if(isRunning){
            server.close(() => {
                Log.i(`HTTP Server stopped.`);
                isRunning = false;
                resolve();
            })
        }else{
            resolve();
        }
    })
}


module.exports = {
    getStatus: () => {
        return {
            status: isRunning,
            msg: errorMsg
        }
    },

    startHttpServer,
    restartHttpServer,
    stopHttpServer
}