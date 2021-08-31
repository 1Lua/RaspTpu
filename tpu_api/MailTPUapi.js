const https         = require("https")
const querystring   = require("querystring");
const zlib          = require("zlib")
const cheerio       = require('cheerio');

class MailTPUapi{
    constructor(){

    }

    static getCookie(c_name, cookies){
    var i,x,y,ARRcookies = cookies.split(";");
        for (i=0;i<ARRcookies.length;i++){
            x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
            y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
            x=x.replace(/^\s+|\s+$/g,"");
            if (x==c_name){
                return unescape(y);
            }
        }
    }

    static async getUserSessid(login){
        let sessid = await new Promise(async (resolve, reject)=>{
            let sessid = ""
            https.get("https://mail2.tpu.ru/rcmail/?_user="+login, result=>{
                //resolve(result.headers["set-cookie"])
                if(result.headers["set-cookie"]){
                    sessid = this.getCookie("roundcube_sessid", result.headers["set-cookie"][0])
                }
                if(sessid == ""){
                    reject("Куки roundcube_sessid не была получена.")
                }else{
                    resolve(sessid)
                }
            }).on("error", err=>{
                reject("no connect")
            })
        })
        return sessid
    }

    static async getUserAuthToken(login, sessid){
        let token = await new Promise((resolve, reject)=>{
            let token = ""
            let html = ""
            https.get({
                host: "mail2.tpu.ru",
                path: "/rcmail/?_user=" + login,
                headers: {
                    "Cookie": "roundcube_sessid=" + sessid,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
                }
            },result =>{
                result.on("data", chunk =>{
                    html += chunk
                })

                result.on("end", ()=>{
                    token = html.match(/name="_token" value="([0-9, a-f]+)"/)
                    resolve(token[1])
                })
            }).on("error", err=>{
                reject("no connect")
            })
        })
        return token
    }

    static async userLogin(login, password, sessid, token){
        let new_sessid = ""
        let sessauth = ""

        let result = await new Promise((resolve, reject)=>{
            let params = {
                _token:     token,
                _task:      "login",
                _action:    "login",
                _timezone:  "Asia/Omsk",
                _url:       "_user="+login+"&isUtf8=1",
                _user:      login,
                _pass:      password,
            }
    
            let req = https.request({
                method: "POST",
                host: "mail2.tpu.ru",
                path: "/rcmail/",
                headers: {
                    "Origin": "https://mail2.tpu.ru",
                    "Referer": "https://mail2.tpu.ru/rcmail/?_user="+login, 
                    "Cookie": "roundcube_sessid=" + sessid,
                    "Connection": "keep-alive",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            }, result=>{
                if(result.headers["set-cookie"] && result.headers.location){
                    new_sessid = this.getCookie("roundcube_sessid", result.headers["set-cookie"][1])
                    sessauth = this.getCookie("roundcube_sessauth", result.headers["set-cookie"][2])
                    resolve({new_sessid, sessauth})
                }else{
                    reject("err login")
                }

                result.on("data", chunk=>{
                    //console.log(chunk.toString())
                })          
            }).on("error", err=>{
                reject("no connect")
            })
            let params_str = querystring.stringify(params)
            req.write(params_str)
            req.end()
        })


        return result //{new_sessid, sessauth}
    }

    static async getRequestToken(login, sessid, sessauth){
        let token = ""
        await new Promise((resolve, reject)=>{
            let req = https.get({
                host: "mail2.tpu.ru",
                path: "/rcmail/?_task=mail&_isUtf8=1&_user=" + login,
                headers:{
                    "Cookie": "roundcube_sessid=" + sessid + "; roundcube_sessauth=" + sessauth,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                    "Upgrade-Insecure-Requests": "1",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"
                }
            },result=>{
                result.on("data", chunck=>{
                    //console.log(chunck.toString())
                    let m = chunck.toString().match(/"request_token"\:"([0-9, a-f]+)"/)
                    if(m){
                        token = m[1]
                        resolve()
                    }
                })
            })
            req.on("error", err=>{
                reject("no connect")
            })
            //console.log(req)
        })
        return token 
    }

    static async getUserMail(login, sessid, sessauth, req_token){
        let time = Date.now() 
        let data = await new Promise((resolve, reject)=>{
            let req = https.get({
                host: "mail2.tpu.ru",
                //path: "/rcmail/?_task=mail&_refresh=1&_mbox=INBOX&_action=list&_remote=1&"+"_unlock=loading"+ time+"&_=" + (time+6),
                path: "https://mail2.tpu.ru/rcmail/?_task=mail&_cols=threads,subject,from,date,size,attachment,flag&_sort=_DESC&_mbox=INBOX&_action=list&_remote=1&_unlock=loading"+ time+"&_=" + (time+6),
                headers:{
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                    "Connection": "keep-alive",
                    "Cookie": "roundcube_sessid=" + sessid + "; roundcube_sessauth=" + sessauth + "; mailviewsplitterv=165; mailviewsplitter=205",
                    "Host": "mail2.tpu.ru",
                    "Referer" : "https://mail2.tpu.ru/rcmail/?_task=mail&_isUtf8=1&_user="+ login,
                    "User-Agent" :"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
                    "Upgrade-Insecure-Requests": "1",
                    "X-Roundcube-Request": req_token,
                    "X-Requested-With": "XMLHttpRequest"
                },
                
            },result=>{
                //console.log(result.headers)
                result.on("data", chunck=>{
                    //console.log(chunck.toString())
                    zlib.gunzip(chunck, (err, res)=>{
                        resolve(JSON.parse(res.toString()))
                    })
                })
            }).on("error", err=>{
                reject("no connect")
            })
            //console.log(req.getHeaders())
        })
        return data
    }

    static async markMailAsRead(sessid, sessauth, req_token, id){
        let time = Date.now() 
        return new Promise((resolve,reject)=>{
            let req = https.request({
                host: "mail2.tpu.ru",
                path: "/rcmail/?_task=mail&_action=mark",
                headers: {
                    "Accept": "application/json, text/javascript, */*; q=0.01",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                    "Connection": "keep-alive",
                    "Cookie": "roundcube_sessid=" + sessid + "; roundcube_sessauth=" + sessauth + "; mailviewsplitterv=165; mailviewsplitter=205",
                    "Host": "mail2.tpu.ru",
                    "Referer" : "https://mail2.tpu.ru/rcmail/?_task=mail&_refresh=1&_mbox=INBOX",
                    "User-Agent" :"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
                    "Upgrade-Insecure-Requests": "1",
                    "X-Roundcube-Request": req_token,
                    "X-Requested-With": "XMLHttpRequest"
                }
            }, result=>{

            })
            let params = {
                _uid    : id,
                _flag	:"read",
                _mbox	:"INBOX",
                _remote	:"1",
                _unlock	:"loading" + time
            }
            req.write(querystring.stringify(params))
        })
    }

    static async getUserLetter(login, sessid, sessauth, letter_id){
        let text = await new Promise((resolve, reject)=>{
            let data = ""
            https.get({
                host: "mail2.tpu.ru",
                path: "/rcmail/?_task=mail&_action=preview&_uid="+letter_id+"&_mbox=INBOX&_framed=1&_caps=pdf=0,flash=0,tif=0",
                headers:{
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "iframe",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "Cookie": "roundcube_sessid=" + sessid + "; roundcube_sessauth=" + sessauth + "; mailviewsplitterv=165; mailviewsplitter=205",
                    "Referer" : "https://mail2.tpu.ru/rcmail/?_task=mail&_isUtf8=1&_user="+ login,
                }
            },result=>{
                result.on("data", chunck=>{
                    data += chunck.toString()
                })

                result.on("end", ()=>{
                    resolve(data)
                })
            }).on("error", err=>{
                reject("no connect")
            })
        })
        return text
    }
    
    static async authorize(login, password){
        let sessid      = ""
        let authtoken   = ""
        let sessauth    = ""
        let req_token   = ""
        return new Promise(async(resolve, reject)=>{
            await this.getUserSessid(login)
        .then(sid=>{
            sessid     = sid
            return this.getUserAuthToken(login, sessid)
        })
        .then(autoken=>{
            authtoken  = autoken
            return this.userLogin(login, password, sessid, authtoken)
        })
        .then(({new_sessid, sessau})=>{
            sessid     = new_sessid
            sessauth   = sessauth
            return this.getRequestToken(login, sessid, sessauth)
        })
        .then(req_tok=>{
            if(req_tok){
                req_token = req_tok
                resolve(true)
            }else{
                reject("err login")
            }
        })
        .catch(err=>{reject(err)})
        })
    }

}

exports["MailTPUapi"] = MailTPUapi