const {RaspTPUapi}  = require("./../tpu_api/RaspTPUapi")
const {Connector}   = require("./../src/connector")
const {Accounter}   = require("./../src/accounter")

const config        = require("./config.json")

class RaspQuery{    
    static findMonth(words){ // поиск месяца в словах
        const MONTH = [
            "января",   //0
            "февраля",  //1
            "марта",    //2
            "апреля",   //3
            "мая",      //4
            "июня",     //5
            "июля",     //6
            "августа",  //7
            "сентября", //8
            "октября",  //9
            "ноября",   //10
            "декабря",  //11
        ]
        for(let w = 0; w < words.length; w++){
            let word = words[w]

            for(let i = 0; i < MONTH.length; i++){
                if(word == MONTH[i]){
                     return i
                }
            }
        }
        return undefined
    }

    static findDay(query){
        try{
            return query.match(/(\d+)/)[0]
        }catch(err){}
        return undefined
    }

    static findWeekDay(words){ // поиск дня недели в словах
        const DAY = [
            ["null"],  //0
            ["пн", "понедельник"],  //1
            ["вт", "вторник"],      //2
            ["ср", "среда"],        //3
            ["чт", "четверг"],      //4
            ["пт", "пятница"],      //5
            ["сб", "суббота"],      //6
            ["вс", "воскресенье"]   //7
        ]

        for(let w = 0; w < words.length; w++){
            let word = words[w]
            for(let day = 0; day < DAY.length; day++){
                for(let i = 0; i < DAY[day].length; i++){
                    if(word == DAY[day][i]){
                        return day
                    }
                }
            }
        }
        return undefined
    }

    static findKeyDay(words){
        const KEY = {
            "позавчера"     : -2,
            "вчера"         : -1,
            "сегодня"       : 0,
            "завтра"        : 1,
            "послезавтра"   : 2
        }
        
        for(let w = 0; w < words.length; w++){
            let word = words[w]
            for(let key in KEY){
                if(word == key){
                    words.splice(w, 1)
                    return KEY[key]
                }
            }
        }

        return undefined
    }

    static findKeyInc(words){
        const KEY = {
            "предыдущий": -1,
            "предыдущая": -1,
            "предыдущее": -1,
            "следующий" : 1,
            "следующая" : 1,
            "следующее" : 1
        }
        
        for(let w = 0; w < words.length; w++){
            let word = words[w]
            for(let key in KEY){
                if(word == key){
                    words.splice(w, 1)
                    return KEY[key]
                }
            }
        }

        return 0
    }

    static formatDate(date){
        var dd = date.getDate();
        if (dd < 10) dd = '0' + dd;
        var mm = date.getMonth() + 1;
        if (mm < 10) mm = '0' + mm;
        var yyyy = date.getFullYear();
        return dd + '.' + mm + '.' + yyyy;
    }

    static query(query){
        query = query.trim()
        query = query.toLowerCase()
        let query_words = query.split(" ")
        var params = {
            month   : this.findMonth(query_words),
            day     : this.findDay(query),
            weekDay : this.findWeekDay(query_words),
            keyDay  : this.findKeyDay(query_words),
            keyInc  : this.findKeyInc(query_words),
            group   : undefined
        }

        // handler

        //console.log(params)

        let today   = new Date(Date.now())
        let year    = today.getFullYear()
        let month   = today.getMonth()
        let day     = today.getDate()
        let weekDay = today.getDay()

        let result = {
            date    : undefined,
            group   : params.group
        }

        if(params.keyDay !== undefined){ // в запросе присутствуют слова по типу "сегодня", "завтра"
            let date = new Date(year, month, day + params.keyDay)
            result.date = this.formatDate(date)
            return result
        }

        if(params.weekDay !== undefined){ // в запросе присутсвует слова по типу "пятница", "суббота"
            if(weekDay <= params.weekDay){ // предстоящий день
                let date = new Date(year, month, day + (params.weekDay - weekDay) + params.keyInc*7)
                result.date = this.formatDate(date)
                return result
            }else{ // прошедший день    
                let date = new Date(year, month, day - (weekDay - params.weekDay) + params.keyInc*7)
                result.date = this.formatDate(date)
                return result
            }
        }

        if(params.month!== undefined && params.day!==undefined){ // в запросе присутствует дата по типу "1 сентября"
            let date = new Date(year, params.month, params.day)
            result.date = this.formatDate(date)
            return result
        }

        return undefined
    }
}

const accounter = new Accounter(config.mongodb_url)

const connector = new Connector("server")
connector.createServer(config.ws_port, config.ws_pass)

connector.onPackage((name, data, ws)=>{
    switch(name){
        case "get_rasp":{ // data:{user_data, query}
            try{
                if(!data.user_data.current_group){
                    break
                }
                let group = data.user_data.current_group
                let date = RaspQuery.query(data.query).date
                if(data){
                    RaspTPUapi.getGroupRaspByDate(group, date).then(rasp=>{
                        connector.sendPackage(ws, "show_rasp", {
                            vk_id: data.user_data.vk_id, 
                            rasp: rasp,
                            group: group,
                            date: date
                        })
                    }).catch(err=>{})
                }
            }catch(err){}
            break
        }
    }    
})