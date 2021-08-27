const WebSocket = require("ws")

class Connector{
    constructor(){

    }
    // server block
    createServer(port){
        this.server = new WebSocket.Server({port: port})
        this.server.on("connection", client =>{

        })
    }

    // client block
    connect(ws_adr){
        this.ws = new WebSocket(ws_adr)
        this.ws.on("open", (ws)=>{
            this.work = true
        })

        this.ws.on("close", ()=>{
            this.work = false
        })
    }

    connect_ready(){ // use it like: "await connector_object.connect_ready(); ..."
        return new Promise((resolve, reject)=>{
            let interval
            interval    = setInterval(()=>{
                if(this.work){
                    clearInterval(interval)
                    resolve(true)
                }
            }, 50)
        })
    }

    send(message){
        if(this.work){
            this.ws.send(message)
        }
    }
    
}

exports["Connector"] = Connector