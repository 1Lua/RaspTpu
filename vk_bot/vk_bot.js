const {VK, API, Upload, Updates, Keyboard, Params } = require("vk-io")
const {RaspTPUapi}  = require("./../tpu_api/RaspTPUapi")
const {Connector}   = require("./../src/connector")
const {Accounter}   = require("./../src/accounter")
const config        = require("./config.json")

class VKBot{

    constructor(){
        this.API_TOKEN  = config.vk_token
        this.vk         = new VK        ({token: this.API_TOKEN})
        this.api        = new API       ({token: this.API_TOKEN});
        this.upload     = new Upload    ({api: this.api});
        this.updates    = new Updates   ({api: this.api, upload: this.upload});

        this.updates.on("message_new", async (context) => this.message_handle(context))
        /*this.updates.on("message_new", context => {
            console.log(context.peerId, context.peerType)
            context.
        })*/
        this.updates.start()
    }

    random(){
        const min = 10000000
        const max = 99999999
        let rand = min - 0.5 + Math.random() * (max - min + 1);
        return Math.round(rand);
    }
    
    formatDate(date) {
        var dd = date.getDate();
        if (dd < 10) dd = '0' + dd;
        var mm = date.getMonth() + 1;
        if (mm < 10) mm = '0' + mm;
        var yyyy = date.getFullYear();
        return dd + '.' + mm + '.' + yyyy;
    }

    positiveSmile(){
        let smiles = ['😄','😁','😊','😃','😉','😌','☺','🙃','🙂']
        let index  = Date.now()%smiles.length
        let smile  = smiles[index]
        return " "+smile
    }

    negativeSmile(){
        let smiles = ['😔','😢','😭','🙁','☹','😟','🤦‍♂']
        let index  = Date.now()%smiles.length
        let smile  = smiles[index]
        return " "+smile
    }

    getContextCommand(context){
        if(context.message.payload){
            let payload = context.message.payload
            let command = JSON.parse(payload).command
            return command
        }else{
            return undefined
        }
    }

    getContextItem(context){
        if(context.message.payload){
            let payload = context.message.payload
            let item = JSON.parse(payload).item
            return item
        }else{
            return undefined
        }
    }

    async message_handle(context){

        if(context.peerType == "user"){ // если сообщение внутри диалога с пользователем
            let vk_id       = context.peerId
            let user_data   = await accounter.findUser({vk_id: vk_id})
            if(user_data){
                this.onMessageFromUser(user_data, context)
            }else{
                this.onMessageFromNewUser(vk_id, context)
            }
        }
    }

    async onMessageFromNewUser(vk_id, context){ // сообщение от нового пользователя
        let user_data = await accounter.addVKUser(vk_id)
        context.send("Добро пожаловать в RaspBot!")
        this.showMenu(user_data, "main")
    }

    async onMessageFromUser(user_data, context){ // сообщение от пользователя
        if(context.text == "Домой"){ // cтоп слово
            this.showMenu(user_data, "main")
            return
        }
        
        let command = this.getContextCommand(context)

        switch(command){ // выполнение команды


            case "main_menu":{ // открыть главное меню
                this.showMenu(user_data, "main")
                return
            }

                case "rasp_menu":{ // открыть меню расписания
                    this.showMenu(user_data, "rasp")
                    break
                }

                case "score_menu":{ // открыть меню успеваемости
                    this.showMenu(user_data, "score")
                    break
                }

                case "settings_menu":{ // открыть меню настроек
                    this.showMenu(user_data, "settings")
                    return
                }

                    case "change_group":{ // указать группу
                        await accounter.updateUserInfo(user_data, {chat_status: "change_group"})
                        context.send("Введите номер вашей группы")
                        return
                    }

                    case "authorize":{ // начать процедуру авторизации
                        if(user_data.confirm_conditions){ // пользователь ознакомлен с соглашением
                            this.startUserAuthorization(user_data, context)
                        }else{
                            this.showMenu(user_data, "conditions")
                        }
                        return
                    }

                    case "notifications_menu":{ // открыть меню оповещений
                        this.showMenu(user_data, "notifications")
                        return
                    }
                        
                        case "switch_notify":{ // включение или отключение оповещений
                            let item = this.getContextItem(context)
                            switch(item){
                                case "rasp":{
                                    if(user_data.group_checked){
                                        accounter.updateUserInfo(user_data, {rasp_notifications: !user_data.rasp_notifications})
                                        user_data.rasp_notifications = !user_data.rasp_notifications
                                        if(user_data.rasp_notifications){
                                            await context.send("Оповещения о расписании включены"+this.positiveSmile())
                                        }else{
                                            await context.send("Оповещения о расписании отключены"+this.negativeSmile())
                                        }
                                        this.showMenu(user_data, "notifications")
                                    }else{
                                        context.send("Для получения уведомлений о расписании необходимо указать вашу учебную группу в меню настроек." + this.positiveSmile())
                                    }
                                    break
                                }
                                case "score":{
                                    if(user_data.authorized){
                                        accounter.updateUserInfo(user_data, {score_notifications: !user_data.score_notifications})
                                        user_data.score_notifications = !user_data.score_notifications
                                        if(user_data.score_notifications){
                                            await context.send("Оповещения об успеваемости включены"+this.positiveSmile())
                                        }else{
                                            await context.send("Оповещения об успеваемости отключены"+this.negativeSmile())
                                        }
                                        this.showMenu(user_data, "notifications")
                                    }else{
                                        context.send("Для получения уведомлений об успеваемости необходимо пройти авторизацию в меню настроек."+this.positiveSmile())
                                    }
                                    break
                                }
                                case "mail":{
                                    if(user_data.authorized){
                                        accounter.updateUserInfo(user_data, {mail_notifications: !user_data.mail_notifications, messagecount: undefined})
                                        user_data.mail_notifications = !user_data.mail_notifications
                                        if(user_data.mail_notifications){
                                            mailer.sendPackage(mailer.ws, "add_vk_user", {vk_id: user_data.vk_id})
                                            await context.send("Оповещения о новых письмах включены"+this.positiveSmile())
                                        }else{
                                            mailer.sendPackage(mailer.ws, "remove_vk_user", {vk_id: user_data.vk_id})
                                            await context.send("Оповещения о новых письмах отключены"+this.negativeSmile())
                                        }
                                        this.showMenu(user_data, "notifications")
                                    }else{
                                        context.send("Для получения уведомлений о новых письмах необходимо пройти авторизацию в меню настроек." + this.positiveSmile())
                                    }
                                    break
                                }
                            }
                            break
                        }
            
            case "letter_show_text":{ // показать текст письма
                let item = this.getContextItem(context) // id письма
                mailer.sendPackage(mailer.ws, "get_vkuser_letter_text",{
                    vk_id       : context.peerId,
                    letter_id   : item
                }).catch(err=>{
                    this.onGetLetterTextFail(context.peerId, item)
                })
                break
            }
        }

        let chat_status = user_data.chat_status

        switch(chat_status){
            case "main":{ // пользователь находится в главном меню
                break
            }

                case "rasp":{ // пользователь находится в меню расписания
                    break
                }

                case "score":{ // пользователь находится в меню успеваемости
                    break
                }

                case "settings":{ // пользователь находится в меню настроек
                    break
                }
                    case "change_group":{ // пользователь указывает группу
                        RaspTPUapi.getGroupHashLink(context.text)
                        .then(url=>{
                            accounter.updateUserInfo(user_data, {
                                group_name  : context.text,
                                group_url   : url
                            })
                            context.send("Вы успешно поменяли группу, теперь вы можете получить прямую ссылку на расписание в главном меню " + this.positiveSmile())
                        })
                        .catch(err=>{
                            context.send("Группа не найдена " + this.negativeSmile() + "\nПопробуйте ещё раз")
                        })
                        break
                    }

                    case "conditions":{ // пользователь ознакамливается с пользовательским соглашением
                        if(context.text.toLowerCase() == "подтверждаю"){
                            await accounter.updateUserInfo(user_data, {confirm_conditions: true})
                            await accounter.updateUserInfo(user_data, {chat_status: "authorization"})
                            this.startUserAuthorization(user_data, context)
                        }else{
                            context.send("Вы не согласились с пользовательским соглашением")
                            this.showMenu(user_data, "settings")
                        }
                        break
                    }

                    case "authorization":{ // пользователь проходит авторизацию

                    }


        }



    }

    async showMenu(user_data, menu){
        switch(menu){
            case "main":{
                await accounter.updateUserInfo(user_data, {chat_status: "main"})
                this.vk.api.messages.send({
                    message     : "Главное меню",
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                    keyboard    : this.genKeyBoard("main")
                })
                break
            }

            case "score":{
                this.vk.api.messages.send({
                    message     : "Модуль Успеваемсти в разработке"+this.positiveSmile()+"\nУзнать о модуле можно тут: ",
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                    keyboard    : Keyboard.builder()
                        .inline(true)
                        .urlButton({
                            label   : "Планируемые нововведения",
                            url     : "https://vk.com/wall-204356004_1"
                        })
                })
                break
            }

            case "rasp":{
                await this.vk.api.messages.send({
                    message     : "Модуль Расписания в разработке"+this.positiveSmile()+"\nУзнать о модуле можно тут: ",
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                    keyboard    : Keyboard.builder()
                        .inline(true)
                        .urlButton({
                            label   : "Планируемые нововведения",
                            url     : "https://vk.com/wall-204356004_1"
                        })
                })

                if(user_data.group_url && user_data.group_name){
                    this.vk.api.messages.send({
                        message     : `Расписание ${user_data.group_name} на сегодня ` + this.positiveSmile(),
                        random_id   : this.random(),
                        peer_id     : user_data.vk_id,
                        keyboard    : Keyboard.builder()
                            .inline(true)
                            .urlButton({
                                label   : "Перейти на сайт rasp.tpu.ru",
                                url     : user_data.group_url
                            })
                    })
                }
                break
            }

            case "settings":{
                await accounter.updateUserInfo(user_data, {chat_status: "settings"})
                this.vk.api.messages.send({
                    message     : "Меню настроек",
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                    keyboard    : this.genKeyBoard("settings")
                })
                break
            }

            case "notifications":{
                await accounter.updateUserInfo(user_data, {chat_status: "notifications"})
                let rasp_color  = Keyboard.NEGATIVE_COLOR
                let mail_color  = Keyboard.NEGATIVE_COLOR
                let score_color = Keyboard.NEGATIVE_COLOR 
                if(user_data.rasp_notifications)
                    rasp_color  = Keyboard.POSITIVE_COLOR
                if(user_data.mail_notifications)
                    mail_color  = Keyboard.POSITIVE_COLOR
                if(user_data.score_notifications)
                    score_color = Keyboard.POSITIVE_COLOR
                this.vk.api.messages.send({
                    message     : "Настройка оповещений",
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                    keyboard    : Keyboard.builder()
                        .textButton({
                            label:  "Расписание",
                            payload: {
                                command: "switch_notify",
                                item: "rasp" 
                            },
                            color: rasp_color
                        })
                        //.row()
                        .textButton({
                            label:  "Успеваемость",
                            payload: {
                                command: "switch_notify",
                                item: "score" 
                            },
                            color: score_color
                        })
                        //.row()
                        .textButton({
                            label:  "Почта",
                            payload: {
                                command: "switch_notify",
                                item: "mail" 
                            },
                            color: mail_color
                        })
                        .row()
                        .textButton({
                            label:  "⚙ Назад",
                            payload: {
                                command: "settings_menu"
                            },
                            color: Keyboard.PRIMARY_COLOR
                        })
                })
                break
            }

            case "conditions":{
                accounter.updateUserInfo(user_data, {chat_status: "conditions"})
                this.vk.api.messages.send({
                    message     : "Ознакомьтесь с Пользовательским соглашением и Политикой конфеденциальности:",
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                    keyboard    : this.genKeyBoard("conditions")
                })
                this.vk.api.messages.send({
                    message     : 'Напишите "Подтверждаю", если вы ознакомлены и согласны с условиями.',
                    random_id   : this.random(),
                    peer_id     : user_data.vk_id,
                })
                break
            }
        }
    }

    genKeyBoard(name){
        switch(name){
            case "main": {
                let builder = Keyboard.builder()
                .textButton({
                    label: '📅 Расписание',
                    payload: {
                        command: 'rasp_menu'
                    },
                    color: Keyboard.SECONDARY_COLOR
                })
                .row()
                .textButton({
                    label: '📊 Успеваемость',
                    payload: {
                        command: 'score_menu'
                    },
                    color: Keyboard.SECONDARY_COLOR
                })
                .row()
                .textButton({
                    label: '⚙ Настройки',
                    payload: {
                        command: 'settings_menu'
                    },
                    color: Keyboard.PRIMARY_COLOR
                })
                return builder
            }

            case "settings":{
                let builder = Keyboard.builder()
                .textButton({
                    label: 'Указать группу',
                    payload: {
                        command: 'change_group'
                    },
                    color: Keyboard.SECONDARY_COLOR
                })
                .row()
                .textButton({
                    label: 'Авторизоваться',
                    payload: {
                        command: 'authorize'
                    },
                    color: Keyboard.SECONDARY_COLOR
                })
                .row()
                .textButton({
                    label: 'Оповещения',
                    payload: {
                        command: 'notifications_menu'
                    },
                    color: Keyboard.SECONDARY_COLOR
                })
                .row()
                .textButton({
                    label: '🏠 Назад',
                    payload: {
                        command: 'main_menu'
                    },
                    color: Keyboard.PRIMARY_COLOR
                })
                return builder

            }
        
            case "conditions":{
                let builder = Keyboard.builder()
                .urlButton({
                    label: 'Пользовательское соглашение',
                    url: "https://vk.com/@rasptpu-soglashenie-ob-ispolzovanii-resursa-rasptpu-dalee-po-tekstu",
                    color: Keyboard.SECONDARY_COLOR
                })
                .urlButton({
                    label: 'Политика конфеденциальности',
                    url: "https://vk.com/topic-204356004_47808790", 
                    color: Keyboard.SECONDARY_COLOR
                })
                .inline(true)
                return builder
            }
        }
    }

    async startUserAuthorization(user_data, context){
        await accounter.updateUserInfo(user_data, {chat_status: "authorization"})
        authenticator.sendPackage(authenticator.ws, "create_session", {
            vk_id   : context.peerId,
            vk_name : await this.getUserName(context.peerId),
            vk_photo: ""
        }).then(()=>{
            context.send("Перейдите по ссылке чтобы продолжить "+ this.positiveSmile())
        }).catch(err=>{
            context.send("Ошибка. Страница авторизации временно недоступна, попробуйте позже")
            this.showMenu(user_data, "setting")
        })
    }

    async getUserName(vk_id){
        let data = await this.vk.api.users.get({user_ids: vk_id})
        let full_name = data[0].first_name + " " + data[0].last_name
        return full_name
    }

    async sendAuthorizeLink(vk_id, url){
        try{
            let user_data = await accounter.findUser({vk_id: vk_id})
            if(user_data.chat_status == "authorization"){
                /*this.vk.api.messages.send({
                    message     : url,
                    random_id   : this.random(),
                    peer_id     : vk_id,
                })*/
                this.vk.api.messages.send({
                    message     : "Авторизация через ВКонтакте",
                    random_id   : this.random(),
                    peer_id     : vk_id,
                    keyboard    : Keyboard.builder().inline(true).urlButton({
                        label   : "Перейти на страницу",
                        url     : url
                    })
                })
            }

        }catch(error){
            
        }
    }

    async onGetLetterText(vk_id, letter_text){
        this.vk.api.messages.send({
            message     : letter_text,
            random_id   : this.random(),
            peer_id     : vk_id,
        })
    }

    async onGetLetterTextFail(vk_id, letter_id, err){
        await this.vk.api.messages.send({
            message     : "Не удалось получить текст сообщения, пожалуйста, перейдите по ссылке " + this.negativeSmile(),
            random_id   : this.random(),
            peer_id     : vk_id,
            keyboard    : Keyboard.builder()
                .inline(true)
                .urlButton({
                    label   : "Открыть",
                    url     : "https://mail2.tpu.ru/rcmail/?_task=mail&_action=show&_uid="+letter_id+"&_mbox=INBOX"
                })
        })
        if(err){
            this.vk.api.messages.send({
                message     : err + this.negativeSmile(),
                random_id   : this.random(),
                peer_id     : vk_id,
            })
        }
    }

    //
    async onSuccessAuthorization(vk_id, login){ // событие при успешной авторизации пользователя
        this.vk.api.messages.send({
            message     : `Вы успешно авторизовались под логином ${login} ${this.positiveSmile()}`,
            random_id   : this.random(),
            peer_id     : vk_id
        })
        let user_data = await accounter.findUser({vk_id:vk_id}) 
        accounter.updateUserInfo(user_data, {authorized:true})  // устанавливаем статус "Авторизован"
        this.showMenu(user_data, "settings")                    // открыть меню настроек
    }

    async onNewUserLetter(vk_id, mail_data){ // mail_data:{id, header, from, date, seen}
        this.api.messages.send({
            message: `📬 Новое письмо на почте.\nОт: `+mail_data.from+`\nДата: `+mail_data.date+`\nТема: `+mail_data.header,
            random_id: this.random(),
            peer_id: vk_id,
            keyboard: Keyboard.builder()
            .textButton({
                label: "Показать текст сообщения",
                payload: {
                    command: "letter_show_text",
                    item: mail_data.id
                }
            })
            .row()
            .textButton({
                label: "Прочитано",
                payload: {
                    command: "mark_letter_as_read",
                    item: mail_data.id
                }
            })
            .urlButton({
                label: "Открыть",
                url: "https://mail2.tpu.ru/rcmail/?_task=mail&_action=show&_uid="+mail_data.id+"&_mbox=INBOX",
                color: Keyboard.POSITIVE_COLOR
            })
            .inline(true)
        })
    }

    async onUncorrectLoginData(vk_id){
        this.vk.api.messages.send({
            message     : "Ваши данные от учетной записи неверные\nПочтовые оповещения отключены",
            peer_id     : vk_id,
            random_id   : this.random()
        })
    }

}

const vk_bot = new VKBot()


const accounter     = new Accounter(config.mongodb_url)


const authenticator = new Connector("authenticator")
authenticator.connect(config.authenticator_ws_adr, config.authenticator_ws_pass)
authenticator.onPackage((name, data, ws)=>{
    switch(name){
        case "on_session_created":{ // когда была создана сессия data: {sessinon_id, vk_id, url}
            vk_bot.sendAuthorizeLink(data.vk_id, data.url)
            break
        }

        case "success_vk_auth":{
            vk_bot.onSuccessAuthorization(data.vk_id, data.login)
            break
        }
    }
})

const mailer    = new Connector("mailer")
mailer.connect(config.mailer_ws_adr, config.mailer_ws_pass)
mailer.onPackage(async (name, data, ws)=>{
    switch(name){
        case "vk_uncorrect_login":{ // data: {vk_id}
            //vk_bot.onUncorrectLoginData(data.vk_id)
            break
        }

        case "new_vkuser_letter":{ // data: {user_data, mail_data:{id, header, from, date, seen}}
            vk_bot.onNewUserLetter(data.user_data.vk_id, data.mail_data)
            break
        }

        case "vk_show_letter_text":{ // data: {vk_id, letter_text}
            vk_bot.onGetLetterText(data.vk_id, data.letter_text)
            break
        }

        case "fail_vk_show_letter_text":{ // {vk_id, letter_id, ?err}
            vk_bot.onGetLetterTextFail(data.vk_id, data.letter_id, data.err)
            break
        }
    }
})