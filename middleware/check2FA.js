function check2FAComplete(req, res, next) {
    if (req.session.pendingUserId && !req.session.userId) {
        return res.redirect('/auth/verify-otp');
    }
    
    next();
}

function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    if (req.session.pendingUserId) {
        return res.redirect('/auth/verify-otp');
    }
    
    next();
}

module.exports = {
    check2FAComplete,
    requireAuth
};
