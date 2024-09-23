require('dotenv').config()
const port = process.env.PORT

const express = require('express')
const mongoose = require('mongoose')
const router = require('./router/index')
const cors = require('cors')

const app = express()

// database connection
mongoose.connect(process.env.MONGODB_URL)
const db = mongoose.connection
db.on('error', () => { console.error(error) })
db.once('open', () => { console.log('Connected to database') })

app.use('/uploads', express.static('uploads'))
app.use(cors())
app.use(express.json())
app.use(router)

app.listen(port, () => {
    console.log(`running at port ${port}`)
})