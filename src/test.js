const {Connector} = require("./connector")

const agent = new Connector().connect("ws://localhost:7001", "12345")

agent.connect_ready().then(()=>{
    agent.ws.sendPackage("create_session", {vk_id: 229, vk_name: "qwerty", vk_photo: "photo"})
})

agent.onPackage((name, data, ws)=>{
    switch(name){
        case "on_session_created": {
            console.log(data)
            break
        }
    }
})