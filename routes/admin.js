const express = require('express');
const router = express.Router();
const School = require('../models/School');
const User = require('../models/User');
const { validateCNP } = require('../utils/validateCNP');

function respondWithError(res, req, message, statusCode = 400, redirectPath = '/admin/dashboard') {
    if (req.headers.accept?.includes('application/json')) {
        return res.status(statusCode).json({ success: false, error: message });
    }
    return res.redirect(redirectPath + '?error=' + encodeURIComponent(message));
}

function respondWithSuccess(res, req, message, additionalData = {}, redirectPath = '/admin/dashboard') {
    if (req.headers.accept?.includes('application/json')) {
        return res.json({ success: true, message, ...additionalData });
    }
    return res.redirect(redirectPath + '?success=' + encodeURIComponent(message));
}

function checkAuthentication(req) {
    return req.session.userId && req.session.userRole === 'school_admin';
}

function validateBasicFields(data) {
    const { name, email, password, confirmPassword, role } = data;
    
    if (!name || !email || !password || !confirmPassword || !role) {
        return 'All fields are required';
    }
    
    if (password !== confirmPassword) {
        return 'Passwords do not match';
    }
    
    if (role !== 'student' && role !== 'teacher') {
        return 'Invalid role selected';
    }
    
    if (password.length < 6) {
        return 'Password must be at least 6 characters';
    }
    
    return null;
}

function validateStudentFields(data) {
    const { classYear, parentEmail, parentPassword, cnp } = data;
    
    if (!classYear) {
        return 'Please select a grade level for the student';
    }
    
    if (!cnp || !String(cnp).trim()) {
        return 'CNP (Cod Numeric Personal) is required for students';
    }
    
    const cnpResult = validateCNP(String(cnp).trim());
    if (!cnpResult.valid) {
        return cnpResult.error || 'CNP is invalid';
    }
    
    if (parentEmail && !parentPassword) {
        return 'Parent password is required if parent email is provided';
    }
    
    if (parentPassword && !parentEmail) {
        return 'Parent email is required if parent password is provided';
    }
    
    if (parentEmail && parentPassword && parentPassword.length < 6) {
        return 'Parent password must be at least 6 characters';
    }
    
    return null;
}

async function validateParentEmail(parentEmail) {
    if (!parentEmail) {
        return null;
    }
    
    const existingParent = await User.findbyEmail(parentEmail);
    if (existingParent) {
        return 'Parent email already exists';
    }
    
    return null;
}

async function validateTeacherSubjects(subjects, schoolId) {
    if (!subjects || subjects.length === 0) {
        return null;
    }
    
    const schoolSubjects = await School.getSubjects(schoolId);
    const invalidSubjects = subjects.filter(s => !schoolSubjects.includes(s));
    
    if (invalidSubjects.length > 0) {
        return 'Some selected subjects do not exist in your school.';
    }
    
    return null;
}

async function checkUserExists(email) {
    const existingUser = await User.findbyEmail(email);
    if (existingUser) {
        return 'User with this email already exists';
    }
    return null;
}

function prepareUserData(data, schoolId) {
    const { name, email, password, role, classYear, parentEmail, parentPassword, cnp, fathersName, mothersName, address, matricolNumber, parentPhone, placeOfBirth, birthDate, otherMentions } = data;
    let subjects;
    if (Array.isArray(data.subjects)) {
        subjects = data.subjects;
    } else if (data.subjects) {
        subjects = [data.subjects];
    } else {
        subjects = [];
    }
    
    const base = {
        name,
        email,
        password,
        role,
        schoolId,
        classYear: role === 'student' ? classYear : null,
        subjects: role === 'teacher' ? subjects : null,
        parentEmail: role === 'student' ? (parentEmail || null) : null,
        parentPassword: role === 'student' ? (parentPassword || null) : null
    };
    
    if (role === 'student') {
        base.cnp = cnp ? String(cnp).trim() : null;
        base.fathersName = fathersName ? String(fathersName).trim() : null;
        base.mothersName = mothersName ? String(mothersName).trim() : null;
        base.address = address ? String(address).trim() : null;
        base.matricolNumber = matricolNumber ? String(matricolNumber).trim() : null;
        base.parentPhone = parentPhone ? String(parentPhone).trim() : null;
        base.placeOfBirth = placeOfBirth ? String(placeOfBirth).trim() : null;
        base.birthDate = birthDate ? String(birthDate).trim() : null;
        base.otherMentions = otherMentions ? String(otherMentions).trim() : null;
    }
    
    return base;
}

function generateSuccessMessage(role, name, parentEmail) {
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);
    
    if (role === 'student' && parentEmail) {
        return `${roleCapitalized} ${name} and parent account created successfully!`;
    }
    
    return `${roleCapitalized} ${name} created successfully!`;
}

function checkAuthAndRespond(res, req) {
    if (!checkAuthentication(req)) {
        if (req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        return res.redirect('/auth/login');
    }
    return null;
}

async function validateRoleSpecificFields(role, req, schoolId) {
    if (role === 'student') {
        const studentError = validateStudentFields(req.body);
        if (studentError) {
            return studentError;
        }

        const parentError = await validateParentEmail(req.body.parentEmail);
        if (parentError) {
            return parentError;
        }
    }

    if (role === 'teacher') {
        let subjects;
        if (Array.isArray(req.body.subjects)) {
            subjects = req.body.subjects;
        } else if (req.body.subjects) {
            subjects = [req.body.subjects];
        } else {
            subjects = [];
        }
        const subjectError = await validateTeacherSubjects(subjects, schoolId);
        if (subjectError) {
            return subjectError;
        }
    }

    return null;
}

function validateUpdateFields(data) {
    const { uid, name, email, role } = data;
    
    if (!uid || !name || !email || !role) {
        return 'All required fields must be provided';
    }
    
    return null;
}

async function validateUserExists(uid) {
    const currentUser = await User.findbyId(uid);
    if (!currentUser) {
        return { error: 'User not found', user: null };
    }
    return { error: null, user: currentUser };
}

async function validateEmailChange(newEmail, currentEmail, uid) {
    if (newEmail === currentEmail) {
        return null;
    }
    
    const existingUser = await User.findbyEmail(newEmail);
    if (existingUser && existingUser.uid !== uid) {
        return 'Email already in use by another user';
    }
    
    return null;
}

async function validateStudentClassYear(classYear, schoolId) {
    if (!classYear) {
        return null;
    }
    
    const school = await School.findById(schoolId);
    const availableClasses = school.classes || [];
    
    if (!availableClasses.includes(classYear)) {
        return 'Invalid class selected';
    }
    
    return null;
}

function prepareUpdateData(data, role) {
    const { name, email, classYear, subjects, parentEmail, cnp, fathersName, mothersName, address, matricolNumber, parentPhone, placeOfBirth, birthDate, otherMentions } = data;
    const updates = { name, email };
    
    if (role === 'student') {
        updates.classYear = classYear || null;
        if (parentEmail !== undefined) {
            updates.parentEmail = parentEmail || null;
        }
        if (cnp !== undefined) updates.cnp = cnp ? String(cnp).trim() : null;
        if (fathersName !== undefined) updates.fathersName = fathersName ? String(fathersName).trim() : null;
        if (mothersName !== undefined) updates.mothersName = mothersName ? String(mothersName).trim() : null;
        if (address !== undefined) updates.address = address ? String(address).trim() : null;
        if (matricolNumber !== undefined) updates.matricolNumber = matricolNumber ? String(matricolNumber).trim() : null;
        if (parentPhone !== undefined) updates.parentPhone = parentPhone ? String(parentPhone).trim() : null;
        if (placeOfBirth !== undefined) updates.placeOfBirth = placeOfBirth ? String(placeOfBirth).trim() : null;
        if (birthDate !== undefined) updates.birthDate = birthDate ? String(birthDate).trim() : null;
        if (otherMentions !== undefined) updates.otherMentions = otherMentions ? String(otherMentions).trim() : null;
    } else if (role === 'teacher') {
        updates.subjects = subjects || [];
    }
    
    return updates;
}


// Helper function to get common admin data
async function getAdminData(schoolId) {
    const school = await School.findById(schoolId);
    const teachers = await School.getSchoolUsers(schoolId, 'teacher');
    const students = await School.getSchoolUsers(schoolId, 'student');
    const explicitClasses = school.classes || [];
    const implicitClasses = school.classYearTeachers ? Object.keys(school.classYearTeachers) : [];
    
    const allClassesSet = new Set();
    explicitClasses.forEach(cls => allClassesSet.add(cls));
    implicitClasses.forEach(cls => allClassesSet.add(cls));
    
    const compareClasses = (a, b) => {
        const matchA = a.match(/^(\d+)([A-Z])?$/);
        const matchB = b.match(/^(\d+)([A-Z])?$/);

        if (!matchA || !matchB) {
            return a.localeCompare(b);
        }

        const numA = Number.parseInt(matchA[1]);
        const numB = Number.parseInt(matchB[1]);
        const letterA = matchA[2] || '';
        const letterB = matchB[2] || '';

        if (numA !== numB) {
            return numA - numB;
        }

        if (letterA === letterB) {
            return 0;
        }
        if (letterA === '') return -1;
        if (letterB === '') return 1;
        return letterA.localeCompare(letterB);
    };
    
    const allClasses = Array.from(allClassesSet).sort(compareClasses);

    return { school, teachers, students, allClasses };
}

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

        const { school, teachers, students, allClasses } = await getAdminData(schoolId);

        res.render('admin-dashboard', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load admin dashboard'));
    }
});

router.get('/subjects', async (req, res) => {
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

        const { school, teachers, students, allClasses } = await getAdminData(schoolId);

        res.render('admin-subjects', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin subjects error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load subjects'));
    }
});

router.get('/classes', async (req, res) => {
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

        const { school, teachers, students, allClasses } = await getAdminData(schoolId);

        res.render('admin-classes', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin classes error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load classes'));
    }
});

router.get('/add-user', async (req, res) => {
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

        const { school, teachers, students, allClasses } = await getAdminData(schoolId);

        res.render('admin-add-user', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin add user error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load add user page'));
    }
});

router.get('/teacher-assignments', async (req, res) => {
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

        const { school, teachers, students, allClasses } = await getAdminData(schoolId);

        res.render('admin-teacher-assignments', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin teacher assignments error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load teacher assignments'));
    }
});

router.get('/people', async (req, res) => {
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

        const { school, teachers, students, allClasses } = await getAdminData(schoolId);

        res.render('admin-people', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            school: school,
            teachers: teachers,
            students: students,
            allClasses: allClasses,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Admin people error:', error);
        res.redirect('/auth/login?error=' + encodeURIComponent('Failed to load people'));
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
        const authResponse = checkAuthAndRespond(res, req);
        if (authResponse) {
            return authResponse;
        }

        const { role, parentEmail } = req.body;
        const schoolId = req.session.schoolId;
        let subjects;
        if (Array.isArray(req.body.subjects)) {
            subjects = req.body.subjects;
        } else if (req.body.subjects) {
            subjects = [req.body.subjects];
        } else {
            subjects = [];
        }

        const basicError = validateBasicFields(req.body);
        if (basicError) {
            return respondWithError(res, req, basicError, 400, '/admin/add-user');
        }

        const roleError = await validateRoleSpecificFields(role, req, schoolId);
        if (roleError) {
            return respondWithError(res, req, roleError, 400, '/admin/add-user');
        }

        const userExistsError = await checkUserExists(req.body.email);
        if (userExistsError) {
            return respondWithError(res, req, userExistsError, 400, '/admin/add-user');
        }

        const userData = prepareUserData({ ...req.body, subjects }, schoolId);
        await User.create(userData);

        const successMsg = generateSuccessMessage(role, req.body.name, parentEmail);
        const additionalData = {
            user: { 
                name: req.body.name, 
                email: req.body.email, 
                role, 
                classYear: role === 'student' ? req.body.classYear : null 
            }
        };

        return respondWithSuccess(res, req, successMsg, additionalData);
    } catch (error) {
        console.error('Create user error:', error);
        return respondWithError(res, req, 'Failed to create user. Please try again.', 500, '/admin/add-user');
    }
});


router.post('/add-subject', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const { subjectName } = req.body;
        const schoolId = req.session.schoolId;

        if (!subjectName?.trim()) {
            const errorMsg = 'Subject name is required';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        const result = await School.addSubject(schoolId, subjectName);
        const subjectDisplay = result.subjects[result.subjects.length - 1];
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: `Subject "${subjectDisplay}" added successfully!`,
                subject: subjectDisplay,
                subjects: result.subjects
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Subject "${subjectDisplay}" added successfully!`));
    } catch (error) {
        console.error('Add subject error:', error);
        const errorMessage = error.message || 'Failed to add subject. Please try again.';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
});

router.post('/remove-subject', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const { subjectName } = req.body;
        const schoolId = req.session.schoolId;

        if (!subjectName) {
            const errorMsg = 'Subject name is required';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        await School.removeSubject(schoolId, subjectName);
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: `Subject "${subjectName}" removed successfully!`,
                subjectName: subjectName
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Subject "${subjectName}" removed successfully!`));
    } catch (error) {
        console.error('Remove subject error:', error);
        const errorMessage = error.message || 'Failed to remove subject. Please try again.';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
});

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

router.post('/remove-teacher-assignment', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const { classYear, teacherId } = req.body;
        const schoolId = req.session.schoolId;

        await School.removeTeacherFromClass(schoolId, classYear, teacherId);
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: 'Teacher assignment removed!',
                classYear: classYear,
                teacherId: teacherId
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent('Teacher assignment removed!'));
    } catch (error) {
        console.error('Remove teacher assignment error:', error);
        const errorMessage = error.message || 'Failed to remove teacher assignment';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
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

        let subjectArray = subjects || [];
        if (!Array.isArray(subjectArray)) {
            subjectArray = subjectArray ? [subjectArray] : [];
        }

        await School.assignTeacherToClass(schoolId, classYear, teacherId, subjectArray);
        
        let message = 'Teacher assigned successfully';
        if (subjectArray.length > 0) {
            message += ` to teach: ${subjectArray.join(', ')}`;
        }
        
        res.json({ 
            success: true, 
            message
        });
    } catch (error) {
        console.error('AJAX assign teacher error:', error);
        res.status(500).json({ 
            success: false, 
            message: error?.message || 'Failed to assign teacher' 
        });
    }
});



router.post('/add-class', async (req, res) =>{
    try{

        if(!req.session.userId || req.session.userRole !== 'school_admin'){
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const {className} = req.body; 
        const schoolId = req.session.schoolId; 

        if(!className?.trim()){
            const errorMsg = 'Class name is required';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        const addedClass = await School.addClass(schoolId, className);
        const classNameDisplay = addedClass[addedClass.length - 1];
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: `Class "${classNameDisplay}" added successfully!`,
                className: classNameDisplay,
                classes: addedClass
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Class "${classNameDisplay}" added successfully!`));
    }catch(error){
        console.error('Add class error:', error);
        const errorMessage = error.message || 'Failed to add class';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
}); 


router.post('/remove-class', async (req, res) =>{
    try{
        if(!req.session.userId || req.session.userRole !== 'school_admin'){
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const {className} = req.body; 
        const schoolId = req.session.schoolId; 

        if (!className) {
            const errorMsg = 'Class name is required';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        await School.removeClass(schoolId, className);
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: `Class "${className}" removed successfully!`,
                className: className
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Class "${className}" removed successfully!`));
    } catch (error){
        console.error('Remove class error:', error);
        const errorMessage = error.message || 'Failed to remove class';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
}); 



router.post('/assign-classmaster' , async (req,res) => { 
    try{
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }


        const {className, teacherId} = req.body; 
        const schoolId = req.session.schoolId;

        if(!className || !teacherId){
            const errorMsg = 'Class and teacher are required';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        const capitalizedClassName = (className || '').trim().toUpperCase();

        await School.assignClassmaster(schoolId, capitalizedClassName, teacherId);
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: `Classmaster assigned successfully for ${capitalizedClassName}`,
                className: capitalizedClassName,
                teacherId: teacherId
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Classmaster assigned successfully for ${capitalizedClassName}`));
    } catch (error){
        console.error('Assign classmaster error:', error);
        const errorMessage = error.message || 'Failed to assign classmaster';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
}); 


router.post('/remove-classmaster', async (req, res) =>{
    try{
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }
        const { className } = req.body;
        const schoolId = req.session.schoolId;

        if (!className) {
            const errorMsg = 'Class name is required';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        // Capitalize class name to match how classes are stored
        const capitalizedClassName = (className || '').trim().toUpperCase();
        
        await School.removeClassmaster(schoolId, capitalizedClassName);
        
        if (req.headers.accept?.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: `Classmaster removed successfully for ${capitalizedClassName}`,
                className: capitalizedClassName
            });
        }
        
        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Classmaster removed successfully for ${capitalizedClassName}`));
    } catch(error){
        console.error('Remove classmaster error:', error);
        const errorMessage = error.message || 'Failed to remove classmaster';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
}); 
router.post('/update-user', async (req, res) => {
    try {
        if (!checkAuthentication(req)) {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const { uid, email, role, classYear, subjects } = req.body;
        const schoolId = req.session.schoolId;

        const fieldError = validateUpdateFields(req.body);
        if (fieldError) {
            return respondWithError(res, req, fieldError);
        }

        const { error: userError, user: currentUser } = await validateUserExists(uid);
        if (userError) {
            return respondWithError(res, req, userError, 404);
        }

        const emailError = await validateEmailChange(email, currentUser.email, uid);
        if (emailError) {
            return respondWithError(res, req, emailError);
        }

        if (role === 'student') {
            const classError = await validateStudentClassYear(classYear, schoolId);
            if (classError) {
                return respondWithError(res, req, classError);
            }
            const cnp = req.body.cnp;
            if (cnp && String(cnp).trim()) {
                const cnpResult = validateCNP(String(cnp).trim());
                if (!cnpResult.valid) {
                    return respondWithError(res, req, cnpResult.error || 'CNP is invalid');
                }
            }
        }

        if (role === 'teacher') {
            const subjectError = await validateTeacherSubjects(subjects, schoolId);
            if (subjectError) {
                return respondWithError(res, req, subjectError);
            }
        }

        const updates = prepareUpdateData(req.body, role);
        await User.update(uid, updates);

        const successMsg = 'User updated successfully!';
        const additionalData = {
            user: { 
                uid, 
                name: req.body.name, 
                email, 
                role, 
                classYear: role === 'student' ? classYear : null 
            }
        };

        return respondWithSuccess(res, req, successMsg, additionalData);
    } catch (error) {
        console.error('Update user error:', error);
        const errorMessage = error.message || 'Failed to update user. Please try again.';
        return respondWithError(res, req, errorMessage, 500);
    }
});

router.post('/advance-academic-year', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'school_admin') {
            if (req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ success: false, error: 'Unauthorized' });
            }
            return res.redirect('/auth/login');
        }

        const schoolId = req.session.schoolId;
        const { confirmText } = req.body;

        if (confirmText !== 'ADVANCE YEAR') {
            const errorMsg = 'Confirmation text must be "ADVANCE YEAR"';
            if (req.headers.accept?.includes('application/json')) {
                return res.status(400).json({ success: false, error: errorMsg });
            }
            return res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMsg));
        }

        const result = await User.advanceAcademicYear(schoolId);

        if (req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                message: `Academic year advanced! ${result.studentsUpdated} students updated, ${result.gradesDeleted} grades deleted, ${result.absencesDeleted} absences deleted.`,
                ...result
            });
        }

        res.redirect('/admin/dashboard?success=' + encodeURIComponent(`Academic year advanced! ${result.studentsUpdated} students updated, ${result.gradesDeleted} grades deleted, ${result.absencesDeleted} absences deleted.`));
    } catch (error) {
        console.error('Advance academic year error:', error);
        const errorMessage = error.message || 'Failed to advance academic year';
        if (req.headers.accept?.includes('application/json')) {
            return res.status(500).json({ success: false, error: errorMessage });
        }
        res.redirect('/admin/dashboard?error=' + encodeURIComponent(errorMessage));
    }
});

module.exports = router;

