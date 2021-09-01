const https = require("https")

class RaspTPUapi{
    constructor(){

    }

    static getGroupHashLink(group){
        return new Promise((resolve, reject)=>{
            let json = ""
            https.get(`https://rasp.tpu.ru/select/search/main.html?q=${group}&page_limit=25&page=1`, res=>{
                res.on("data", chunck=>{
                    json += chunck
                })
                res.on("end", ()=>{
                    try{
                       let data = JSON.parse(json)
                       let url  = "https://rasp.tpu.ru" + data.result[0].url
                       resolve(url)
                    }catch(err){
                        reject("not found")
                    }
                })
            })
        })
    }
}

exports["RaspTPUapi"] = RaspTPUapi