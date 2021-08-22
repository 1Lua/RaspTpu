const ws = require("ws")

class Connector{
    constructor(){

    }
    // server block
    createServer(port){
        this.server = new ws.Server({port: port})
        this.server.on("connection", client =>{

        })
    }

    // client block
    connect(wss_adr){
        
    }
}

exports["Connector"] = Connector