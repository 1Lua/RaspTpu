class RaspQuery{
    constructor(){

    }
    
    static findMonth(words){
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
        let month = undefined
        for(let w = 0; w < words.length; w++){
            let word = words[w]
            for(let i = 0; i < MONTH.length; i++){
                if(word == MONTH[i]){
                    month = i
                    break
                }
            }
        }
        return month
    }
    
    static findDay(word){
        const DAY = [
            ["вс", "воскресенье"],  //0
            ["пн", "понедельник"],  //1
            ["вт", "вторник"],      //2
            ["ср", "среда"],        //3
            ["чт", "четверг"],      //4
            ["пт", "пятница"],      //5
            ["сб", "суббота"]       //6
        ]
    }

    static query(query){
        query = query.trim()
        query = query.toLowerCase()
    }
}

