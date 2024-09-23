const mongoose = require('mongoose')

const usersSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    contactNumber: Number,
    address: String,
    age: Number,
    gender: String,
    profile: String,
    role: {
        type: String,
        default: 'user'
    },
    dateAdded: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('User', usersSchema)