const { db } = require('../config/firebase');
const crypto = require('node:crypto');

class OTP {
    static generateCode() {
        // Generate 6-digit numeric code
        return crypto.randomInt(100000, 999999).toString();
    }

    static async create(userId, email) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        const otpData = {
            userId,
            email,
            code,
            createdAt: new Date(),
            expiresAt,
            verified: false,
            attempts: 0
        };

        const otpRef = await db.collection('otp_codes').add(otpData);
        
        return {
            id: otpRef.id,
            code,
            expiresAt
        };
    }

    static async verify(userId, code) {
        const snapshot = await db.collection('otp_codes')
            .where('userId', '==', userId)
            .where('verified', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, error: 'No verification code found' };
        }

        const otpDoc = snapshot.docs[0];
        const otpData = otpDoc.data();
        const otpRef = otpDoc.ref;

        // Check if expired
        const now = new Date();
        const expiresAt = otpData.expiresAt.toDate();
        if (now > expiresAt) {
            await otpRef.update({ verified: true }); // Mark as used
            return { success: false, error: 'Code expired. Please request a new one.' };
        }

        // Check attempts
        if (otpData.attempts >= 3) {
            await otpRef.update({ verified: true }); // Mark as used
            return { success: false, error: 'Too many attempts. Please request a new code.' };
        }

        // Check if code matches
        if (otpData.code !== code) {
            await otpRef.update({ attempts: otpData.attempts + 1 });
            return { success: false, error: 'Invalid code' };
        }

        // Mark as verified
        await otpRef.update({ 
            verified: true,
            verifiedAt: new Date()
        });

        return { success: true };
    }

    static async cleanup(userId) {
        // Clean up old OTP codes for this user
        const snapshot = await db.collection('otp_codes')
            .where('userId', '==', userId)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }

    static async cleanupExpired() {
        // Clean up all expired OTP codes (run periodically)
        const now = new Date();
        const snapshot = await db.collection('otp_codes')
            .where('expiresAt', '<', now)
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return snapshot.size;
    }
}

module.exports = OTP;
