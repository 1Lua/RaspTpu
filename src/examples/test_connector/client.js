const {Connector} = require("./../../connector")

const client = new Connector("server")          // в аргументе имя сервера, отображаемое в консоли
client.connect("ws://localhost:7777", "qwerty") // подключение к серверу

client.connect_ready().then(()=>{ // ожидание подключения

    client.ws.sendPackage("user_action", {type: "movement", distance: 50}) // отправка пакета user_action
    
    client.onPackage((name, data, ws)=>{ // дествие при получении пакета
        switch(name){
            case "userText":{
                console.log(data)
                break
            }
        }
    })

})
