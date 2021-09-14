const {VK, API, Upload, Updates, Keyboard, Params } = require("vk-io")
const {Accounter} = require("./../src/accounter")

const config = require("./config.json")

class VKBot{
    random(){
        const min = 10000000
        const max = 99999999
        let rand = min - 0.5 + Math.random() * (max - min + 1);
        return Math.round(rand);
    }

    constructor(){
        this.API_TOKEN  = config.vk_token
        this.vk         = new VK        ({token: this.API_TOKEN})
        this.api        = new API       ({token: this.API_TOKEN});
        this.upload     = new Upload    ({api: this.api});
        this.updates    = new Updates   ({api: this.api, upload: this.upload});
    }
}

const vk_bot = new VKBot()

vk_bot.api.messages.send({
    message     : "Хорошие новости! 😊\nВышло обновление Чат-Бота, теперь есть возможность просматривать учебное расписание!\nКак пользоваться ботом вы можете прочитать здесь: https://vk.com/@rasptpu-kak-polzovatsya-chat-botom-rasptpu",
    random_id   : vk_bot.random(),
    peer_id     : 182013579
})

const accounter = new Accounter(config.mongodb_url)

async function main(){
    await accounter.ready()
    let users = await accounter.collection.find({type: "VK"}).toArray()
    
    for(let i = 0; i < users.length; i++){
        vk_bot.api.messages.send({
            message     : "Хорошие новости! 😊\nВышло обновление Чат-Бота, теперь есть возможность просматривать учебное расписание!\nКак пользоваться ботом вы можете прочитать здесь: https://vk.com/@rasptpu-kak-polzovatsya-chat-botom-rasptpu",
            random_id   : vk_bot.random(),
            peer_id     : users[i].vk_id
        })
        
    }
}

main()