const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const fs = require('fs');
const path = require('path')
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinaryConfig');
// import models
const Users = require('../models/users')
const News = require('../models/news')
const Applications = require('../models/application')
const Renewal = require('../models/renewal')
const Notification = require('../models/notifications')

const profilePicDir = path.join(__dirname, '../uploads/profilePic');

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
        const user = await Users.findOne({ email: email })

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
        })

        if(notifications.length === 0) return res.send('no notifications')

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


// router.post('/add-user-notifications', authenticateToken, async (req, res) => {
//     const id = req.id.id
//     const details = req.body

//     try {
//         const notifications = await Notification.create({
//             notificationTitle: req.body.notificationTitle,
//             notificationDescription: req.body.notificationDescription,
//             to: id
//         })

//         res.send(notifications)
//     } catch (error) {
//         res.send(error)
//     }
// })


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
        const news = await News.find();

        if(news.length == 0) return res.status(204).send('No news available');

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
        const user = await Users.find()

        if(user.length <= 0) return res.send('no users found')

        res.send(user).status(200)
    } catch (error) {
        console.log(error)
        res.send(error.message)
    }
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

module.exports = router
