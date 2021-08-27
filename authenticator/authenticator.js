const config    	= require("./config.json")
const express   	= require('express')
const {DB_Mngr} 	= require("./../src/db_mngr")
const {ObjectId}	= require("./../src/db_mngr")
const {Connector}	= require("./../src/connector")

class VKSessionManager extends DB_Mngr{
	constructor(mongo_url, db_name, collection_name){
		super(mongo_url, db_name, collection_name)
	}

	async getSession(session_id){
		let session = await this.collection.findOne({_id: new ObjectId(session_id)})
		return session
	}

	async createSession(vk_id, vk_name, vk_photo){
		await this.collection.deleteMany({vk_id: vk_id})
		let session = await this.collection.insertOne({
			vk_id 	: vk_id,
			vk_name	: vk_name,
			vk_photo: vk_photo,
			time	: Date.now()
		})
		return session.insertedId
	}
}

const vk_sessions 	= new VKSessionManager(config.mongodb_url, "Authenticator", "sessions")
const connector		= new Connector().createServer(config.websocket_port, config.ws_password)

connector.onPackage(async(name, data, ws)=>{
	switch(name){
		case "create_session":{ //data: {vk_id, vk_name, vk_photo}
			let session_id = await vk_sessions.createSession(data.vk_id, data.vk_name, data.vk_photo)
			ws.sendPackage("on_session_created", {
				session_id: session_id,
				vk_id: data.vk_id
			})
		}
	}
})

// express application
const app     = express()

app.use(express.static('public/vk_auth'));

app.get('/vkauth/data', async(req, res)=>{
	let id = req.query.id
	let session = undefined
	if(typeof(id)=="string"){
		if(id.length == "24"){
			session = await vk_sessions.getSession(id)
		}
	}
	if(session){
		res.json(session)
	}else{
		res.end()
	}
})

app.get('/vkauth', (req, res) => {
  res.sendFile(__dirname + "/public/vk_auth/index.html")
})

app.listen(config.https_port, () => {
  console.log(`Example app listening at http://localhost:${config.https_port}`)
})

