const {Connector} = require("./../../connector")

const client = new Connector("server")
client.connect("ws://localhost:7777", "qwerty")

client.connect_ready().then(()=>{
    client.ws.sendPackage("user_action", {type: "movement", distance: 50})
    
    client.onPackage((name, data, ws)=>{
        switch(name){
            case "userText":{
                console.log(data)
                break
            }
        }
    })

})
