const express = require('express')
const app = express()
const port = 3000

app.use(express.static('public/vk_auth'));

app.get('/', (req, res)=>{
})

app.get('/vkauth', (req, res) => {
  res.sendFile(__dirname + "/public/vk_auth/index.html")
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

