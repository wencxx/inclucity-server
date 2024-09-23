const mongoose = require('mongoose')
const autoIncrement = require('mongoose-sequence')(mongoose)

const formSchema = new mongoose.Schema({
    firstName: String,
    middleName: String,
    lastName: String,
    suffix: String,
    dateOfBirth: String,
    gender: String,
    civilStatus: String,
    typeOfDisability: [String],
    causeOfDisability: String,
    otherCauseOfDisability: String,
    houseNoAndStreet: String,
    barangay: String,
    municipalityCity: String,
    province: String,
    region: String,
    landlineNo: String,
    mobileNo: String,
    emailAddress: String,
    educationalAttainment: String,
    statusOfEmployment: String,
    categoryOfEmployment: String,
    typeOfEmployment: String,
    occupation: String,
    otherOccupation: String,
    organizationAffiliated: String,
    contactInformation: String,
    officeAddress: String,
    telNo: String,
    sssNo: String,
    gsisNo: String,
    pagibigNo: String,
    psnNo: String,
    philhealthNo: String,
    fathersLname: String,
    fathersFname: String,
    fathersMname: String,
    mothersLname: String,
    mothersFname: String,
    mothersMname: String,
    guardiansLname: String,
    guardiansFname: String,
    guardiansMname: String,
    accomplishedBy: String,
    accomplishedByLname: String,
    accomplishedByFname: String,
    accomplishedByMname: String,
    physicianByLname: String,
    physicianByFname: String,
    physicianByMname: String,
    photo1x1: String,
    medicalCert: String,
    barangayCert: String,
    status: {
        type: String,
        default: 'pending'
    },
    applicationNumber: Number,
    controlNumber: String,
    dateApplied: {
        type: Date,
        default: Date.now
    },
    dateIssued: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    acceptedInformationDetails: {
        type: Boolean,
        default: true
    },
    accepted1x1photo: {
        type: Boolean,
        default: true
    },
    acceptedMedicalCert: {
        type: Boolean,
        default: true
    },
    acceptedBarangayCert: {
        type: Boolean,
        default: true
    }

})

formSchema.plugin(autoIncrement, { inc_field: 'applicationNumber' })

module.exports = mongoose.model('Application', formSchema)