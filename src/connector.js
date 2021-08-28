const WebSocket = require("ws")

class Connector{
    constructor(name){
        this.name = name
        this.message_handler = (message, ws)    =>{}
        this.package_handler = (name, data, ws) =>{}
    }
    
    onPackage(func){
        this.package_handler = func
    }

    onMessage(func){
        this.message_handler = func
    }

    async sendPackage(ws, name, data){
        return new Promise((resolve, reject)=>{
            if(ws.readyState == WebSocket.OPEN){
                ws.send(JSON.stringify({
                    type: "package",
                    name: name, 
                    data: data
                }))
                resolve()
            }else
                reject("socket not ready")
        })
    }

    readMessage(message, ws){
        try{
           let json = JSON.parse(message)
           let type = json.type
           if(type == "package"){
               this.package_handler(json.name, json.data, ws)
           } 
        }catch(err){
            
        }
        this.message_handler(message, ws)
    }
    
    
    // server block
    createServer(port, pass){
        this.password = pass
        this.server = new WebSocket.Server({port: port})
        this.server.on("connection", client =>{
            client.on("message", (message)=>{
                message = String(message)
                if(!client.logined){
                    if(message == this.password){
                        console.log("Слушатель подключен")

                        client["logined"] = true
                        client.sendPackage = (name, data) => {this.sendPackage(client, name, data)}
                    }else{
                        client.terminate()
                    }
                }else{
                    this.readMessage(message, client)
                }
            })
        })
        return this
    }

    async sendPackageToListeners(name, data){
        try{
            this.server.clients.forEach((ws)=>{
                this.sendPackage(ws, name, data)
            })
        }catch(err){

        }
    }

    // client block
    connect(ws_adr, ws_pass){
        console.log("Подключение к "+ this.name)
        this.ws = new WebSocket(ws_adr)
        this.ws.sendPackage = (name, data) => {this.sendPackage(this.ws, name, data)}
        this.ws.on("open", (ws)=>{
            console.log("Соединение с " + this.name + " установлено")
            this.work = true
            this.ws.send(ws_pass)
        })

        this.ws.on("message", (message)=>{
            this.readMessage(String(message), this.ws)
        })

        this.ws.on("close", ()=>{
            this.work = false
            console.log("Нет соединения с "+ this.name)
            setTimeout(()=>{
                delete this.ws
                this.connect(ws_adr, ws_pass)
            }, 1000)
        })

        this.ws.on("error", err=>{
            this.ws.close()
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