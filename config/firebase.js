const admin = require('firebase-admin');

let db, auth;

if (!admin.apps.length) {
    let serviceAccount;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // Vercel/serverless: Use environment variable
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (parseError) {
            console.error('Error parsing FIREBASE_SERVICE_ACCOUNT environment variable');
            console.error('Make sure FIREBASE_SERVICE_ACCOUNT is a valid JSON string in Vercel environment variables');
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT: ' + parseError.message);
        }
    } else {
        // Local development: Use file
        try {
            serviceAccount = require('../firebase-service-account.json');
        } catch (requireError) {
            console.error('Firebase service account file not found');
            console.error('For serverless deployment, set FIREBASE_SERVICE_ACCOUNT environment variable in Vercel');
            throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT env var or provide firebase-service-account.json');
        }
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('Firebase initialized successfully');
    } catch (initError) {
        console.error('Firebase initialization failed:', initError.message);
        throw initError;
    }
}

db = admin.firestore();
auth = admin.auth();

module.exports = { admin, db, auth };