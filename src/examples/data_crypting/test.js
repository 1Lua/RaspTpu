const fs = require("fs")
const {Cryptos} = require("../../cryptos")              // loading a Cryptos class

let privateKey  = fs.readFileSync("private.pem")        // reading a key data from .pem files
let publicKey   = fs.readFileSync("public.pem") 

const cryptos = new Cryptos(privateKey, publicKey)      // creating Cryptos object

let string_data     = "Hello world!"

let encrypted_data  = cryptos.encrypt(string_data)      // encrypting data
console.log("encrypted: " + encrypted_data)             // output: "encrypted:  LxcrqZYgthzOOlW0s4LiD..."

let decrypted_data  = cryptos.decrypt(encrypted_data)   // decrypting data
console.log("decrypted: " + decrypted_data)             // output: "decrypted: Hello world!"

                                                        // Note:  x == cryptos.decrypt(cryptos.encrypt(x))