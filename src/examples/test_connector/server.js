const {Connector} = require("./../../connector")

const server = new Connector().createServer("7777", "qwerty")

server.onPackage((name, data, ws)=>{
    switch(name){
        case "user_action":{
            console.log(data)
            ws.sendPackage("userText", {text: "Привет!"})
            break
        }
    }
})