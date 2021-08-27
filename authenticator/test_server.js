const fs        = require("fs")
const https     = require("https")
const config    = require("./config.json")

const options   = {
    key : fs.readFileSync(config.https_key_file),
    cert: fs.readFileSync(config.https_cert_file)
}

https.createServer(options, (req, res)=>{
    res.writeHead(200)
    res.end("Hello world!")
    console.log("qq")
}).listen(config.https_port)