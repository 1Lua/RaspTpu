const config    	= require("./config.json")
const express   	= require("express")
const fs			= require("fs")
const {Cryptos}		= require("./../src/cryptos")
const {DB_Mngr} 	= require("./../src/db_mngr")
const {ObjectId}	= require("./../src/db_mngr")
const {Connector}	= require("./../src/connector")
const {MailTPUapi}	= require("./../tpu_api/MailTPUapi")

const private_key 	= fs.readFileSync(config.private_key)
const public_key 	= fs.readFileSync(config.public_key)
const cryptos		= new Cryptos(private_key, public_key)


class VKSessionManager extends DB_Mngr{
	constructor(mongo_url, db_name, collection_name){
		super(mongo_url, db_name, collection_name)
	}

	async getSession(session_id){
		let session = await this.collection.findOne({_id: new ObjectId(session_id)})
		return session
	}

	async deleteSession(vk_id){
		await this.collection.deleteMany({vk_id:vk_id})
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

class VKList extends DB_Mngr{
	constructor(mongo_url, db_name, collection_name){
		super(mongo_url, db_name, collection_name)
	}

	async addUser(vk_id, username, password){
		await this.removeUser(vk_id)
		let data = {
			vk_id: vk_id,
			login_data: cryptos.encrypt(JSON.stringify({username, password}))
		}
		await this.collection.insertOne(data)
	}

	async removeUser(vk_id){
		await this.collection.deleteMany({vk_id: vk_id})
	}
}

const vk_list	= new VKList(config.mongodb_url, "Authenticator", "vk_list")

// connector

const connector	= new Connector().createServer(config.websocket_port, config.ws_password)

connector.onPackage(async(name, data, ws)=>{
	switch(name){
		case "create_session":{ //data: {vk_id, vk_name, vk_photo}
			let session_id = await vk_sessions.createSession(data.vk_id, data.vk_name, data.vk_photo)
			ws.sendPackage("on_session_created", {
				session_id	: session_id,
				vk_id		: data.vk_id,
				url			: config.self_url + "/vkauth?id="+session_id
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

app.get('/vkauth', (req, res) => { // запрос страницы авторизации
	res.sendFile(__dirname + "/public/vk_auth/index.html")
})

app.get("/vkauth/login", async(req, res)=>{ // авторизация
	try {
		let sessinon_id = req.query.id
		let username 	= req.query.username
		let pass 		= req.query.pass

		let session		= await vk_sessions.getSession(sessinon_id)
		if(session){
			let age = Date.now() - session.time 
			if(age < config.session_time){
				MailTPUapi.authorize(username, pass).then(()=>{ // успешная авторизация
					res.json({result: "success"}) // отправка ответа на веб страницу
					connector.sendPackageToListeners("success_vk_auth", {
						vk_id: session.vk_id,
						login: username
					})
					vk_list.addUser(session.vk_id, username, pass) // сохранение логина и пароля
					vk_sessions.deleteSession(session.vk_id) // удаление сессии
				}).catch(err=>{ // не удалось авторизироваться
					res.json({result: err})
				})
			}else{ // cессия устарела
				res.json({result: "session outdated"})
				connector.sendPackageToListeners("on_session_created", {session_id, vk_id: session.vk_id, url: config.self_url + "/vkauth?id="+session_id})
				vk_sessions.deleteSession(session.vk_id)
			}
		}else{ // сессии не существует
			res.json({result: "invalid session"})
		}
	} catch (error) {
		
	}
})

app.listen(config.https_port, () => {
	console.log(`Example app listening at http://localhost:${config.https_port}`)
})

