const {MongoClient} = require("mongodb")
const {ObjectId}    = require("mongodb")

class DB_Mngr{

    constructor(url, db_name, collection_name){
        this.connect(url, db_name, collection_name)
    }

    connect(url, db_name, collection_name){
        this.mongoClient = new MongoClient(url, { useUnifiedTopology: true })
        this.mongoClient.connect((err, client)=>{
            if(err){
                console.log(err)
            }
            this.db = client.db(db_name)
            this.collection = this.db.collection(collection_name)
        })
        this.mongoClient.on("close", ()=>{
            this.collection = undefined
            this.db = undefined
            console.log("Connection with MongoDB closed.")
            this.connect(url)
        })
    }

    async ready(){
        if(this.collection){
            return true
        }else{
            let int
            await new Promise((resolve, reject)=>{
                int = setInterval(() => {
                    if(this.collection){
                        resolve()
                    }
                }, 10);
            })
            clearInterval(int)
            return true
        }
    }
} 

exports["DB_Mngr"]  = DB_Mngr
exports["ObjectId"] = ObjectId