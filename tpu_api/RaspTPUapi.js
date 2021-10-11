const https = require("https")
const querystring = require("querystring")
const cheerio = require("cheerio")
const request = require("request")

class Base64{
    static encode(str){
        return Buffer.from(str, "utf8").toString("base64")
    }

    static decode(str){
        return Buffer.from(str, "base64").toString("utf8")
    }
}

class Xor{
    static xor(str, key){
        var newstr = '';
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            newstr += String.fromCharCode(char)
        }
        return newstr
    }

    static encrypt(str, key, base64){
        base64 = (base64 != undefined) ? base64 : true;
        var encodedStr = this.xor(str, key);
        if (base64) {
            return Base64.encode(encodedStr)
        } else {
            return encodedStr
        }
    }

    static decrypt(str, key, base64){
        //console.log("encrypted: ", str)
        //console.log("key: ", key)
        base64 = (base64 != undefined) ? base64 : true;
        if (base64) {
            str = Base64.decode(str)
        }
        return this.xor(str, key)
    }
}

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

    static async getGroupIdByHashLink(hash_link){
        var link = await new Promise((resolve, reject) =>{
            https.get(hash_link, result => {
                resolve(result.headers.location)
            })
        })
        var groupId;
        if(typeof(link) == "string"){
            let m = link.match(/gruppa_(\d+)/)
            if(m){
                groupId = m[1]
            }
        }
        return groupId
        //return link
    }

    static getXorKey(encrypt_data){
        return new Promise((resolve, reject)=>{

            let data = {
                content: encrypt_data
            }
            let str = querystring.stringify(data)
            request.get("https://rasp.tpu.ru/data/encrypt/decrypt.html",{
                body: str
            }, (err, res, body)=>{
                if(!err){
                    try{
                        let obj = JSON.parse(body)
                        resolve(obj.content)
                    }catch(err){
                        console.log(err)
                    }
                }else{
                    console.log(err)
                }
            })
            
        })
    }

    static async parseRasp(html, key){
        let $ = cheerio.load(html)

        /*key = "abcdef"
        $(".encrypt").each(function(i, elem){
            let encrypted_data = elem.attribs["data-encrypt"]
            let decrypted_data = Xor.decrypt(encrypted_data, key, true)
            $(this).html(decrypted_data)
        })*/

        let table = [];
        $("table > tbody > tr").each((i, tr)=>{
            table[i] = {};
            $("table > tbody > tr:nth-child("+ (i+1) +") > td").each((j, td) => {
                switch(j){
                    case 0:
                        let s = $(td).text()
                        s = s.split(" ").join("")
                        s = s.split("\n")
                        table[i]["time"] = {start: s[1], end: s[2]}
                    case 1:
                        let t = $(td).text()
                        let arr = t.split("\n")
                        let info = []
                        arr.forEach((elem) => {
                            elem = elem.trim()
                            if(elem.length > 0){
                                info.push(elem)
                            }
                        });
                        table[i]["lesson"] = info
                }
            })
        })
        return table
    }

    static async getGroupRaspByUrl(url){
        var data = await new Promise((resolve, reject)=>{
            var rawdata = ""
            https.get(url, result=>{
                result.on("data", chunk =>{
                    rawdata = rawdata + chunk
                })
                result.on("end", ()=>{
                    resolve(rawdata)
                })
            })
        })

        var html_data       = JSON.parse(data).html
        var encrypt_data    = JSON.parse(data).encrypt

        var key     = await this.getXorKey(encrypt_data)

        console.log(key)
        var rasp    = await this.parseRasp(html_data, key)
        return rasp
    }

    static async getGroupRaspByDate(name, date, err_handle){
        var rasp = await new Promise(async(resolve, reject) => {
            let hash_link = await this.getGroupHashLink(name)
            if(hash_link){
                resolve(hash_link)
            }else{
                reject("Группа не найдена")
            }
        }).then(async(hs)=>{
            //console.log("Группа найдена.")
            let group_id = await this.getGroupIdByHashLink(hs)
            if(group_id){
                return group_id
            }else{
                throw "Не удалось получить id группы."
            }
        }).then(async(id)=>{
            //console.log("Id группы получен: "+ id)
            let url = "https://rasp.tpu.ru/data/rasp/gruppa_"+id+"/view.html?date=" + date
        
            //console.log(url)

            let rasp = this.getGroupRaspByUrl(url)
        
            if(rasp){
                return rasp
            }else{
                throw "Не удалось получить расписание."
            }
        
        }).finally(async(rasp)=>{
            return rasp
        }).catch((err)=>{
            if(typeof(err_handle) == "function"){
                err_handle(err)
            }
        })
        return rasp
    }

    static raspToString(rasp){
        let str = ""
        if(rasp){
            for(let key in rasp){
                let raw = rasp[key]
                if(raw.lesson.length > 0){
                    str = str + raw.time.start + "-" + raw.time.end + "\n"
                    for(let i = 0; i < raw.lesson.length; i++){
                        str = str + raw.lesson[i] + "\n"
                    }
                    str = str + "\n"
                }
            }
        }
        return str
    }

}

function formatDate(date){
    var dd = date.getDate();
    if (dd < 10) dd = '0' + dd;
    var mm = date.getMonth() + 1;
    if (mm < 10) mm = '0' + mm;
    var yyyy = date.getFullYear();
    return dd + '.' + mm + '.' + yyyy;
}

async function main(){
    let day     = 13
    let date    = new Date(2021, 8, day++)
    let proms = []
    let start = Date.now()
    for(let i = 0; i < 365; i++){
        let date_str = formatDate(date)
        proms.push(RaspTPUapi.getGroupRaspByDate("8К04", date_str))
        date = new Date(2021 , 8 , day++)
    }
    Promise.all(proms).then(()=>{
        console.log(Date.now()-start)
    })
}
//main()

exports["RaspTPUapi"] = RaspTPUapi

/*RaspTPUapi.getGroupRaspByDate("8К04", "01.10.2021").then(rasp=>{
    console.log(rasp)
})*/
