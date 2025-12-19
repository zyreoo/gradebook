const express = require('express');
const router = express.Router();
const School = require('../models/School');
const User = require('../models/User');

// Admin Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }

        if (req.session.userRole !== 'school_admin') {
            return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. School admins only.'));
        }

        const schoolId = req.session.schoolId;
        if (!schoolId) {
            return res.redirect('/auth/login?error=' + encodeURIComponent('School information not found'));
        }

        const school = await School.findById(schoolId);
        const teachers = await School.getSchoolUsers(schoolId, 'teacher');
        const students = await School.getSchoolUsers(schoolId, 'student');

        res.render('admin', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load admin dashboard'));
    }
});


router.post('/create-user', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }

        const { name, email, password, confirmPassword, role, classYear, subject } = req.body;
        const schoolId = req.session.schoolId;

        if (!name || !email || !password || !confirmPassword || !role) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('All fields are required'));
        }

        if (password !== confirmPassword) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Passwords do not match'));
        }

        if (role !== 'student' && role !== 'teacher') {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Invalid role selected'));
        }

        if (role === 'student' && !classYear) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Please select a grade level for the student'));
        }

        if (password.length < 6) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Password must be at least 6 characters'));
        }

        const existingUser = await User.findbyEmail(email);
        if (existingUser) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('User with this email already exists'));
        }

        await User.create({
            name,
            email,
            password,
            role,
            schoolId,
            classYear: role === 'student' ? classYear : null,
            subject: role === 'teacher' ? subject : null
        });

        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`${role.charAt(0).toUpperCase() + role.slice(1)} ${name} created successfully!`));
    } catch (error) {
        console.error('Create user error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent('Failed to create user. Please try again.'));
    }
});

module.exports = router;

