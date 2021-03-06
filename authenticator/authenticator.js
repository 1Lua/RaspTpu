const config    	= require("./config.json")
const express   	= require("express")
const fs			= require("fs")
const https 		= require("https")
const {Cryptos}		= require("./../src/cryptos")
const {DB_Mngr} 	= require("./../src/db_mngr")
const {ObjectId}	= require("./../src/db_mngr")
const {Connector}	= require("./../src/connector")
const {MailTPUapi}	= require("./../tpu_api/MailTPUapi")

const https_key		= fs.readFileSync("https_key.pem")
const https_cert	= fs.readFileSync("https_cert.pem")
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

	async getUser(vk_id){
		return await this.collection.findOne({vk_id: vk_id})
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
			break
		}
		
		case "get_vkuser_login":{ // data: {vk_id}
			let user = await vk_list.getUser(data.vk_id) // ?????????????????? ???????????? ???? vk_list 
			if(user.login_data){
				let login_data = cryptos.decrypt(user.login_data) // ???????????????????????? ????????????
				login_data = JSON.parse(login_data)
				ws.sendPackage("vkuser_login_data",{
					vk_id		: data.vk_id,
					login		: login_data.username,
					password	: login_data.password
				})
			}
			break
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

app.get('/vkauth', (req, res) => { // ???????????? ???????????????? ??????????????????????
	res.sendFile(__dirname + "/public/vk_auth/index.html")
})

app.get("/vkauth/login", async(req, res)=>{ // ??????????????????????
	try {
		let sessinon_id = req.query.id
		let username 	= req.query.username
		let pass 		= req.query.pass

		let session		= await vk_sessions.getSession(sessinon_id)
		if(session){
			let age = Date.now() - session.time 
			if(age < config.session_time){
				MailTPUapi.authorize(username, pass).then(()=>{ // ???????????????? ??????????????????????
					res.json({result: "success"}) // ???????????????? ???????????? ???? ?????? ????????????????
					connector.sendPackageToListeners("success_vk_auth", {
						vk_id: session.vk_id,
						login: username
					})
					vk_list.addUser(session.vk_id, username, pass) // ???????????????????? ???????????? ?? ????????????
					vk_sessions.deleteSession(session.vk_id) // ???????????????? ????????????
				}).catch(err=>{ // ???? ?????????????? ????????????????????????????????
					res.json({result: err})
				})
			}else{ // c?????????? ????????????????
				res.json({result: "session outdated"})
				connector.sendPackageToListeners("on_session_created", {session_id, vk_id: session.vk_id, url: config.self_url + "/vkauth?id="+session_id})
				vk_sessions.deleteSession(session.vk_id)
			}
		}else{ // ???????????? ???? ????????????????????
			res.json({result: "invalid session"})
		}
	} catch (error) {
		
	}
})

const https_server = https.createServer({key: https_key, cert: https_cert}, app)

https_server.listen(config.https_port, ()=>{
	console.log(`Https server listening at http://localhost:${config.https_port}`)
})

/*app.listen(config.https_port, () => {
	console.log(`Example app listening at http://localhost:${config.https_port}`)
})*/