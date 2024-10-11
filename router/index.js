const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const cloudinary = require('./cloudinaryConfig')
const axios = require('axios')
// import models
const Users = require('../models/users')
const News = require('../models/news')
const Applications = require('../models/application')
const Renewal = require('../models/renewal')
const Notification = require('../models/notifications')

const profilePicDir = path.join(__dirname, '../uploads/profilePic')

const saltRounds = 10

const cloudinaryCertStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'certificates', 
      allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const uploadCert = multer({ storage: cloudinaryCertStorage }) 
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/formCerts/')
//     },
//     filename: (req, file, cb) => {
//         const id = req.id.id
//         const fieldName = file.fieldname;
//         let newFileName = '';

//         switch (fieldName) {
//             case 'photo1x1':
//                 newFileName = `${id}1x1photo${path.extname(file.originalname)}`;
//                 break;
//             case 'medicalCert':
//                 newFileName = `${id}medicalCert${path.extname(file.originalname)}`;
//                 break;
//             case 'barangayCert':
//                 newFileName = `${id}barangayCert${path.extname(file.originalname)}`;
//                 break;
//             default:
//                 newFileName = `${Date.now()}${path.extname(file.originalname)}`;
//                 break;
//         }

//         cb(null, newFileName);
//     }
// })

// const upload = multer({ storage: storage });

const cloudinaryRenewalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'certificates', 
      allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const uploadRenewal = multer({ storage: cloudinaryRenewalStorage });

const cloudinaryProfilePicStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'profilePic', 
      allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const uploadNewPofile = multer({ storage: cloudinaryProfilePicStorage });

const cloudinaryFormStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'Form', 
      allowed_formats: ['docx'],
    },
});

const uploadGeneratedForm = multer({ storage: cloudinaryFormStorage });


router.get('/users', async (req, res) => {
    try {
        const users = await Users.find()
        res.send(users)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})


const authenticateToken = (req, res, next) => {
    const authHeaders = req.headers.authorization
    const token = authHeaders && authHeaders.split(' ')[1]

    if(token == null) return res.sendStatus(401)
    
    jwt.verify(token, process.env.SECRET_KEY, (err, id) => {
        if(err) return res.sendStatus(403)
        req.id = id
        next()
    })
}

router.post('/send-otp', async (req, res) => {
    const { email, name } = req.body

    let otp = ''

    while(otp.length < 4){
        const x = Math.floor(Math.random() * 10)

        otp += x
    }
    

    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'wncbtrn@gmail.com',
            pass: process.env.GMAIL_PASS
        }
    })

    let mailOptions = {
        from: 'wncbtrn@gmail.com', 
        to: email,
        subject: 'OTP VERIFICATION',
        text: `Dear ${name},

To complete your verification process, please use the following One-Time Password (OTP):

${otp}

This OTP is valid for the next 5 minutes. Please do not share this code with anyone for security reasons.

If you did not request this OTP, please contact our support team immediately.

Thank you,
Inclucity`
    }

    try {
        const existingEmail = await Users.findOne({
            email: email
        })

        if(existingEmail) return res.send('existing email')

        res.status(201).send(otp);

        await transporter.sendMail(mailOptions);
    } catch (error) {
        res.send(error)
    }
})


router.post('/register', async (req, res) => {
    const { password, ...userData } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const newUser = await Users.create({ ...userData, password: hashedPassword });

        res.status(201).send(newUser.name);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error registering user');
    }
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body 

    try {
        const user = await Users.findOne({ email: email, isDeleted: false })

        if(!user) return res.send('invalid credentials')

        const isMatch = await bcrypt.compare(password, user.password)

        if(isMatch){
            res.send({
                role: user.role,
                token: jwt.sign({ id: user._id}, process.env.SECRET_KEY)
            })
        }else{
            res.send('invalid password')
        }

    } catch (error) {
        console.log(error)
    }
})

router.get('/get-user', authenticateToken, async (req, res) => {
    const id = req.id.id

    try {
        const user = await Users.findOne({
            _id: id
        })

        if(!user) return res.send('user not found')

            const application = await Applications.findOne({ user: user._id }).select('typeOfDisability -_id');

            const typeOfDisability = Array.isArray(application?.typeOfDisability) 
                ? application.typeOfDisability 
                : []; 

            const newUser = {
                ...user.toObject(),
                typeOfDisability
            }

        res.send(newUser).status(200)
    } catch (error) {
        console.log(error)
        res.send(error)
    }
})

router.put('/update-user', authenticateToken, async (req, res) => {
    const id = req.id.id;

    const { password, ...info } = req.body;

    try {
        if (!password) {
            const newInfo = await Users.updateOne(
                { _id: id },
                { $set: { ...info } }
            );
            res.send('updated');
            return;
        }
        
        const newData = {
            ...info,
            password: await bcrypt.hash(password, saltRounds)
        };
        
        await Users.updateOne(
            { _id: id },
            { $set: { ...newData } } 
        );
        
        
        res.send('updated');
    } catch (error) {
        console.log(error);
        res.send(error);
    }
});

router.delete('/delete-user', authenticateToken, async (req, res) => {
    const id = req.id.id;


    try {
        await Users.deleteOne({
            _id: id
        })
        
        res.send('deleted');
    } catch (error) {
        console.log(error);
        res.send('error');
    }
});

router.patch('/update-profilepic', authenticateToken, uploadNewPofile.single('profile'), async (req, res) => {
    const id = req.id.id;
    const file = req.file

    try {
        if (file) {
            const user = await Users.findById(id);

            if (!user) {
                return res.status(404).send('User not found');
            }

            const profileUpload = await cloudinary.uploader.upload(file.path, {
                public_id: `${id}_profile`,
                resource_type: 'auto'
            });

            const updateResult  = await Users.updateOne(
                { _id: id }, 
                { $set: { profile: profileUpload.secure_url } }
            )

            res.send(updateResult);
            return
        }
        res.send('no profile pic')
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).send('An error occurred while updating the profile picture');
    }
});

router.get('/get-user-notifications', authenticateToken, async (req, res) => {
    const id = req.id.id

    try {
        const notifications = await Notification.find({
            to: id
        }).sort({ data: -1 })

        if(notifications.length === 0) return res.send('no notifications')

        res.send(notifications)
    } catch (error) {
        res.send(error)
    }
})
router.get('/get-user-notification-details/:id', authenticateToken, async (req, res) => {
    const id = req.params.id

    try {
        const notifications = await Notification.findById(id)

        if(!notifications) return res.send('no notifications')

        res.send(notifications)
    } catch (error) {
        res.send(error)
    }
})

router.patch('/seen-notifications', authenticateToken, async (req, res) => {
    const id = req.id.id;

    try {
        const notifications = await Notification.updateMany(
            { to: id }, 
            { $set: { isSeen: true } }
        );

        if (notifications.modifiedCount === 0) return res.send('No notifications to update');

        res.status(200).send('Notifications marked as seen');
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

router.post('/add-news', async (req, res) => {
    const newsData = req.body
    try {
        const newNews = await News.create(newsData)
        res.status(201).send(newNews)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})


router.get('/get-news', async (req, res) => {
    try {
        const news = await News.find({ isDeleted: false }).sort({ datePosted: -1 })

        if(!news) return res.status(204).send('No news available');

        const newsWithImage = news.map(item => ({
            ...item._doc,
            image: `${item.imageName}`
        }));

        res.status(200).send(newsWithImage);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get('/get-deleted-news', async (req, res) => {
    try {
        const news = await News.find({ isDeleted: true }).sort({ datePosted: -1 })

        if(!news) return res.status(204).send('No news available');

        const newsWithImage = news.map(item => ({
            ...item._doc,
            image: `${item.imageName}`
        }));

        res.status(200).send(newsWithImage);
    } catch (error) {
        res.status(500).send(error);
    }
});

router.get('/get-news-details/:id', async (req, res) => {
    const id = req.params.id
    try {
        const news = await News.findOne({
            _id: id
        });
        
        if(!news) return res.status(204).send('No news available');

        res.status(200).send(news);
    } catch (error) {
        res.status(200).send('something wrong with the server');
        console.log(error)
    }
});

router.post('/send-application', authenticateToken, uploadCert.fields([
    { name: 'photo1x1', maxCount: 1 },
    { name: 'medicalCert', maxCount: 1 },
    { name: 'barangayCert', maxCount: 1 }
]), async (req, res) => {
    const id = req.id.id

    const files = req.files
    const { photo1x1, barangayCert, medicalCert, ...formData } = req.body; 

    const applicationData = { ...formData, user: id };

    if (files.photo1x1 && files.photo1x1[0]) {
        const photo1x1Upload = await cloudinary.uploader.upload(files.photo1x1[0].path, {
            public_id: `${id}_photo1x1`,
            resource_type: 'auto'
        });
        applicationData.photo1x1 = photo1x1Upload.secure_url;
    }
    if (files.medicalCert && files.medicalCert[0]) {
        const medicalCertUpload = await cloudinary.uploader.upload(files.medicalCert[0].path, {
            public_id: `${id}_medicalCert`,
            resource_type: 'auto'
        });
        applicationData.medicalCert = medicalCertUpload.secure_url;
    }
    if (files.barangayCert && files.barangayCert[0]) {
        const barangayCertUpload = await cloudinary.uploader.upload(files.barangayCert[0].path, {
            public_id: `${id}_barangayCert`,
            resource_type: 'auto'
        });
        applicationData.barangayCert = barangayCertUpload.secure_url;
    }

    try {

        const existingForm = await Applications.findOne({
            user: id
        })

        if(existingForm) return res.send('already submitted')
        const newApplicant = await Applications.create(applicationData)
        
        res.send({
            applicantNumber: newApplicant.applicationNumber,
            status: 'created' 
        }).status(201)
    } catch (error) {
        console.error(error)
    }
})

router.post('/send-renewal', authenticateToken, uploadRenewal.fields([
    { name: 'photo1x1', maxCount: 1 },
    { name: 'medicalCert', maxCount: 1 },
    { name: 'barangayCert', maxCount: 1 },
    { name: 'pwdID', maxCount: 1 }
]), async (req, res) => {
    const id = req.id.id

    const files = req.files
    const { photo1x1, barangayCert, medicalCert, ...formData } = req.body; 

    const applicationData = { ...formData, user: id };

    if (files.photo1x1 && files.photo1x1[0]) {
        const photo1x1Upload = await cloudinary.uploader.upload(files.photo1x1[0].path, {
            public_id: `${id}_photo1x1`,
            resource_type: 'auto'
        });
        applicationData.photo1x1 = photo1x1Upload.secure_url;
    }
    if (files.medicalCert && files.medicalCert[0]) {
        const medicalCertUpload = await cloudinary.uploader.upload(files.medicalCert[0].path, {
            public_id: `${id}_medicalCert`,
            resource_type: 'auto'
        });
        applicationData.medicalCert = medicalCertUpload.secure_url;
    }
    if (files.barangayCert && files.barangayCert[0]) {
        const barangayCertUpload = await cloudinary.uploader.upload(files.barangayCert[0].path, {
            public_id: `${id}_barangayCert`,
            resource_type: 'auto'
        });
        applicationData.barangayCert = barangayCertUpload.secure_url;
    }
    if (files.pwdID && files.pwdID[0]) {
        const barangayCertUpload = await cloudinary.uploader.upload(files.barangayCert[0].path, {
            public_id: `${id}_barangayCert`,
            resource_type: 'auto'
        });
        applicationData.barangayCert = barangayCertUpload.secure_url;
    }
    if (files.pwdID && files.pwdID[0]) {
        const pwdIDCertUpload = await cloudinary.uploader.upload(files.pwdIDCert[0].path, {
            public_id: `${id}_barangayCert`,
            resource_type: 'auto'
        });
        applicationData.pwdID = pwdIDCertUpload.secure_url;
    }

    try {

        const existingRenewal = await Renewal.findOne({
            user: id
        })

        if(existingRenewal) return res.send('already submitted')
        const newRenewal = await Renewal.create(applicationData)
        
        res.send({
            applicantNumber: newRenewal.renewalNumber,
            status: 'created' 
        }).status(201)
    } catch (error) {
        console.log(error)
    }
})


router.get('/get-user-application', authenticateToken, async (req, res) => {
    try {
        const application = await Applications.findOne({
            user: req.id.id
        }).populate('user')

        if(!application) return res.send('no data')

        res.send(application)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

router.post('/check-control-number', authenticateToken, async (req, res) => {
    const id = req.id.id
    const controlNumber = req.body.controlNumber
    try {
        const isPWD = await Applications.findOne({
            user: id,
            controlNumber: controlNumber
        })  

        if(!isPWD) return res.send('invalid control number')


        res.sendStatus(202)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

// admin
router.get('/get-all-users', authenticateToken, async (req, res) => {
    const id = req.id.id

    try {
        const user = await Users.find({ isDeleted: false, role: 'user' })

        if(user.length <= 0) return res.send('no users found')

        res.send(user).status(200)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }
})

router.get('/get-all-deleted-users', authenticateToken, async (req, res) => {
    const id = req.id.id

    try {
        const user = await Users.find({ isDeleted: true, role: 'user' })

        if(user.length <= 0) return res.send('no users found')

        res.send(user).status(200)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }
})

router.patch('/delete-user/:id', authenticateToken, async (req, res) => {
    const id = req.params.id

    try {
        const updatedUser = await Users.updateOne({
            _id: id
        }, {
            isDeleted: true
        })

        if(!updatedUser) return res.send('failed to delete user')

        res.send(updatedUser).status(200)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }
})

router.patch('/restore-user/:id', authenticateToken, async (req, res) => {
    const id = req.params.id

    try {
        const updatedUser = await Users.updateOne({
            _id: id
        }, {
            isDeleted: false
        })

        if(!updatedUser) return res.send('failed to restore user')

        res.send(updatedUser).status(200)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }
})

router.patch('/update-user/:id', authenticateToken, async (req, res) => {
    const id = req.params.id

    try {
        const updatedUser = await Users.updateOne({
            _id: id
        }, {
            ...req.body
        })

        if(!updatedUser) return res.send('failed to update user')

        res.send(updatedUser).status(200)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }
})

router.get('/generate-doc/:id', async (req, res) => {
    const application = await Applications.findOne({
        user: req.params.id
    }).populate('user')

    if(application){
        const content = fs.readFileSync(path.resolve(__dirname, '../uploads/form/PRPWD-APPLICATION_FORM.docx'), 'binary');
        
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip);

        const sexcbSymbol = () => {
            if(application.gender === 'Female'){
                return '⬛'
            }else{
                return '⬜'
            }
        }

        const sexcb2Symbol = () => {
            if(application.gender === 'Male'){
                return '⬛'
            }else{
                return '⬜'
            }
        }

        const data = {
            newApplicant: '⬛',
            dateApplied: application.dateApplied,
            first: application.firstName,
            last: application.lastName,
            middle: application.middleName,
            suffix: application.suffix,
            dateOfBirth: application.dateOfBirth,
            landlineNo: application.landlineNo,
            mobileNo: application.mobileNo,
            email: application.emailAddress,
            email: application.emailAddress,
            sexcb:  sexcbSymbol(),
            sexcb2: sexcb2Symbol(),
            houseNo: application.houseNoAndStreet,
            barangay: application.barangay,
            municipality: application.municipalityCity,
            province: application.province,
            region: application.region,
            fathersLname: application.fathersLname,
            fathersFname: application.fathersFname,
            fathersMname: application.fathersMname,
            organizationAffiliated: application.organizationAffiliated,
            contactPerson: application.contactInformation,
            officeAddress: application.officeAddress,
            telNo: application.telNo,

        };
    
        doc.setData(data);
    
        try {
            doc.render();
        } catch (error) {
            return res.status(500).send('Error rendering the DOCX file');
        }
    
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        const outputPath = path.resolve(__dirname, 'output.docx');
        fs.writeFileSync(outputPath, buffer);
    
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);
        
        return
    }

    res.send('invalid id')
})


router.get('/get-all-pending-applications', authenticateToken, async (req, res) => {

    try {
        const application = await Applications.find({
            status: 'pending'
        }).populate('user')

        if(application.length <= 0) return res.send('no data')

        res.send(application)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

router.get('/get-all-rejected-applications', authenticateToken, async (req, res) => {

    try {
        const application = await Applications.find({
            status: 'rejected'
        }).populate('user')

        if(application.length <= 0) return res.send('no data')

        res.send(application)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

router.get('/get-all-approved-applications', authenticateToken, async (req, res) => {

    try {
        const application = await Applications.find({
            status: 'approved'
        }).populate('user')

        if(application.length <= 0) return res.send('no data')

        res.send(application)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

router.get('/get-all-released-id', authenticateToken, async (req, res) => {

    try {
        const application = await Applications.find({
            status: 'approved',
            isIdReleased: true
        }).populate('user')

        if(application.length <= 0) return res.send('no data')

        res.send(application)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

router.get('/get-all-expired-applications', authenticateToken, async (req, res) => {

    try {
        const application = await Applications.find({
            status: 'expired'
        }).populate('user')

        if(application.length <= 0) return res.send('no data')

        res.send(application)
    } catch (error) {
        console.error(error)
        res.send(error)
    }
})

router.post('/update-application', authenticateToken, async (req, res) => {
    try {
        if(req.body.status === 'rejected'){
            await Applications.updateOne(
                { _id: req.body.applicationId},
                { $set: {
                    status: req.body.status,
                    reasonForRejection: req.body.reason
                } }
            )

            await Notification.create({
                notificationTitle: 'Application Rejected',
                notificationDescription: `Unfortunately, your application has been rejected due to ${req.body.reason}. Please review the issue and make the necessary corrections. If you need further assistance, feel free to contact our support team.`,
                to: req.body.userId
            })

            res.send('application rejected succesfully')
        }else{
            await Applications.updateOne(
                { _id: req.body.applicationId},
                { $set: {
                    status: req.body.status,
                    reasonForRejection: req.body.reason,
                    approvedAt: Date.now()
                } }
            )

            await Notification.create({
                notificationTitle: 'Application Approved',
                notificationDescription: `Congratulations! Your application has been approved. Please proceed with the next steps to finalize the process. If you have any questions or need further assistance, feel free to contact our support team.`,
                to: req.body.userId
            })

            res.send('application approved succesfully')
        }
        
    } catch (error) {
        
    }
}) 


const cloudinaryNewsStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'news', 
      allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const uploadNewsAttachment = multer({ storage: cloudinaryNewsStorage });

router.post('/add-announcement', authenticateToken, uploadNewsAttachment.single('news'), async (req, res) => {
    const file = req.file

    try {
        if(file){
            const newsUpload = await cloudinary.uploader.upload(file.path, {
                public_id: file.originalname,
                resource_type: 'auto'
            });

            if(req.body.postUrl){
                const news  = await News.create({
                    postTitle: req.body.postTitle,
                    postDescription: req.body.postDescription,
                    postUrl: JSON.parse(req.body.postUrl),
                    imageName: newsUpload.secure_url
                })
            }else{
                const news  = await News.create({
                    postTitle: req.body.postTitle,
                    postDescription: req.body.postDescription,
                    imageName: newsUpload.secure_url
                })
            }
    
            res.send('news added');
            return
        }
        res.send('no file sent')
    } catch (error) {
        console.error('Error adding news:', error);
        res.status(500).send('An error occurred while adding news');
    }
} )

router.patch('/update-announcement/:id', authenticateToken, async (req, res) => {
    const postId = req.params.id
    const { _id, postUrl, ...info } = req.body

    try {
        const updated = await News.updateOne({
            _id: postId
        }, {
            ...info,
            postUrl: JSON.parse(postUrl)
        })

        if(!updated) return res.send('failed to update posts')

        res.send(updated)
    } catch (error) {
        console.error('Error updating news:', error);
        res.status(500).send('An error occurred while updating news');
    }
} )

router.patch('/delete-post/:id', async (req, res) => {
    try {
        const deleted = await News.updateOne({
            _id: req.params.id
        }, {
            isDeleted: true
        })

        if(deleted){
            res.send('deleted')
            return
        }
        res.send('failed to delete post')
    } catch (error) {
        res.send(`Error: ${error}`)
        console.log(error)
    }
})

router.patch('/restore-post/:id', async (req, res) => {
    try {
        const deleted = await News.updateOne({
            _id: req.params.id
        }, {
            isDeleted: false
        })

        if(deleted){
            res.send('deleted')
            return
        }
        res.send('failed to delete post')
    } catch (error) {
        res.send(`Error: ${error}`)
        console.log(error)
    }
})

router.get('/get-group-barangay', async (req, res) => {
    try {
        const data = await Applications.aggregate([
            {
              $group: {
                _id: "$barangay", 
                count: { $sum: 1 }
              }
            },
            {
              $sort: { count: -1 } 
            }
        ])

        res.send(data)
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/get-group-barangay-gender', async (req, res) => {
    try {
        const data = await Applications.aggregate([
            {
              $group: {
                _id: "$barangay", 
                count: { $sum: 1 },
                maleCount: { 
                  $sum: { 
                    $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] 
                  } 
                },
                femaleCount: { 
                  $sum: { 
                    $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] 
                  } 
                }
              }
            },
            {
              $sort: {  _id: 1 }
            }
          ]);
          
        if(data.length <= 0 ) return res.send('no data')
        res.send(data)
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/get-total-pwd', authenticateToken, async (req, res) => {
    try {
        const result = await Applications.aggregate([
            {
                $match: { status: "approved" }
            },
            {
                $group: {
                    _id: {
                        year: { $dateToString: { format: "%Y", date: "$approvedAt" } } 
                    },
                    male: {
                        $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] }
                    },
                    female: {
                        $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] }
                    }
                },
            },
            {
                $addFields: { year: "$_id.year" }
            },
            {
                $project: { _id: 0 }
            },
            {
                $sort: { year: 1 }
            }
        ]);

        if (!result) return res.status(404).send('Failed to get data');

        res.send(result);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/get-total-employment', authenticateToken, async (req, res) => {
    try {
        const result = await Applications.aggregate([
            {
                $match: { status: "approved" }
            },
            {
                $group: {
                    _id: {
                        year: { $dateToString: { format: "%Y", date: "$approvedAt" } } 
                    },
                    employed: {
                        $sum: { $cond: [{ $eq: ["$statusOfEmployment", "employed"] }, 1, 0] }
                    },
                    unemployed: {
                        $sum: { $cond: [{ $eq: ["$statusOfEmployment", "unemployed"] }, 1, 0] }
                    },
                    selfemployed: {
                        $sum: { $cond: [{ $eq: ["$statusOfEmployment", "self-employed"] }, 1, 0] }
                    }
                },
            },
            {
                $addFields: { year: "$_id.year" }
            },
            {
                $project: { _id: 0 }
            },
            {
                $sort: { year: 1 }
            }
        ]);

        if (!result) return res.status(404).send('Failed to get data');

        res.send(result);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/get-total-employment-chart', authenticateToken, async (req, res) => {
    try {
        const result = await Applications.aggregate([
            {
                $match: { status: "approved" }
            },
            {
                $group: {
                    _id: {
                        month: { $dateToString: { format: "%m", date: "$approvedAt" } } 
                    },
                    employed: {
                        $sum: { $cond: [{ $eq: ["$statusOfEmployment", "employed"] }, 1, 0] }
                    },
                    unemployed: {
                        $sum: { $cond: [{ $eq: ["$statusOfEmployment", "unemployed"] }, 1, 0] }
                    },
                    selfemployed: {
                        $sum: { $cond: [{ $eq: ["$statusOfEmployment", "self-employed"] }, 1, 0] }
                    }
                },
            },
            {
                $addFields: { month: "$_id.month" }
            },
            {
                $project: { _id: 0 }
            },
            {
                $sort: { month: 1 }
            }
        ]);

        if (!result) return res.status(404).send('Failed to get data');

        res.send(result);
    } catch (error) {
        res.status(500).send(error.message);
    }
});




router.get('/get-group-employment', async (req, res) => {
    try {
        const data = await Applications.aggregate([
            {
              $group: {
                _id: "$statusOfEmployment", 
                count: { $sum: 1 }
              }
            },
            {
              $sort: { _id: 1 } 
            }
        ])

        res.send(data)
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/get-total-pwds', async (req, res) => {
    try {
        const data = await Applications.aggregate([
            {
              $group: {
                _id: "$gender", 
                count: { $sum: 1 }
              }
            }
        ])

        res.send(data)
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/get-total-users', async (req, res) => {
    try {
        const data = await Users.aggregate([
            {
              $group: {
                _id: "$gender", 
                count: { $sum: 1 }
              }
            }
        ])

        res.send(data)
    } catch (error) {
        res.send(error.message)
    }
})

router.get('/get-approved-applicants', async (req, res) => {
    try {
        const data = await Applications.countDocuments({
            status: 'approved'
        });

        res.send({ count: data })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message)
    }
});

router.get('/get-rejected-applicants', async (req, res) => {
    try {
        const data = await Applications.countDocuments({
            status: 'rejected'
        });

        res.send({ count: data })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message)
    }
});

router.get('/get-expired-applicants', async (req, res) => {
    try {
        const data = await Applications.countDocuments({
            status: 'expired'
        });

        res.send({ count: data })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error.message)
    }
});

router.post('/verify-password', authenticateToken, async (req, res) => {
    const password = req.body.password

    try {
        const user = await Users.findOne({ _id: req.id.id })

        if(!user) return res.send('no user found')

        const isMatch = await bcrypt.compare(password, user.password)

        if(isMatch){
            res.send('password match')
        }else{
            res.send('invalid password')
        }

    } catch (error) {
        console.log(error)
    }
})

router.patch('/release-id/:id', authenticateToken, async (req, res) => {
    try {
        const updated = await Applications.updateOne({
            _id: req.params.id
        },{
            isIdReleased: true
        })

        res.send(updated)
    } catch (error) {
        res.send(error)
    }
})

// router.post('/add-user-notifications', authenticateToken, async (req, res) => {
//     const id = req.id.id
//     const details = req.body

//     try {
        // const notifications = await Notification.create({
        //     notificationTitle: req.body.notificationTitle,
        //     notificationDescription: req.body.notificationDescription,
        //     to: id
        // })

//         res.send(notifications)
//     } catch (error) {
//         res.send(error)
//     }
// })

module.exports = router
