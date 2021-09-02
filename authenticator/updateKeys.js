const {Cryptos} = require("./../src/cryptos")
const {DB_Mngr} = require("./../src/db_mngr")
const fs        = require("fs")
const config    = require("./config.json")

console.log("Идет чтение ключей...")

const old_private   = fs.readFileSync(config.private_key)
const old_public    = fs.readFileSync(config.public_key)

const new_private   = fs.readFileSync("new_private.pem")
const new_public    = fs.readFileSync("new_public.pem")

const old_cryptos = new Cryptos(old_private, old_public)
const new_cryptos = new Cryptos(new_private, new_public)


console.log("Ключи были успешно прочитаны!")

console.log("Подключение к базе данных")
const db_mngr = new DB_Mngr(config.mongodb_url, "Authenticator", "vk_list")

db_mngr.ready().then(async()=>{
    console.log("Успешное подключение к базе данных!")
    console.log("Начат процесс обновления записей...")
    
    let users = await db_mngr.collection.find({}).toArray()
    for(let i = 0; i < users.length; i++){
        let user        = users[i]
        let login_data  = user.login_data
        login_data      = old_cryptos.decrypt(login_data)
        login_data      = new_cryptos.encrypt(login_data)
        await db_mngr.collection.updateOne({_id: user._id}, {$set: {login_data}})
    }
    console.log(`Обновлено ${users.length} записей`)

    fs.writeFileSync(config.private_key, new_private)
    fs.writeFileSync(config.public_key, new_public)
    
    console.log("Ключи обновлены")
    process.exit()
})
