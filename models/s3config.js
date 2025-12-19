const { S3Client } = require("@aws-sdk/client-s3");

/**
 * AWS S3 Client Configuration
 * This handshake uses the IAM Role attached to your EC2 instance 
 * so we don't have to hardcode any secret keys. "Zero to Hero" security!
 */
const s3Client = new S3Client({ 
    region: "us-east-1" 
}); 

module.exports = s3Client;