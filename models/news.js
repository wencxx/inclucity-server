const mongoose = require('mongoose')

const newsSchema = new mongoose.Schema({
    postTitle: String,
    postDescription: String,
    postUrl: [String],
    imageName: String,
    isDeleted: {
        type: Boolean,
        default: false
    },
    datePosted: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('New', newsSchema)