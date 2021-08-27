const fs    = require("fs")
const NodeRSA   = require("node-rsa")

class Cryptos{
    constructor(privateKey, publicKey){
        this.key = new NodeRSA({b: 2048})
        try{
            this.key.importKey(privateKey, "pkcs1-private-pem")
            this.key.importKey(publicKey, "pkcs1-public-pem")
        }catch(err){
            console.log("Ключи не были загружены!")
        }
    }

    static generatePair(){ // создание пары ключей
        let key = new NodeRSA({b:2048})
        key.generateKeyPair()
        let privateKey = key.exportKey("pkcs1-private-pem")
        let publicKey  = key.exportKey("pkcs1-public-pem")
        return {privateKey, publicKey}
    }

    encrypt(data){ // шифрование данных
        if(this.key.isPublic()){
            return this.key.encrypt(data, "base64")
        }
    }
    
    decrypt(data){ // дешифрование данных
        if(this.key.isPrivate()){
            return this.key.decrypt(data, "utf-8")
        }
    }
}

// выполнение команд
let argv = process.argv
switch(argv[2]){
    case "genkeys": {
            console.log("Создается пара ключей...")
            let private_filename    = argv[3]   || "private.pem"
            let public_filename     = argv[4]   || "public.pem"
            let path                = argv[5]   || ""
            let dir = __dirname + "/"
            let keys = Cryptos.generatePair()
            fs.writeFileSync(dir + path + private_filename, keys.privateKey)
            fs.writeFileSync(dir + path + public_filename, keys.publicKey)
            console.log("Приватный ключ сохранен в файле " + path + private_filename)
            console.log("Публичный ключ сохранен в файле " + path + public_filename)
        break
    }
    case undefined:{
        break
    }
    default: {
        console.log("Команда '"+argv[2]+"' не найдена")
        break
    }
}

exports["Cryptos"] = Cryptos