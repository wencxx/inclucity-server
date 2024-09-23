const mongoose = require('mongoose')


const notificationSchema = new mongoose.Schema({
    notificationTitle: String,
    notificationDescription: String,
    isSeen: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now
    },
    to: {
        type: mongoose.Schema.ObjectId,
        ref: 'user',
        required: true
    }
})

module.exports = mongoose.model('Notification', notificationSchema)