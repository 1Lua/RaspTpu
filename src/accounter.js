const {DB_Mngr} = require("./db_mngr")

class Accounter extends DB_Mngr{
    constructor(url, db_name, collection_name){
        super(url, db_name, collection_name)
    }

    static emptyUser(){
        return {
            type: "VK",
            vk_id: 0,
            chat_status: "main"
        }
    }

    

    async findUser(params){
        if(await this.ready()){
            let user_data = await this.collection.findOne(params)
        }
    }

    async addUser(vk_id){
        if(await this.ready()){
            let user = this.emptyUser()
            user.vk_id = vk_id
            this.collection.insertOne(user)
        }
    }

    async removeUser(vk_id){
        if(await this.ready()){
            this.collection.deleteMany({vk_id: vk_id})
        }
    }

}