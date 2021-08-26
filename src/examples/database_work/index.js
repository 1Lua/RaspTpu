const {DB_Mngr} = require("./../../db_mngr")

const users = new DB_Mngr("mongodb://localhost:27017/", "RaspTpu", "users")

users.ready().then(async ()=>{
    let user_data = await users.collection.findOne({vk_id: 182013579}) // Получение информации о пользователе
})