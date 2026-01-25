const { Store } = require('express-session');
const { db } = require('../config/firebase');

/**
 * Firestore-backed session store for express-session.
 * Sessions persist across serverless instances (e.g. on Vercel), so
 * "Session was lost" no longer happens when the verify-otp POST hits
 * a different instance than the one that stored pendingUserId.
 */
class FirestoreSessionStore extends Store {
    constructor() {
        super();
        this.collection = db.collection('sessions');
    }

    get(sid, callback) {
        this.collection.doc(sid).get()
            .then((doc) => {
                if (!doc.exists) return callback(null, null);
                const d = doc.data();
                const expires = d.expires?.toDate ? d.expires.toDate() : d.expires;
                if (expires && expires < new Date()) {
                    this.destroy(sid, () => {});
                    return callback(null, null);
                }
                try {
                    const session = d.data ? JSON.parse(d.data) : null;
                    callback(null, session);
                } catch (e) {
                    callback(e, null);
                }
            })
            .catch((err) => callback(err, null));
    }

    set(sid, session, callback) {
        const maxAge = session.cookie?.maxAge ?? 72 * 60 * 60 * 1000;
        const expires = new Date(Date.now() + maxAge);
        const data = JSON.stringify(session);
        this.collection.doc(sid).set({ data, expires })
            .then(() => callback(null))
            .catch((err) => callback(err));
    }

    destroy(sid, callback) {
        this.collection.doc(sid).delete()
            .then(() => callback(null))
            .catch((err) => callback(err));
    }

    touch(sid, session, callback) {
        const maxAge = session.cookie?.maxAge ?? 72 * 60 * 60 * 1000;
        const expires = new Date(Date.now() + maxAge);
        this.collection.doc(sid).update({ expires })
            .then(() => callback(null))
            .catch((err) => callback(err));
    }
}

module.exports = FirestoreSessionStore;
