const admin = require('firebase-admin');

let db, auth;

try {
    if (!admin.apps.length) {
        let serviceAccount;

        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            } catch (parseError) {
                const errorMsg = `Error parsing FIREBASE_SERVICE_ACCOUNT: ${parseError.message}. Make sure it's a valid JSON string in Vercel environment variables.`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        } else {
            try {
                serviceAccount = require('../firebase-service-account.json');
            } catch (requireError) {
                const errorMsg = 'Firebase service account not found. For serverless deployment, set FIREBASE_SERVICE_ACCOUNT environment variable in Vercel.';
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    db = admin.firestore();
    auth = admin.auth();
} catch (error) {
    console.error('CRITICAL: Firebase initialization failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
}

module.exports = { admin, db, auth };