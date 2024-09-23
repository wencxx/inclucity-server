const mongoose = require('mongoose')
const autoIncrement = require('mongoose-sequence')(mongoose)

const renewalSchema = new mongoose.Schema({
    firstName: String,
    middleName: String,
    lastName: String,
    dateOfBirth: String,
    gender: String,
    civilStatus: String,
    typeOfDisability: String,
    landlineNo: String,
    mobileNo: String,
    emailAddress: String,
    photo1x1: String,
    medicalCert: String,
    barangayCert: String,
    pwdID: String,
    renewalNumber: Number,
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    }
})

renewalSchema.plugin(autoIncrement, { inc_field: 'renewalNumber' })

module.exports = mongoose.model('Renewal', renewalSchema)