const {DB_Mngr} = require("./db_mngr")

class Accounter extends DB_Mngr{
    constructor(url){
        super(url, "RaspTpu", "users")
    }

    static emptyVKUser(){
        return {
            type: "VK",
            vk_id: 0,
            chat_status: "main"
        }
    }

    

    async findUser(params){
        if(await this.ready()){
            let user_data = await this.collection.findOne(params)
            return user_data
        }
    }

    async addVKUser(vk_id){
        if(await this.ready()){
            let user = Accounter.emptyVKUser()
            user.vk_id = vk_id
            this.collection.insertOne(user)
            return user
        }
    }

    async updateUserInfo(user_data, params){
        if(await this.ready()){
            await this.collection.updateOne({_id: user_data._id}, {$set: params})
        }
    }

    async removeVKUser(vk_id){
        if(await this.ready()){
            this.collection.deleteMany({vk_id: vk_id})
        }
    }

}

exports["Accounter"] = Accounter