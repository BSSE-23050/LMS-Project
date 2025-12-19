const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const s3Config = require('./models/s3config'); // Your handshake file

const upload = multer({
    storage: multerS3({
        s3: s3Config,
        bucket: 'lms-profile-storage-2025', // Your official bucket name
        contentType: multerS3.AUTO_CONTENT_TYPE,
        
        metadata: function (req, file, cb) {
            cb(null, {
                fieldName: file.fieldname,
                // Captures who is doing the upload for CloudWatch tracking
                uploadedBy: req.session.admin ? 'admin' : 'customer'
            });
        },

        key: function (req, file, cb) {
            // 1. Identify User Role & ID
            let userType = 'customers';
            let userId = 'unknown';

            if (req.session.admin) {
                userType = 'admins';
                userId = req.session.admin;
            } else if (req.session.customer) {
                userType = 'customers';
                userId = req.session.customer;
            }

            // 2. Extract extension (e.g., .jpg, .png)
            const ext = path.extname(file.originalname) || '.jpg';

            // 3. Construct the dynamic path
            // Format: uploads/admins/admin_5_170000000.jpg
            const fileName = `${userType}_${userId}_${Date.now()}${ext}`;
            const fullPath = `uploads/${userType}/${fileName}`;

            console.log(`[S3 UPLOAD] Path: ${fullPath}`); 
            cb(null, fullPath);
        }
    })
});

module.exports = upload;