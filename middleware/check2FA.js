// Middleware to ensure 2FA is completed for users with pending sessions
function check2FAComplete(req, res, next) {
    // If user has a pending session (hasn't completed 2FA), redirect to OTP verification
    if (req.session.pendingUserId && !req.session.userId) {
        return res.redirect('/auth/verify-otp');
    }
    
    next();
}

// Middleware to protect routes that require full authentication
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    
    // Ensure no pending 2FA
    if (req.session.pendingUserId) {
        return res.redirect('/auth/verify-otp');
    }
    
    next();
}

module.exports = {
    check2FAComplete,
    requireAuth
};
