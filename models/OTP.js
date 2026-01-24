const { db } = require('../config/firebase');
const crypto = require('node:crypto');

class OTP {
    static generateCode() {
        return crypto.randomInt(100000, 999999).toString();
    }

    static async create(userId, email) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

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

        const invalidatedError = { success: false, error: 'This code is no longer valid. Please request a new one.' };

        const safeUpdate = async (data) => {
            try {
                await otpRef.update(data);
            } catch (e) {
                const isNotFound = e.code === 5
                    || (e.details && String(e.details).includes('No document to update'))
                    || (e.message && String(e.message).includes('No document to update'));
                if (isNotFound) throw new Error('OTP_INVALIDATED');
                throw e;
            }
        };

        const now = new Date();
        const expiresAt = otpData.expiresAt.toDate();
        if (now > expiresAt) {
            try {
                await safeUpdate({ verified: true });
            } catch (e) {
                if (e.message === 'OTP_INVALIDATED') return invalidatedError;
                throw e;
            }
            return { success: false, error: 'Code expired. Please request a new one.' };
        }

        if (otpData.attempts >= 3) {
            try {
                await safeUpdate({ verified: true });
            } catch (e) {
                if (e.message === 'OTP_INVALIDATED') return invalidatedError;
                throw e;
            }
            return { success: false, error: 'Too many attempts. Please request a new code.' };
        }

        if (otpData.code !== code) {
            try {
                await safeUpdate({ attempts: otpData.attempts + 1 });
            } catch (e) {
                if (e.message === 'OTP_INVALIDATED') return invalidatedError;
                throw e;
            }
            return { success: false, error: 'Invalid code' };
        }

        try {
            await safeUpdate({ verified: true, verifiedAt: new Date() });
        } catch (e) {
            if (e.message === 'OTP_INVALIDATED') return invalidatedError;
            throw e;
        }

        return { success: true };
    }

    static async cleanup(userId, options = {}) {
        const { exceptId } = options;
        const snapshot = await db.collection('otp_codes')
            .where('userId', '==', userId)
            .get();

        const batch = db.batch();
        let count = 0;
        snapshot.docs.forEach(doc => {
            if (exceptId && doc.id === exceptId) return;
            batch.delete(doc.ref);
            count++;
        });

        if (count > 0) await batch.commit();
    }

    static async cleanupExpired() {
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
