const {MailTPUapi}  = require("./../tpu_api/MailTPUapi")
const {Connector}   = require("./../src/connector")
const {Accounter}   = require("./../src/accounter")
const cheerio       = require("cheerio")
const config        = require("./config.json")


class User{ // user = new User("mms25", "11jUcV4"); await user.authotize2()
    constructor(login, password, user_data){
        this.login      = login
        this.password   = password
        this.user_data  = user_data
        this.sessid     = ""
        this.sessauth   = ""
        this.authtoken  = ""
        this.req_token  = ""
    }

    async authorize(){
        return new Promise(async(resolve, reject)=>{
            await MailTPUapi.getUserSessid(this.login)
            .then(sessid=>{
                this.sessid     = sessid
                return MailTPUapi.getUserAuthToken(this.login, this.sessid)
            })
            .then(authtoken=>{
                this.authtoken  = authtoken
                return MailTPUapi.userLogin(this.login, this.password, this.sessid, this.authtoken)
            })
            .then(({new_sessid, sessauth})=>{
                this.sessid     = new_sessid
                this.sessauth   = sessauth
                return MailTPUapi.getRequestToken(this.login, this.sessid, this.sessauth)
            })
            .then(req_token=>{
                if(req_token){
                    this.req_token = req_token
                    resolve(true)
                }else{
                    reject("err login")
                }
            })
            .catch(err=>{reject(err)})
        })
    }

    parseMail(str){
        let matches = str.matchAll(/message_row\((\d+)/gu)
        let mails   = []
        for(let match of matches){
            let id      = Number(match[1])
            let s       = str.match('add_message_row.' + id + '.+')[0]
            let header = "?"
            try {
                let header  = eval("'"+s.match(/subject":"(.+)","from/)[1]+"'")
            } catch (error) {
                
            }
            let from    = "?"
            try {
                from    = eval("'"+s.match(/rcmContactAddress\\\"\>(.+)\<\\\/span\>\<\\\/span/)[1]+"'")
            } catch (error) {
                
            }
            let date    = eval("'"+s.match(/date":"(.+)","size/)[1]+"'")
            let seen    = Boolean(s.match(/seen":1/))
            mails.push({id, header, from, date, seen})
        }
        return mails
    }

    async getMail(){
        let data = await MailTPUapi.getUserMail(this.login, this.sessid, this.sessauth, this.req_token)
        let mails = this.parseMail(data.exec)
        mails.sort((a,b)=>{
            return b.id - a.id
        })
        return {
            messagecount: data.env.messagecount,
            mails       : mails
        }
    }

    async markLetter(id){
        MailTPUapi.markMailAsRead(this.sessid, this.sessauth, this.req_token, id)
    }

    async getLetter(id){
        let data = await MailTPUapi.getUserLetter(this.login, this.sessid, this.sessauth, id)
        let $ = cheerio.load(data)

        return {
            header: $('.subject').text(),
            date:   $('td.header.date').text(),
            from:   $('td.header.from span.adr a.rcmContactAddress').text(),
            text:   $('div#messagebody').text(),
            id: id
        }
    }
}


class MailAgent{
    constructor(){
        this.login_queue    = []
        this.work_queue     = []
        this.login_timeout  = undefined
        this.checkmail_timeout  = undefined
    }

    async checkMail(){
        console.log("Проверка почты.", "work_queue: "+ this.work_queue.length)
        let int = 2000
        new Promise(async(resolve, reject)=>{
            let start = Date.now()
            for(let i = 0; i < this.work_queue.length; i++){
                let user = this.work_queue[i]
                let mail
                try{ // попытка 
                    mail = await user.getMail()
                    if(!mail){
                        throw "mail is undefined"
                    }
                }catch(err){
                    console.log("err " + user.login, err)
                    this.removeFromWorkQueue(user)
                    this.addToLoginQueue(user)
                    continue
                }
                if(user.user_data.messagecount){
                    if(mail.messagecount > user.user_data.messagecount){ // сообщений стало больше
                        let count   = mail.messagecount - user.user_data.messagecount
                        if(count >= 5){ // если новых сообщений больше 5
                            count = 5
                        }
                        let new_mails   = []
                        for(let i = 0; i < count; i++){
                            new_mails.push(mail.mails[i])
                        }
                        accounter.updateUserInfo(user.user_data, {messagecount: mail.messagecount})
                        user.user_data.messagecount = mail.messagecount
                        this.onNewUserMails(user, new_mails.reverse())
                    }else if(mail.messagecount < user.user_data.messagecount){ // сообщений стало менльше
                        accounter.updateUserInfo(user.user_data, {messagecount: mail.messagecount})
                        user.user_data.messagecount = mail.messagecount
                    }
                }else{ // пользователь впервые проверяет почту или почта была обнулена
                    await accounter.updateUserInfo(user.user_data, {messagecount: mail.messagecount})
                    user.user_data.messagecount = mail.messagecount
                }
            }
            console.log("time: ", Date.now()-start)
            this.checkmail_timeout = setTimeout(()=>{
                this.checkMail()
            }, int)
        })
    }

    addToWorkQueue(user){
        this.work_queue.push(user)
    }

    removeFromWorkQueue(user){
        for(let key in this.work_queue){
            let u = this.work_queue[key]
            /*if(user.user_data.type == "VK"){
                if(user.user_data.vk_id == u.user_data.vk_id){
                    this.work_queue.splice(key, 1)
                }
            }*/
            if(String(user.user_data._id) == String(u.user_data._id)){
                this.work_queue.splice(key, 1)
            }
        }
    }

    async onNewUserMails(user, mails){ // получает массив новых писем пользователя
        console.log("Новые письма у "+ user.login, mails.length)
        return new Promise(async(resolve, reject)=>{
            for(let i = 0; i < mails.length; i++){
                if(!mails[i].seen){
                    switch(user.user_data.type){
                        case "VK":{
                            connector.sendPackageToListeners("new_vkuser_letter", {
                                user_data: user.user_data,
                                mail_data: mails[i] // mail_data: {id, header, from, date, seen}
                            })
                        }
                    }
                }
            }
        })
    }

    async sendVKUserLetterText(vk_id, letter_id){
        let user_data = await accounter.findUser({vk_id: vk_id})
        let user
        if(!user_data.mail_notifications){
            connector.sendPackageToListeners("fail_vk_show_letter_text",{
                vk_id       : vk_id,
                letter_id   : letter_id,
                err         : "Вы не подписаны на почтовые уведомления"
            })
            return
        }
        for(let i = 0; i < this.work_queue.length; i++){
            let u = this.work_queue[i]
            if(String(user_data._id) == String(u.user_data._id)){
                user = u
            }
        }
        if(user){ // user is User class object from work_queue
            let mail = await user.getLetter(letter_id).catch(err=>{
                connector.sendPackageToListeners("fail_vk_show_letter_text",{
                    vk_id       : vk_id,
                    letter_id   : letter_id
                })
            })
            if(mail){
                connector.sendPackageToListeners("vk_show_letter_text", {
                    vk_id       : vk_id,
                    letter_text : mail.text
                })
            }
        }else{
            connector.sendPackageToListeners("fail_vk_show_letter_text",{
                vk_id       : vk_id,
                letter_id   : letter_id,
            })
        }
    }

    async markVKUserLetterAsRead(vk_id, letter_id){
        let user_data = await accounter.findUser({vk_id: vk_id})
        let user
        for(let i = 0; i < this.work_queue.length; i++){
            let u = this.work_queue[i]
            if(String(user_data._id) == String(u.user_data._id)){
                user = u
            }
        }
        if(user){ // user is User class object from work_queue
            user.markLetter(letter_id)
        }
    }

    startLogin(){
        const int = 2000
        new Promise(async (resolve, reject)=>{
            console.log("login_queue: "+ this.login_queue.length)
            await this.loginWhoInQueue()
            this.login_timeout = setTimeout(()=>{
                this.startLogin()
            }, int)
        })
    }

    async loginWhoInQueue(){
        while(this.login_queue.length > 0){
            let user = this.login_queue.shift()
            await user.authorize()
            .then(res=>{ // Пользователь прошел авторизацию, добавляем в рабочую очередь
                this.addToWorkQueue(user)
            })
            .catch(async (err)=>{
                console.log(user.login, err)
                switch(err){
                    case "err login":{ // логин и пароль в бд неверный
                        switch(user.user_data.type){
                            
                            case "VK":{
                                //this.addToLoginQueue(user)
                                /*try{
                                    let vk_id = user.user_data.vk_id
                                    await accounter.collection.updateOne({vk_id: user_data.vk_id},{
                                        authorized          : false,
                                        mail_notifications  : false
                                    })
                                    connector.sendPackageToListeners("vk_uncorrect_login",{vk_id: vk_id})
                                    break
                                }catch(err){
                                    console.log(err)
                                }*/
                            }
                        }

                        break
                    }
                    case "no connect":{ // нет соединения с mail2.tpu.ru пользователь встает на авторизацию заново
                        this.addToLoginQueue(user)
                        break
                    }
                }
            })
        }
    }

    addToLoginQueue(user){ // user class User
        console.log("Пользователь " + user.login + " добавлен в очередь на авторизацию")
        this.login_queue.push(user)
    }

    removeFromLoginQueue(user){
        for(let key in this.login_queue){
            let u = this.login_queue[key]
            if(String(user.user_data._id) == String(u.user_data._id)){
                this.login_queue.splice(key, 1)
            }
        }
    }



    removeUser(user_data){ // удаляет пользователя из очереди авторизации и рабочей очереди
        this.removeFromWorkQueue({user_data: user_data})
        this.removeFromLoginQueue({user_data: user_data})
    }

    addNewUser(login, password, user_data){  // добавить пользователя в очередь авторизации
        this.removeUser(user_data) // избежание дублирования пользователя
        this.addToLoginQueue(new User(login, password, user_data))
    }

}

const mail_agent    = new MailAgent()
mail_agent.startLogin() 
mail_agent.checkMail()    


const accounter     = new Accounter(config.mongodb_url)


const authenticator = new Connector("authenticator")
authenticator.connect(config.authenticator_ws_adr, config.authenticator_ws_pass)
authenticator.onPackage(async(name, data, ws)=>{
    switch(name){
        case "vkuser_login_data": { //data: {vk_id, login, password}    // получение данных для авторизации
            let user_data = await accounter.findUser({vk_id: data.vk_id})
            mail_agent.addNewUser(data.login, data.password, user_data)     // добавление пользователя в mail_agent 
        }
    }
})


const connector     = new Connector("server") // mailer ws server
connector.createServer(config.ws_port, config.ws_pass)
connector.onPackage(async(name, data, ws)=>{
    switch(name){
        case "remove_vk_user":{ // data: {vk_id}  // прекратить проверку новых писем у пользователя
            let user_data = await accounter.findUser({vk_id: data.vk_id})
            mail_agent.removeUser(user_data)
            break
        }

        case "add_vk_user":{ // data: {vk_id}// запустить проверку новых писем у пользователя
            authenticator.sendPackage(authenticator.ws, "get_vkuser_login", {vk_id: data.vk_id})
            // логин и пароль придет от аунтификатора в пакете vkuser_login_data
            // добавление в очередь проверки писем произойдет внутри обработчика пакета
            break
        }

        case "get_vkuser_letter_text":{ // data:{vk_id, letter_id} // получить текст письма
            mail_agent.sendVKUserLetterText(data.vk_id, data.letter_id)
        }

        case "mark_vkuser_letter_as_read":{ // data:{vk_id, letter_id}
            mail_agent.markVKUserLetterAsRead(data.vk_id, data.letter_id)
        }
    }
})


async function main(){
    await accounter.ready() // ожидания соединения с БД
    let users_data = await accounter.collection.find({ // получение списка людей, подписавшихся на обновления
        mail_notifications  : true,
        authorized          : true
    }).toArray()

    await authenticator.connect_ready() // ожидание подключения к Authenticator

    for(let i = 0; i < users_data.length; i++){
        let user_data = users_data[i]
        switch(user_data.type){
            case "VK" :{
                authenticator.sendPackage(authenticator.ws, "get_vkuser_login",{
                    vk_id: user_data.vk_id
                })
            }
        }
    }
    

}

main()