const express = require('express');
const router = express.Router();
const School = require('../models/School');
const User = require('../models/User');


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
        const explicitClasses = school.classes || [];
        const implicitClasses = school.classYearTeachers ? Object.keys(school.classYearTeachers) : [];
        
        const allClassesSet = new Set();
        explicitClasses.forEach(cls => allClassesSet.add(cls));
        implicitClasses.forEach(cls => allClassesSet.add(cls));
        const allClasses = Array.from(allClassesSet).sort();

        res.render('admin', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses, // Pass all classes to the view
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

        const { name, email, password, confirmPassword, role, classYear, parentEmail, parentPassword} = req.body;
        // subjects will be an array if multiple selected
        const subjects = Array.isArray(req.body.subjects) ? req.body.subjects : (req.body.subjects ? [req.body.subjects] : []);
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

        if (role === 'student') {
            if (parentEmail && !parentPassword) {
                return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Parent password is required if parent email is provided'));
            }
            if (parentPassword && !parentEmail) {
                return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Parent email is required if parent password is provided'));
            }
            if (parentEmail && parentPassword && parentPassword.length < 6) {
                return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Parent password must be at least 6 characters'));
            }
            // Check if parent email already exists
            if (parentEmail) {
                const existingParent = await User.findbyEmail(parentEmail);
                if (existingParent) {
                    return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Parent email already exists'));
                }
            }
        }



        // Validate subjects for teachers
        if (role === 'teacher' && subjects.length > 0) {
            const schoolSubjects = await School.getSubjects(schoolId);
            const invalidSubjects = subjects.filter(s => !schoolSubjects.includes(s));
            if (invalidSubjects.length > 0) {
                return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Some selected subjects do not exist in your school.'));
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
            subjects: role === 'teacher' ? subjects : null, 
            parentEmail: role === 'student'? (parentEmail || null) : null,
            parentPassword: role === 'student' ? (parentPassword || null) : null
        });


        const successMsg = role === 'student' && parentEmail
            ? `${role.charAt(0).toUpperCase() + role.slice(1)} ${name} and parent account created successfully!`
            : `${role.charAt(0).toUpperCase() + role.slice(1)} ${name} created successfully!`;

        res.redirect('/admin/dashboard?success=' + encodeURIComponent(successMsg));
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

        const result = await School.addSubject(schoolId, subjectName);
        const subjectDisplay = result.subjects[result.subjects.length - 1]; // Get the last added subject (capitalized)
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Subject "${subjectDisplay}" added successfully!`));
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



router.post('/assign-teacher', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }

        const { classYear, teacherId } = req.body;
        const schoolId = req.session.schoolId;
        
        // Handle subjects - can be an array or a single value
        let subjects = req.body.subjects || [];
        if (!Array.isArray(subjects)) {
            subjects = subjects ? [subjects] : [];
        }

        if (!classYear || !teacherId) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('All fields are required'));
        }

        await School.assignTeacherToClass(schoolId, classYear, teacherId, subjects);
        
        const successMsg = subjects.length > 0 
            ? `Teacher assigned successfully to teach: ${subjects.join(', ')}`
            : 'Teacher assigned successfully!';
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(successMsg));
    } catch (error) {
        console.error('Assign teacher error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message));
    }
});

// Remove teacher from class
router.post('/remove-teacher-assignment', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }

        const { classYear, teacherId } = req.body;
        const schoolId = req.session.schoolId;

        await School.removeTeacherFromClass(schoolId, classYear, teacherId);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent('Teacher assignment removed!'));
    } catch (error) {
        console.error('Remove teacher assignment error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message));
    }
});


router.post('/assign-teacher-ajax', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { classYear, teacherId, subjects } = req.body;
        const schoolId = req.session.schoolId;
        
        if (!classYear || !teacherId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Class year and teacher ID are required' 
            });
        }

        // Handle subjects - can be an array or a single value
        let subjectArray = subjects || [];
        if (!Array.isArray(subjectArray)) {
            subjectArray = subjectArray ? [subjectArray] : [];
        }

        await School.assignTeacherToClass(schoolId, classYear, teacherId, subjectArray);
        
        res.json({ 
            success: true, 
            message: `Teacher assigned successfully${subjectArray.length > 0 ? ` to teach: ${subjectArray.join(', ')}` : ''}` 
        });
    } catch (error) {
        console.error('AJAX assign teacher error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to assign teacher' 
        });
    }
});



router.post('/add-class', async (req, res) =>{
    try{

        if(!req.session.userId || req.session.userRole !== 'school_admin'){
            return res.redirect('/auth/login');
        }

        const {className} = req.body; 
        const schoolId = req.session.schoolId; 

        if(!className || !className.trim()){
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Class name is required'));
        }

        const addedClass = await School.addClass(schoolId, className);
        const classNameDisplay = addedClass[addedClass.length - 1]; // Get the last added class (capitalized)
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Class "${classNameDisplay}" added successfully!`));
    }catch(error){
        console.error('Add class error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message || 'Failed to add class'));
    }
}); 


router.post('/remove-class', async (req, res) =>{
    try{
        if(!req.session.userId || req.session.userRole !== 'school_admin'){
            return res.redirect('/auth/login');
        }

        const {className} = req.body; 
        const schoolId = req.session.schoolId; 

        if (!className) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Class name is required'));
        }

        await School.removeClass(schoolId, className);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Class "${className}" removed successfully!`));
    } catch (error){
        console.error('Remove class error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message || 'Failed to remove class'));
    }
}); 



router.post('/assign-classmaster' , async (req,res) => { 
    try{
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }


        const {className, teacherId} = req.body; 
        const schoolId = req.session.schoolId;

        if(!className || !teacherId){
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Class and teacher are required'));
        }

        // Capitalize class name to match how classes are stored
        const capitalizedClassName = (className || '').trim().toUpperCase();
        
        await School.assignClassmaster(schoolId, capitalizedClassName, teacherId); 
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Classmaster assigned successfully for ${capitalizedClassName}`));
    } catch (error){
        console.error('Assign classmaster error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message || 'Failed to assign classmaster'));
    }
}); 


router.post('/remove-classmaster', async (req, res) =>{
    try{
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            return res.redirect('/auth/login');
        }
        const { className } = req.body;
        const schoolId = req.session.schoolId;

        if (!className) {
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent('Class name is required'));
        }

        // Capitalize class name to match how classes are stored
        const capitalizedClassName = (className || '').trim().toUpperCase();
        
        await School.removeClassmaster(schoolId, capitalizedClassName);
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Classmaster removed successfully for ${capitalizedClassName}`));
    } catch(error){
        console.error('Remove classmaster error:', error);
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(error.message || 'Failed to remove classmaster'));
    }
}); 
module.exports = router;

