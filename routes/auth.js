const express = require('express');
const router = express.Router();
const User = require('../models/User');
const OTP = require('../models/OTP');
const emailService = require('../services/emailService');





router.get('/admin/register', (req, res) => {
    res.render('adminregister', { 
        error: req.query.error || null,
        success: req.query.success || null
    });
});


router.post('/admin/register', async (req, res) => {
    try { 
        const {name, email, password, confirmPassword, schoolName, adress} = req.body; 
        if (!name || !email || !password || !confirmPassword || !schoolName){
            return res.redirect('/auth/admin/register?error=' + 
                encodeURIComponent('All fields are required'));
        }

        if (password !== confirmPassword) {
            return res.redirect('/auth/admin/register?error=' + 
                encodeURIComponent('Passwords do not match'));
        }

        if (password.length < 6) {
            return res.redirect('/auth/admin/register?error=' + 
                encodeURIComponent('Password must be at least 6 characters'));
        }


        const existingUser = await User.findbyEmail(email); 
        if (existingUser) {
            return res.redirect('/auth/admin/register?error=' + 
                encodeURIComponent('Email already exists'));
        }

        const School = require('../models/School'); 
        await School.create({name, email, password, schoolName, adress});
        
        res.redirect('/auth/admin/login?success=' + 
            encodeURIComponent('School registered successfully! Please login.'));
            
    } catch (error) {
        console.error('Admin registration error:', error);
        res.redirect('/auth/admin/register?error=' + 
            encodeURIComponent('Registration failed. Please try again.'));
    }
}); 


router.get('/admin/login', (req, res) => {
    res.render('adminlogin', { 
        error: req.query.error || null,
        success: req.query.success || null
    });
});


router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const user = await User.findbyEmail(email); 
        if (!user) {
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        if (user.role !== 'school_admin') {
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Access denied. School administrators only.')); 
        }

        const isMatch = await User.comparepassword(password, user.password);

        if (!isMatch) {
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const otpResult = await OTP.create(user.uid, user.email);
        const emailResult = await emailService.sendOTP(user.email, otpResult.code, user.name);

        if (!emailResult.success) {
            console.error('Failed to send OTP:', emailResult.error);
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Failed to send verification code. Please try again.'));
        }

        req.session.pendingUserId = user.uid;
        req.session.pendingUserEmail = user.email;
        req.session.pendingUserName = user.name;
        req.session.pendingUserRole = user.role;
        req.session.pendingSchoolId = user.schoolId || null;

        return res.redirect('/auth/verify-otp');

    } catch (error) {
        console.error('Admin login error', error);
        res.redirect('/auth/admin/login?error=' + encodeURIComponent('Login failed. Please try again.'));
    }
});


router.get('/login', (req, res) => {
    res.render('login', { 
        error: req.query.error || null,
        success: req.query.success || null
    });
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const user = await User.findbyEmail(email); 
        if (!user) {
            return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const isMatch = await User.comparepassword(password, user.password);

        if (!isMatch) {
            return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const requires2FA = user.role === 'school_admin' || user.role === 'teacher';

        if (requires2FA) {
            const otpResult = await OTP.create(user.uid, user.email);
            const emailResult = await emailService.sendOTP(user.email, otpResult.code, user.name);

            if (!emailResult.success) {
                console.error('Failed to send OTP:', emailResult.error);
                return res.redirect('/auth/login?error=' + encodeURIComponent('Failed to send verification code. Please try again.'));
            }

            req.session.pendingUserId = user.uid;
            req.session.pendingUserEmail = user.email;
            req.session.pendingUserName = user.name;
            req.session.pendingUserRole = user.role;
            req.session.pendingSchoolId = user.schoolId || null;

            return res.redirect('/auth/verify-otp');
        }

        req.session.userId = user.uid;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        req.session.schoolId = user.schoolId || null;

        return res.redirect('/dashboard');

    } catch (error) {
        console.error('login error', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Login failed. Please try again.'));
    }
});


router.get('/verify-otp', (req, res) => {
    if (!req.session.pendingUserId) {
        return res.redirect('/auth/login');
    }

    res.render('verify-otp', {
        email: req.session.pendingUserEmail,
        error: req.query.error || null,
        success: req.query.success || null
    });
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { code } = req.body;

        if (!req.session.pendingUserId) {
            return res.redirect('/auth/login?error=' + encodeURIComponent('Session was lost. Please sign in again.'));
        }

        if (!code?.length || code.length !== 6) {
            return res.redirect('/auth/verify-otp?error=' + encodeURIComponent('Please enter a valid 6-digit code'));
        }

        const verifyResult = await OTP.verify(req.session.pendingUserId, code);

        if (!verifyResult.success) {
            return res.redirect('/auth/verify-otp?error=' + encodeURIComponent(verifyResult.error));
        }

        req.session.userId = req.session.pendingUserId;
        req.session.userEmail = req.session.pendingUserEmail;
        req.session.userName = req.session.pendingUserName;
        req.session.userRole = req.session.pendingUserRole;
        req.session.schoolId = req.session.pendingSchoolId;

        delete req.session.pendingUserId;
        delete req.session.pendingUserEmail;
        delete req.session.pendingUserName;
        delete req.session.pendingUserRole;
        delete req.session.pendingSchoolId;

        await OTP.cleanup(req.session.userId);

        if (req.session.userRole === 'school_admin') {
            return res.redirect('/admin/dashboard');
        }

        return res.redirect('/dashboard');

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.redirect('/auth/verify-otp?error=' + encodeURIComponent('Verification failed. Please try again.'));
    }
});

router.post('/resend-otp', async (req, res) => {
    try {
        if (!req.session.pendingUserId) {
            return res.json({ success: false, error: 'Session was lost. Please sign in again.' });
        }

        const userId = req.session.pendingUserId;
        const email = req.session.pendingUserEmail;
        const name = req.session.pendingUserName;

        const otpResult = await OTP.create(userId, email);
        const emailResult = await emailService.sendOTP(email, otpResult.code, name);

        if (!emailResult.success) {
            return res.json({ success: false, error: 'Failed to send verification code' });
        }

        await OTP.cleanup(userId, { exceptId: otpResult.id });

        return res.json({ success: true, message: 'New code sent successfully' });

    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.json({ success: false, error: 'Failed to resend code' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
});

module.exports = router;

