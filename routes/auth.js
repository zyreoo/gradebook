const express = require('express');
const router = express.Router();
const User = require('../models/User');





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


// GET admin login page
router.get('/admin/login', (req, res) => {
    res.render('adminlogin', { 
        error: req.query.error || null,
        success: req.query.success || null
    });
});


// POST admin login
router.post('/admin/login', async (req, res) => {
    try{
        const {email, password} = req.body;

        if (!email || !password){
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const user = await User.findbyEmail(email); 
        if (!user) {
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        // Check if user is actually a school admin
        if (user.role !== 'school_admin') {
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Access denied. School administrators only.')); 
        }

        const isMatch = await User.comparepassword(password, user.password);

        if(!isMatch){
            return res.redirect('/auth/admin/login?error=' + encodeURIComponent('Invalid email or password')); 
        }
        
        req.session.userId = user.uid;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        req.session.schoolId = user.schoolId || null;

        res.redirect('/admin/dashboard');

    }catch (error){
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
    try{
        const {email, password} = req.body


        if (!email || !password){
            return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const user = await User.findbyEmail(email); 
        if (!user) {
            return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password')); 
        }

        const isMatch = await User.comparepassword(password, user.password);

        if(!isMatch){
            return res.redirect('/auth/login?error=' + encodeURIComponent('Invalid email or password')); 
        }
        
        req.session.userId = user.uid;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        req.session.schoolId = user.schoolId || null;

        if (user.role === 'school_admin') {
            return res.redirect('/admin/dashboard');
        }

        res.redirect('/dashboard');

    }catch (error){
        console.error('login error', error)
        res.redirect('/auth/login?error=' + encodeURIComponent('Login failed. Please try again.'))

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

