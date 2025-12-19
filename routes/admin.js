const express = require('express');
const router = express.Router();
const School = require('../models/School');
const User = require('../models/User');
const { route } = require('./auth');


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


router.post("/add-subject-to-class", async (req, res) => {
    try{

        if (!req.session.userId || req.session.userRole !== 'school_admin'){
            return res.redirect('/auth/login'); 
        }

        const {classYear, subjectName} = req.body; 
        const schoolId = req.session.schoolId; 


        if(!classYear || !subjectName){
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Class year and subject are required'));
        }

        await School.addSubjectToClassYear(schoolId, classYear, subjectName);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`${subjectName} added to Grade ${classYear}`));
    } catch (error) {
        console.error('Add subject to class error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message));
    }
}); 

router.post('/remove-subject-from-class', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }

        const { classYear, subjectName } = req.body;
        const schoolId = req.session.schoolId;

        await School.removeSubjectFromClassYear(schoolId, classYear, subjectName);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`${subjectName} removed from Grade ${classYear}`));
    } catch (error) {
        console.error('Remove subject from class error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message));
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


        if (role === 'teacher' && subject) {
            const schoolSubjects = await School.getSubjects(schoolId);
            if (!schoolSubjects.includes(subject)) {
                return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Selected subject does not exist in your school. Please add it first.'));
            }
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


router.post('/add-subject', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }

        const { subjectName } = req.body;
        const schoolId = req.session.schoolId;

        if (!subjectName || !subjectName.trim()) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Subject name is required'));
        }

        await School.addSubject(schoolId, subjectName);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Subject "${subjectName.trim()}" added successfully!`));
    } catch (error) {
        console.error('Add subject error:', error);
        const errorMessage = error.message || 'Failed to add subject. Please try again.';
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
});

// Remove Subject
router.post('/remove-subject', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }

        const { subjectName } = req.body;
        const schoolId = req.session.schoolId;

        if (!subjectName) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Subject name is required'));
        }

        await School.removeSubject(schoolId, subjectName);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Subject "${subjectName}" removed successfully!`));
    } catch (error) {
        console.error('Remove subject error:', error);
        const errorMessage = error.message || 'Failed to remove subject. Please try again.';
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
});

// Check Subject Usage (AJAX endpoint)
router.post('/check-subject-usage', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { subjectName } = req.body;
        const schoolId = req.session.schoolId;

        if (!subjectName) {
            return res.status(400).json({ error: 'Subject name is required' });
        }

        const usageInfo = await School.isSubjectInUse(schoolId, subjectName);
        res.json(usageInfo);
    } catch (error) {
        console.error('Check subject usage error:', error);
        res.status(500).json({ error: 'Failed to check subject usage' });
    }
});

module.exports = router;

