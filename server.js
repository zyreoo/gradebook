const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase - fail fast if it doesn't work
try {
    require('./config/firebase');
    console.log('✓ Firebase initialized successfully');
} catch (error) {
    console.error('CRITICAL: Failed to initialize Firebase');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    // In serverless, we want to fail fast - the app won't work without Firebase
    throw error;
}

// Initialize Email Service for 2FA
const emailService = require('./services/emailService');
(async () => {
    if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
        const emailTest = await emailService.testConnection();
        if (emailTest.success) {
            console.log('✓ Email service configured successfully');
        } else {
            console.warn('⚠ Email service configuration issue:', emailTest.error);
            console.warn('  2FA will not work. Please configure EMAIL_USER and EMAIL_APP_PASSWORD');
        }
    } else {
        console.warn('⚠ Email service not configured');
        console.warn('  Set EMAIL_USER and EMAIL_APP_PASSWORD in .env for 2FA');
        console.warn('  See docs/2FA-SETUP.md for instructions');
    }
})();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));




app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000
    }
}))


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { check2FAComplete } = require('./middleware/check2FA');
const { validateHeaderName } = require('http');

app.use('/auth', authRoutes);

// Apply 2FA check to protected routes (except auth routes)
app.use((req, res, next) => {
    // Skip 2FA check for auth routes and static files
    if (req.path.startsWith('/auth') || req.path.startsWith('/styles.css')) {
        return next();
    }
    
    check2FAComplete(req, res, next);
});

app.use('/admin', adminRoutes);

// Helper functions for dashboard
function createUserData(session) {
    return {
        name: session.userName,
        email: session.userEmail,
        role: session.userRole
    };
}

function groupGradesBySubject(grades) {
            const gradesBySubject = {};
            
    grades.forEach(gradeEntry => {
                const subject = gradeEntry.subject || 'General';
                if (!gradesBySubject[subject]) {
                    gradesBySubject[subject] = {
                        grades: [],
                        teacherName: gradeEntry.teacherName
                    };
                }
                gradesBySubject[subject].grades.push({
                    value: gradeEntry.grade,
                    date: gradeEntry.createdAt,
                    teacherName: gradeEntry.teacherName
                });
            });
            
    return gradesBySubject;
}

function groupAbsencesBySubject(absences) {
    const absencesBySubject = {};
    
    absences.forEach(absence => {
        const subject = absence.subject || 'General';
        if (!absencesBySubject[subject]) {
            absencesBySubject[subject] = {
                motivated: [],
                unmotivated: []
            };
        }
        
        const absenceData = {
            date: absence.date,
            teacherName: absence.teacherName
        };
        
        if (absence.type === 'motivated') {
            absenceData.reason = absence.reason;
            absencesBySubject[subject].motivated.push(absenceData);
        } else {
            absencesBySubject[subject].unmotivated.push(absenceData);
        }
    });
    
    return absencesBySubject;
}

async function getAvailableSubjects(schoolId, classYear) {
    const User = require('./models/User');
    const School = require('./models/School');
    
    if (!schoolId || !classYear) {
        return schoolId ? await School.getSubjects(schoolId) : [];
    }
    
                const schoolData = await School.findById(schoolId);
    const classTeachers = schoolData?.classYearTeachers?.[classYear] || [];
                
                const teacherSubjectsSet = new Set();
                for (const teacherId of classTeachers) {
                    const teacher = await User.findbyId(teacherId);
                    if (teacher) {
                        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);
                        teacherSubjects.forEach(subj => teacherSubjectsSet.add(subj));
                    }
                }
    
    return Array.from(teacherSubjectsSet);
}

function createSubjectList(availableSubjects, gradesBySubject) {
            const subjects = availableSubjects.map(subjectName => {
                const subjectData = gradesBySubject[subjectName];
                
                if (subjectData) {
                    const grades = subjectData.grades.map(g => g.value);
                    const average = grades.length > 0 
                        ? (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(2)
                        : 0;
                    
                    return {
                        name: subjectName,
                        grades: subjectData.grades.sort((a, b) => b.date - a.date),
                        average: parseFloat(average),
                        teacherName: subjectData.teacherName,
                        gradeCount: grades.length,
                        hasGrades: true
                    };
        }
        
                    return {
                        name: subjectName,
                        grades: [],
                        average: 0,
                        teacherName: null,
                        gradeCount: 0,
                        hasGrades: false
                    };
    });
    
    return subjects.sort((a, b) => a.name.localeCompare(b.name));
}

function calculateStats(grades, absences, subjects) {
    const totalGrades = grades.length;
            const overallAverage = totalGrades > 0
        ? (grades.reduce((sum, g) => sum + g.grade, 0) / totalGrades).toFixed(2)
                : 0;
            
    return {
                totalSubjects: subjects.filter(s => s.hasGrades).length,
                totalGrades: totalGrades,
                overallAverage: parseFloat(overallAverage),
        totalAbsences: absences.length,
        motivatedAbsences: absences.filter(a => a.type === 'motivated').length,
        unmotivatedAbsences: absences.filter(a => a.type === 'unmotivated').length
    };
}

async function handleTeacherDashboard(req, res, userData) {
    try {
        const School = require('./models/School');
        const schoolId = req.session.schoolId;
        const teacherId = req.session.userId;

        let assignedClasses = [];
        let classmasterClasses = [];
        
        if (schoolId) {
            const schoolData = await School.findById(schoolId);
            if (schoolData && schoolData.classYearTeachers) {
                for (const [classYear, teacherIds] of Object.entries(schoolData.classYearTeachers)) {
                    if (teacherIds.includes(teacherId)) {
                        assignedClasses.push(classYear);
                    }
                }
            }
            
            assignedClasses = [...new Set(assignedClasses)];
            classmasterClasses = await School.getClassesByClassmaster(schoolId, teacherId);
        }
        
        res.render('dashboard-teacher', { 
            user: userData,
            assignedClasses: assignedClasses,
            classmasterClasses: classmasterClasses
        });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.render('dashboard-teacher', { 
            user: userData,
            assignedClasses: [],
            classmasterClasses: []
        });
    }
}

async function handleStudentDashboard(req, res, userData) {
    try {
        const User = require('./models/User');
        const studentId = req.session.userId;
        const schoolId = req.session.schoolId;
        
        const allGrades = await User.getStudentGrades(studentId);
        const allAbsences = await User.getStudentAbsences(studentId);
        const studentInfo = await User.findbyId(studentId);
        
        const gradesBySubject = groupGradesBySubject(allGrades);
        const availableSubjects = await getAvailableSubjects(schoolId, studentInfo?.classYear);
        const subjects = createSubjectList(availableSubjects, gradesBySubject);
        const absencesBySubject = groupAbsencesBySubject(allAbsences);
        const stats = calculateStats(allGrades, allAbsences, subjects);
        
            const { generateStudentFeedback } = require('./utils/feedbackGenerator');
            const feedback = generateStudentFeedback(stats, subjects, absencesBySubject);
            
            res.render('dashboard-student', { 
                user: userData,
                subjects: subjects,
                absencesBySubject: absencesBySubject,
                stats: stats,
                feedback: feedback
            });
        } catch (error) {
            console.error('Error fetching student grades:', error);
            res.render('dashboard-student', { 
                user: userData,
                subjects: [],
                absencesBySubject: {},
                stats: {
                    totalSubjects: 0,
                    totalGrades: 0,
                    overallAverage: 0,
                    totalAbsences: 0,
                    motivatedAbsences: 0,
                    unmotivatedAbsences: 0
                }
            });
        }
}

async function processStudentData(student) {
    const User = require('./models/User');
    
    const allGrades = await User.getStudentGrades(student.uid);
    const allAbsences = await User.getStudentAbsences(student.uid);
    
    const gradesBySubject = groupGradesBySubject(allGrades);
    const availableSubjects = await getAvailableSubjects(student.schoolId, student.classYear);
    const subjects = createSubjectList(availableSubjects, gradesBySubject);
    const absencesBySubject = groupAbsencesBySubject(allAbsences);
    const stats = calculateStats(allGrades, allAbsences, subjects);
    
    const { generateStudentFeedback } = require('./utils/feedbackGenerator');
    const feedback = generateStudentFeedback(stats, subjects, absencesBySubject);
    
    return {
        ...student,
        subjects: subjects,
        absencesBySubject: absencesBySubject,
        stats: stats,
        feedback: feedback
    };
}

async function handleParentDashboard(req, res, userData) {
    try {
            const User = require('./models/User'); 
            const parentId = req.session.userId; 

            const students = await User.getStudentByParentId(parentId); 
        const studentsWithData = await Promise.all(students.map(processStudentData));
        
        res.render('dashboard-parent', { 
            user: userData,
            students: studentsWithData
        });
    } catch (error) {
        console.error('Error fetching parent dashboard:', error);
        res.render('dashboard-parent', { 
            user: userData,
            students: []
        });
    }
}

// Helper functions for student detail view
function groupGradesBySubjectWithIds(grades) {
                const gradesBySubject = {}; 

    grades.forEach(gradeEntry => {
                    const subject = gradeEntry.subject || 'General'; 
        if (!gradesBySubject[subject]) {
                        gradesBySubject[subject] = {
                        grades: [],
                        teacherName: gradeEntry.teacherName 
                    }; 
                }
                    gradesBySubject[subject].grades.push({
            id: gradeEntry.id,
                        value: gradeEntry.grade, 
                        date: gradeEntry.createdAt, 
                        teacherName: gradeEntry.teacherName
                    }); 
            });

    return gradesBySubject;
}

function groupAbsencesBySubjectWithIds(absences) {
    const absencesBySubject = {};
    
    absences.forEach(absence => {
        const subject = absence.subject || 'General';
        if (!absencesBySubject[subject]) {
            absencesBySubject[subject] = {
                motivated: [],
                unmotivated: []
            };
        }
        
        const absenceData = {
            id: absence.id,
            date: absence.date,
            teacherName: absence.teacherName
        };
        
        if (absence.type === 'motivated') {
            absenceData.reason = absence.reason;
            absencesBySubject[subject].motivated.push(absenceData);
        } else {
            absencesBySubject[subject].unmotivated.push(absenceData);
        }
    });
    
    return absencesBySubject;
}

function createSubjectListWithFirestoreDates(availableSubjects, gradesBySubject) {
            const subjects = availableSubjects.map(subjectName => {
                const subjectData = gradesBySubject[subjectName]; 

        if (subjectData) {
                    const grades = subjectData.grades.map(g => g.value); 
                    const average = grades.length > 0
                        ? (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(2)
                        : 0; 

            return {
                name: subjectName,
                grades: subjectData.grades.sort((a, b) => {
                    const dateA = a.date?.toDate?.() || new Date(0);
                    const dateB = b.date?.toDate?.() || new Date(0);
                    return dateB - dateA;
                }),
                        average: parseFloat(average), 
                        teacherName: subjectData.teacherName, 
                        gradeCount: grades.length, 
                        hasGrades: true
                    }; 
        }
        
        return {
                        name: subjectName, 
                        grades: [], 
                        average: 0, 
            teacherName: null,
                        gradeCount: 0, 
                        hasGrades: false
                    }; 
    });
    
    return subjects.sort((a, b) => a.name.localeCompare(b.name));
}

async function validateStudentAccess(studentId, schoolId, teacherId) {
    const User = require('./models/User');
    const School = require('./models/School');
    
    const student = await User.findbyId(studentId);
    if (!student || student.schoolId !== schoolId) {
        return { error: 'Student not found', student: null };
    }
    
    const classmasterId = await School.getClassmaster(schoolId, student.classYear);
    const isClassmaster = classmasterId === teacherId;
    
    if (!isClassmaster) {
        return { error: 'Only classmaster can view student details', student: null };
    }
    
    return { error: null, student };
}

// Helper functions for grade management
function buildRedirectUrl(classYear, basePath = '/students') {
    return classYear ? `/class/${classYear}` : basePath;
}

function redirectWithError(res, classYear, message) {
    const redirectUrl = buildRedirectUrl(classYear);
    return res.redirect(redirectUrl + '?error=' + encodeURIComponent(message));
}

function redirectWithSuccess(res, classYear, message) {
    const redirectUrl = buildRedirectUrl(classYear);
    return res.redirect(redirectUrl + '?success=' + encodeURIComponent(message));
}

function validateGradeInput(studentId, grade, subject) {
    if (!studentId || !grade || !subject) {
        return 'Student, grade, and subject are required';
    }
    
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 10) {
        return 'Invalid grade. Must be between 1-10.';
    }
    
    return null;
}

async function validateTeacherSubjectAccess(teacherId, subject) {
    const User = require('./models/User');
    const teacher = await User.findbyId(teacherId);
    
    if (!teacher) {
        return { error: 'Teacher not found', teacher: null };
    }
    
    const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);
    
    if (teacherSubjects.length === 0) {
        return { error: 'No subjects assigned. Contact your administrator.', teacher: null };
    }
    
    if (!teacherSubjects.includes(subject)) {
        return { error: 'You are not assigned to teach this subject.', teacher: null };
    }
    
    return { error: null, teacher };
}

async function validateStudentForGrade(studentId, schoolId) {
    const User = require('./models/User');
    const student = await User.findbyId(studentId);
    
    if (!student) {
        return { error: 'Student not found', student: null };
    }
    
    if (student.schoolId !== schoolId) {
        return { error: 'Cannot add grade for student from different school', student: null };
    }
    
    return { error: null, student };
}

// Helper functions for bulk grade operations
function parseGradesData(grades) {
    if (typeof grades === 'string') {
        try {
            return JSON.parse(grades);
        } catch (error) {
            return null;
        }
    }
    return grades;
}

function validateBulkGradeInput(grades, subject, date) {
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
        return 'No grades provided';
    }
    
    if (!subject) {
        return 'Subject is required';
    }
    
    if (!date) {
        return 'Date is required';
    }
    
    return null;
}

async function processBulkGrade(gradeData, subject, date, teacherId, teacherName, schoolId) {
    const User = require('./models/User');
    const { studentId, grade } = gradeData;

    if (!studentId || !grade) {
        return { success: false, studentId, error: 'Missing data' };
    }

    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 10) {
        return { success: false, studentId, error: 'Invalid grade' };
    }

    try {
        const { error: studentError, student } = await validateStudentForGrade(studentId, schoolId);
        if (studentError) {
            return { success: false, studentId, error: studentError === 'Student not found' ? 'Student not found' : 'Different school' };
        }

        await User.addGrade({
            studentId: studentId,
            studentName: student.name,
            grade: gradeNum,
            teacherId: teacherId,
            teacherName: teacherName,
            subject: subject,
            date: date
        });

        return { success: true, studentId, studentName: student.name, grade: gradeNum };
    } catch (error) {
        console.error(`Error adding grade for student ${studentId}:`, error);
        return { success: false, studentId, error: error.message };
    }
}

function formatBulkGradeResponse(results) {
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    if (successCount > 0) {
        const message = errorCount > 0 
            ? `Successfully added ${successCount} grade(s). ${errorCount} failed.`
            : `Successfully added ${successCount} grade(s).`;
        return { success: true, message, successCount, errorCount, results };
    }
    
    return { success: false, error: 'Failed to add grades. Please try again.', results };
}

// Helper functions for bulk absence operations
function parseAbsencesData(absences) {
    if (typeof absences === 'string') {
        try {
            return JSON.parse(absences);
        } catch (error) {
            return null;
        }
    }
    return absences;
}

function validateBulkAbsenceInput(absences, subject, date) {
    if (!absences || !Array.isArray(absences) || absences.length === 0) {
        return 'No absences provided';
    }
    
    if (!subject) {
        return 'Subject is required';
    }
    
    if (!date) {
        return 'Date is required';
    }
    
    return null;
}

async function processBulkAbsence(absenceData, subject, date, teacherId, teacherName, schoolId) {
    const User = require('./models/User');
    const { studentId, type = 'unmotivated', reason = '' } = absenceData;

    if (!studentId) {
        return { success: false, studentId, error: 'Missing student ID' };
    }

    try {
        const { error: studentError, student } = await validateStudentForGrade(studentId, schoolId);
        if (studentError) {
            return { success: false, studentId, error: studentError === 'Student not found' ? 'Student not found' : 'Different school' };
        }

        // Parse and validate date
        const absenceDate = new Date(date);
        if (isNaN(absenceDate.getTime())) {
            return { success: false, studentId, error: 'Invalid date' };
        }

        await User.addAbsence({
            studentId: studentId,
            studentName: student.name,
            teacherId: teacherId,
            teacherName: teacherName,
            subject: subject,
            date: absenceDate,
            type: type,
            reason: reason
        });

        return { success: true, studentId, studentName: student.name };
    } catch (error) {
        console.error(`Error adding absence for student ${studentId}:`, error);
        return { success: false, studentId, error: error.message };
    }
}

function formatBulkAbsenceResponse(results) {
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;

    if (successCount > 0) {
        const message = errorCount > 0 
            ? `Successfully recorded ${successCount} absence(s). ${errorCount} failed.`
            : `Successfully recorded ${successCount} absence(s).`;
        return { success: true, message, successCount, errorCount, results };
    }
    
    return { success: false, error: 'Failed to record absences. Please try again.', results };
}

// Helper functions for grade editing
function buildEditRedirectUrl(studentId, classYear) {
    if (studentId) {
        return `/student/${studentId}`;
    }
    if (classYear) {
        return `/class/${classYear}`;
    }
    return '/students';
}

function redirectEditWithError(res, studentId, classYear, message) {
    const redirectUrl = buildEditRedirectUrl(studentId, classYear);
    return res.redirect(redirectUrl + '?error=' + encodeURIComponent(message));
}

function redirectEditWithSuccess(res, studentId, classYear, message) {
    const redirectUrl = buildEditRedirectUrl(studentId, classYear);
    return res.redirect(redirectUrl + '?success=' + encodeURIComponent(message));
}

function validateEditGradeInput(gradeId, grade, subject) {
    if (!gradeId || !grade || !subject) {
        return 'Grade ID, grade value, and subject are required';
    }
    
    const gradeNum = parseInt(grade);
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 10) {
        return 'Invalid grade. Must be between 1-10.';
    }
    
    return null;
}

async function getGradeDocument(gradeId) {
    const { db } = require('./config/firebase');
    const gradeRef = db.collection('grades').doc(gradeId);
    const gradeDoc = await gradeRef.get();
    
    if (!gradeDoc.exists) {
        return { error: 'Grade not found', grade: null };
    }
    
    return { error: null, grade: gradeDoc.data() };
}

async function validateGradeAccess(gradeData, schoolId) {
    const User = require('./models/User');
    const student = await User.findbyId(gradeData.studentId);
    
    if (!student || student.schoolId !== schoolId) {
        return { error: 'Invalid grade or access denied', student: null };
    }
    
    return { error: null, student };
}

async function validateGradeEditAuthorization(teacherId, gradeSubject) {
    const User = require('./models/User');
    const teacher = await User.findbyId(teacherId);
    const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);
    
    if (!teacherSubjects.includes(gradeSubject)) {
        return 'You are not authorized to edit this grade. You can only edit grades for subjects you teach.';
    }
    
    return null;
}

async function validateGradeDeleteAuthorization(teacherId, gradeSubject) {
    const User = require('./models/User');
    const teacher = await User.findbyId(teacherId);
    const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);
    
    if (!teacherSubjects.includes(gradeSubject)) {
        return 'You are not authorized to delete this grade. You can only delete grades for subjects you teach.';
    }
    
    return null;
}

// Helper functions for absence motivation
function buildMotivateRedirectUrl(classYear) {
    return classYear ? `/class/${classYear}` : '/dashboard';
}

function redirectMotivateWithError(res, classYear, message) {
    const redirectUrl = buildMotivateRedirectUrl(classYear);
    return res.redirect(redirectUrl + '?error=' + encodeURIComponent(message));
}

function redirectMotivateWithSuccess(res, classYear, message) {
    const redirectUrl = buildMotivateRedirectUrl(classYear);
    return res.redirect(redirectUrl + '?success=' + encodeURIComponent(message));
}

async function getAbsenceDocument(absenceId) {
    const { db } = require('./config/firebase');
    const absenceRef = db.collection('absences').doc(absenceId);
    const absenceDoc = await absenceRef.get();
    
    if (!absenceDoc.exists) {
        return { error: 'Absence not found', absence: null, absenceRef: null };
    }
    
    return { error: null, absence: absenceDoc.data(), absenceRef };
}

async function validateAbsenceAccess(absence, schoolId) {
    const User = require('./models/User');
    const student = await User.findbyId(absence.studentId);
    
    if (!student || student.schoolId !== schoolId) {
        return { error: 'Invalid absence', student: null };
    }
    
    return { error: null, student };
}

async function validateClassmasterAuthorization(schoolId, classYear, teacherId) {
    const School = require('./models/School');
    const classmasterId = await School.getClassmaster(schoolId, classYear);
    
    if (classmasterId !== teacherId) {
        return 'Only the classmaster can motivate absences';
    }
    
    return null;
}

app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }

    if (req.session.userRole === 'school_admin') {
        return res.redirect('/admin/dashboard');
    }

    const userData = createUserData(req.session);
    const role = req.session.userRole;

    if (role === 'teacher') {
        return handleTeacherDashboard(req, res, userData);
    }
    
    if (role === 'student') {
        return handleStudentDashboard(req, res, userData);
    }
    
    if (role === 'parent') {
        return handleParentDashboard(req, res, userData);
    }
    
    res.render('dashboard', { user: userData });
});

app.get('/class/:classYear', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }

    if (req.session.userRole !== 'teacher') {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
    }

    try {
        const User = require('./models/User');
        const School = require('./models/School');
        const classYear = req.params.classYear;
        const schoolId = req.session.schoolId;
        const teacherId = req.session.userId;
        const viewMode = req.query.view; // 'classmaster' or 'teacher'

        // Verify teacher is assigned to this class
        const schoolData = await School.findById(schoolId);
        const classTeachers = schoolData?.classYearTeachers?.[classYear] || [];
        
        if (!classTeachers.includes(teacherId)) {
            return res.redirect('/dashboard?error=' + encodeURIComponent('You are not assigned to this class'));
        }

        // Check if teacher is classmaster
        const classmasterId = await School.getClassmaster(schoolId, classYear);
        const isClassmaster = classmasterId === teacherId;
        
        const teacher = await User.findbyId(teacherId);
        // Get all students in this class year from the same school
        const allStudents = await User.getUserByRoleAndSchool('student', schoolId);
        const studentsInClass = allStudents.filter(student => student.classYear === classYear);

        // Determine which view to show based on query parameter
        // If view=classmaster is explicitly requested and teacher is classmaster, show classmaster view
        // If view=teacher is requested, show regular teacher view (even if they're classmaster)
        // If no view parameter, default to classmaster view if they're classmaster
        const showClassmasterView = (viewMode === 'classmaster' && isClassmaster) || 
                                   (viewMode !== 'teacher' && isClassmaster);

        if (showClassmasterView) {
            // Get students with summary stats for card view
            const studentsWithStats = await Promise.all(studentsInClass.map(async (student) => {
                const allGrades = await User.getStudentGrades(student.uid);
                const allAbsences = await User.getStudentAbsences(student.uid);
                
                // Calculate stats
                const totalGrades = allGrades.length;
                const overallAverage = totalGrades > 0
                    ? (allGrades.reduce((sum, g) => sum + g.grade, 0) / totalGrades).toFixed(2)
                    : 0;
                
                const unmotivatedAbsences = allAbsences.filter(a => a.type === 'unmotivated').length;
                const motivatedAbsences = allAbsences.filter(a => a.type === 'motivated').length;
                
                return {
                    ...student,
                    stats: {
                        totalGrades: totalGrades,
                        overallAverage: parseFloat(overallAverage),
                        totalAbsences: allAbsences.length,
                        unmotivatedAbsences: unmotivatedAbsences,
                        motivatedAbsences: motivatedAbsences
                    }
                };
            }));

            return res.render('classmaster-students', {
                user: {
                    name: req.session.userName,
                    email: req.session.userEmail,
                    role: req.session.userRole
                },
                teacher: teacher,
                classYear: classYear,
                students: studentsWithStats,
                isClassmaster: true,
                error: req.query.error || null,
                success: req.query.success || null
            });
        }

        // Regular teacher view (existing table view)
        let studentsWithData = studentsInClass;
        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);

        res.render('class-detail', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            teacher: teacher, 
            classYear: classYear,
            students: studentsWithData,
            isClassmaster: false, // Set to false when viewing as regular teacher
            teacherSubjects: teacherSubjects,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Error fetching class data:', error);
        res.redirect('/dashboard?error=' + encodeURIComponent('Failed to load class data'));
    }
});

app.get('/student/:studentId', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }

    if (req.session.userRole !== 'teacher') {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
    }

    try {
        const User = require('./models/User');
        const studentId = req.params.studentId;
        const schoolId = req.session.schoolId;
        const teacherId = req.session.userId;

        // Validate student access and classmaster permissions
        const { error: accessError, student } = await validateStudentAccess(studentId, schoolId, teacherId);
        if (accessError) {
            return res.redirect('/dashboard?error=' + encodeURIComponent(accessError));
        }

        // Get all grades and absences
        const allGrades = await User.getStudentGrades(studentId);
        const allAbsences = await User.getStudentAbsences(studentId);

        // Process data using helper functions
        const gradesBySubject = groupGradesBySubjectWithIds(allGrades);
        const availableSubjects = await getAvailableSubjects(schoolId, student.classYear);
        const subjects = createSubjectListWithFirestoreDates(availableSubjects, gradesBySubject);
        const absencesBySubject = groupAbsencesBySubjectWithIds(allAbsences);
        const stats = calculateStats(allGrades, allAbsences, subjects);

        // Generate feedback
        const { generateStudentFeedback } = require('./utils/feedbackGenerator');
        const feedback = generateStudentFeedback(stats, subjects, absencesBySubject);

        // Get teacher's subjects to restrict edit/delete to their own subjects
        const teacher = await User.findbyId(teacherId);
        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);

        res.render('student-detail', {
            user: createUserData(req.session),
            student: student,
            subjects: subjects,
            absencesBySubject: absencesBySubject,
            stats: stats,
            feedback: feedback,
            classYear: student.classYear,
            teacherSubjects: teacherSubjects,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Error fetching student data:', error);
        res.redirect('/dashboard?error=' + encodeURIComponent('Failed to load student data'));
    }
});

app.get('/students', (req, res) =>{


    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }


    if (req.session.userRole !== 'teacher') {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
    }


    const User = require('./models/User');
    const schoolId = req.session.schoolId;

    const getStudentsPromise = schoolId 
        ? User.getUserByRoleAndSchool('student', schoolId)
        : User.getUserByRole('student');

    getStudentsPromise
        .then(students => {
            res.render('students', {
                user: {
                    name: req.session.userName,
                    email: req.session.userEmail,
                    role: req.session.userRole
                },
                students: students,
                error: req.query.error || null,
                success: req.query.success || null
            });
        })
        .catch(error => {
            console.error('Error fetching students:', error);
            res.redirect('/dashboard?error=' + encodeURIComponent('Failed to load students'));
        });
});


app.post('/add-grade', async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }

        if (req.session.userRole !== 'teacher') {
            return res.redirect('/students?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { studentId, grade, classYear, subject, date } = req.body; 

        // Validate input
        const inputError = validateGradeInput(studentId, grade, subject);
        if (inputError) {
            return redirectWithError(res, classYear, inputError);
        }

        const gradeNum = parseInt(grade);

        // Validate teacher subject access
        const { error: teacherError } = await validateTeacherSubjectAccess(req.session.userId, subject);
        if (teacherError) {
            return redirectWithError(res, classYear, teacherError);
        }

        // Validate student
        const { error: studentError, student } = await validateStudentForGrade(studentId, req.session.schoolId);
        if (studentError) {
            return redirectWithError(res, classYear, studentError);
        }

        // Add grade
        const User = require('./models/User');
        await User.addGrade({
            studentId: studentId,
            studentName: student.name, 
            grade: gradeNum, 
            teacherId: req.session.userId, 
            teacherName: req.session.userName, 
            subject: subject,
            date: date || undefined
        });

        return redirectWithSuccess(res, classYear, `Grade ${gradeNum} added for ${student.name} in ${subject}`);
    } catch (error) {
        console.error('Error adding grade:', error);
        return redirectWithError(res, req.body.classYear, 'Failed to add grade. Please try again.');
    }
}); 

// Bulk add grades endpoint - optimized with parallel operations and JSON response
app.post('/add-grades-bulk', async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.json({ success: false, error: 'Not authenticated' });
        }

        if (req.session.userRole !== 'teacher') {
            return res.json({ success: false, error: 'Access denied. Teachers only.' });
        }

        let { grades, subject, date } = req.body;

        // Parse grades data
        grades = parseGradesData(grades);
        if (!grades) {
                return res.json({ success: false, error: 'Invalid grades data format' });
        }

        // Validate input
        const inputError = validateBulkGradeInput(grades, subject, date);
        if (inputError) {
            return res.json({ success: false, error: inputError });
        }

        // Validate teacher subject access
        const { error: teacherError } = await validateTeacherSubjectAccess(req.session.userId, subject);
        if (teacherError) {
            return res.json({ success: false, error: teacherError });
        }

        // Process all grades in parallel
        const results = await Promise.all(
            grades.map(gradeData => 
                processBulkGrade(
                    gradeData, 
                    subject, 
                    date, 
                    req.session.userId, 
                    req.session.userName, 
                    req.session.schoolId
                )
            )
        );

        // Format and send response
        const response = formatBulkGradeResponse(results);
        return res.json(response);
    } catch (error) {
        console.error('Error adding grades in bulk:', error);
        return res.json({ success: false, error: 'Failed to add grades. Please try again.' });
    }
});

app.post('/edit-grade', async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.redirect('/auth/login'); 
        }

        if (req.session.userRole !== 'teacher') {
            return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { gradeId, grade, subject, studentId, classYear } = req.body;

        // Validate input
        const inputError = validateEditGradeInput(gradeId, grade, subject);
        if (inputError) {
            return redirectEditWithError(res, studentId, classYear, inputError);
        }

        const gradeNum = parseInt(grade); 

        // Get and validate grade document
        const { error: gradeError, grade: existingGrade } = await getGradeDocument(gradeId);
        if (gradeError) {
            return redirectEditWithError(res, studentId, classYear, gradeError);
        }

        // Validate student access
        const { error: accessError, student } = await validateGradeAccess(existingGrade, req.session.schoolId);
        if (accessError) {
            return redirectEditWithError(res, studentId, classYear, accessError);
        }

        // Validate authorization
        const authError = await validateGradeEditAuthorization(req.session.userId, existingGrade.subject);
        if (authError) {
            return redirectEditWithError(res, studentId, classYear, authError);
        }

        // Update the grade
        const User = require('./models/User');
        await User.updateGrade(gradeId, {
            grade: gradeNum,
            subject: subject,
            teacherId: req.session.userId,
            teacherName: req.session.userName
        });

        return redirectEditWithSuccess(res, studentId, classYear, `Grade updated to ${gradeNum} for ${student.name} in ${subject}`);
    } catch (error) {
        console.error('Error editing grade:', error);
        return redirectEditWithError(res, req.body.studentId, req.body.classYear, 'Failed to edit grade. Please try again.');
    }
}); 



app.post('/delete-grade', async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }

        if (req.session.userRole !== 'teacher') {
            return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { gradeId, studentId, classYear } = req.body;

        // Validate input
        if (!gradeId) {
            return redirectEditWithError(res, studentId, classYear, 'Grade ID is required');
        }

        // Get and validate grade document
        const { error: gradeError, grade: existingGrade } = await getGradeDocument(gradeId);
        if (gradeError) {
            return redirectEditWithError(res, studentId, classYear, gradeError);
        }

        // Validate student access
        const { error: accessError, student } = await validateGradeAccess(existingGrade, req.session.schoolId);
        if (accessError) {
            return redirectEditWithError(res, studentId, classYear, accessError);
        }

        // Validate authorization
        const authError = await validateGradeDeleteAuthorization(req.session.userId, existingGrade.subject);
        if (authError) {
            return redirectEditWithError(res, studentId, classYear, authError);
        }

        // Delete the grade
        const User = require('./models/User');
        await User.deleteGrade(gradeId); 

        return redirectEditWithSuccess(res, studentId, classYear, `Grade deleted for ${student.name}`);
    } catch (error) {
        console.error('Error deleting grade:', error);
        return redirectEditWithError(res, req.body.studentId, req.body.classYear, 'Failed to delete grade. Please try again.');
    }
}); 

app.post('/add-absence', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ success: false, error: 'Not authenticated' });
        }

        if (req.session.userRole !== 'teacher') {
            return res.json({ success: false, error: 'Access denied. Teachers only.' });
        }

        const { studentId, date, type, reason, classYear, subject } = req.body; 

        if (!studentId || !date || !type || !subject) {
            return res.json({ success: false, error: 'Student, date, type, and subject are required' });
        }

        if (type !== 'motivated' && type !== 'unmotivated') {
            return res.json({ success: false, error: 'Invalid absence type' });
        }

        const User = require('./models/User'); 
        
        // Get teacher's subjects
        const teacher = await User.findbyId(req.session.userId); 
        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);

        if (!teacher || teacherSubjects.length === 0) {
            return res.json({ success: false, error: 'No subjects assigned. Contact your administrator.' });
        }

        // Verify teacher teaches this subject
        if (!teacherSubjects.includes(subject)) {
            return res.json({ success: false, error: 'You are not assigned to teach this subject.' });
        }

        // Verify student exists and is in the same school
        const student = await User.findbyId(studentId); 

        if (!student) {
            return res.json({ success: false, error: 'Student not found' });
        }

        if (student.schoolId !== req.session.schoolId) {
            return res.json({ success: false, error: 'Cannot add absence for student from different school' });
        }

        // Parse date
        const absenceDate = new Date(date);
        if (isNaN(absenceDate.getTime())) {
            return res.json({ success: false, error: 'Invalid date format' });
        }

        // Add absence
        await User.addAbsence({
            studentId: studentId,
            studentName: student.name, 
            teacherId: req.session.userId, 
            teacherName: req.session.userName, 
            subject: subject,
            date: absenceDate,
            type: type,
            reason: reason || ''
        });

        const typeLabel = type === 'motivated' ? 'Motivated' : 'Unmotivated';
        res.json({ 
            success: true, 
            message: `${typeLabel} absence recorded for ${student.name} on ${date} in ${subject}`,
            studentId,
            studentName: student.name,
            date
        });

    } catch(error) {
        console.error('Error adding absence:', error);
        res.json({ success: false, error: 'Failed to add absence. Please try again.' });
    }
});

// Bulk add absences endpoint
app.post('/add-absences-bulk', async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.json({ success: false, error: 'Not authenticated' });
        }

        if (req.session.userRole !== 'teacher') {
            return res.json({ success: false, error: 'Access denied. Teachers only.' });
        }

        let { absences, subject, date } = req.body;

        // Parse absences data
        absences = parseAbsencesData(absences);
        if (!absences) {
                return res.json({ success: false, error: 'Invalid absences data format' });
        }

        // Validate input
        const inputError = validateBulkAbsenceInput(absences, subject, date);
        if (inputError) {
            return res.json({ success: false, error: inputError });
        }

        // Validate teacher subject access
        const { error: teacherError } = await validateTeacherSubjectAccess(req.session.userId, subject);
        if (teacherError) {
            return res.json({ success: false, error: teacherError });
        }

        // Process all absences in parallel
        const results = await Promise.all(
            absences.map(absenceData => 
                processBulkAbsence(
                    absenceData, 
                    subject, 
                    date, 
                    req.session.userId, 
                    req.session.userName, 
                    req.session.schoolId
                )
            )
        );

        // Format and send response
        const response = formatBulkAbsenceResponse(results);
        return res.json(response);
    } catch (error) {
        console.error('Error adding absences in bulk:', error);
        return res.json({ success: false, error: 'Failed to record absences. Please try again.' });
    }
});

app.post('/motivate-absence', async (req, res) => {
    try {
        // Check authentication
        if (!req.session.userId) {
            return res.redirect('/auth/login');
        }

        if (req.session.userRole !== 'teacher') {
            return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { absenceId, classYear } = req.body;
        const schoolId = req.session.schoolId;
        const teacherId = req.session.userId;

        // Validate input
        if (!absenceId) {
            return redirectMotivateWithError(res, classYear, 'Absence ID is required');
        }

        // Get and validate absence document
        const { error: absenceError, absence, absenceRef } = await getAbsenceDocument(absenceId);
        if (absenceError) {
            return redirectMotivateWithError(res, classYear, absenceError);
        }

        // Validate student access
        const { error: accessError, student } = await validateAbsenceAccess(absence, schoolId);
        if (accessError) {
            return redirectMotivateWithError(res, classYear, accessError);
        }

        // Validate classmaster authorization
        const authError = await validateClassmasterAuthorization(schoolId, student.classYear, teacherId);
        if (authError) {
            return redirectMotivateWithError(res, classYear, authError);
        }

        // Update absence to motivated
        await absenceRef.update({
            type: 'motivated',
            motivatedBy: teacherId,
            motivatedAt: new Date()
        });

        return redirectMotivateWithSuccess(res, classYear, `Absence motivated for ${absence.studentName}`);
    } catch (error) {
        console.error('Error motivating absence:', error);
        return redirectMotivateWithError(res, req.body.classYear, 'Failed to motivate absence. Please try again.');
    }
});



app.post('/api/reset-database', async (req, res) => {
    
    try {
        const { secret } = req.body;
        const SECRET_KEY = process.env.RESET_SECRET || 'DELETE_MY_DATA_2025';
        
        if (secret !== SECRET_KEY) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid secret key' 
            });
        }

        const User = require('./models/User');
        const { db } = require('./config/firebase');

        const usersSnapshot = await db.collection('users').get();
        const userDeletePromises = usersSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(userDeletePromises);

        const schoolsSnapshot = await db.collection('schools').get();
        const schoolDeletePromises = schoolsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(schoolDeletePromises);

        const gradesSnapshot = await db.collection('grades').get();
        const gradeDeletePromises = gradesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(gradeDeletePromises);

        const absencesSnapshot = await db.collection('absences').get();
        const absenceDeletePromises = absencesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(absenceDeletePromises);

        const { auth } = require('./config/firebase');
        const listUsersResult = await auth.listUsers();
        const authDeletePromises = listUsersResult.users.map(user => 
            auth.deleteUser(user.uid)
        );
        await Promise.all(authDeletePromises);
        
        res.json({ 
            success: true, 
            message: 'All data deleted successfully',
            deleted: {
                users: usersSnapshot.size,
                schools: schoolsSnapshot.size,
                grades: gradesSnapshot.size,
                absences: absencesSnapshot.size,
                authUsers: listUsersResult.users.length
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete data', 
            error: error.message 
        });
    }
});

// Cleanup expired OTP codes periodically (every hour)
const OTP = require('./models/OTP');
setInterval(async () => {
    try {
        const cleaned = await OTP.cleanupExpired();
        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired OTP codes`);
        }
    } catch (error) {
        console.error('OTP cleanup error:', error);
    }
}, 60 * 60 * 1000); // Every hour

// Start automated backup scheduler (if enabled)
if (process.env.ENABLE_AUTO_BACKUP === 'true') {
    const backupScheduler = require('./services/backupScheduler');
    backupScheduler.start();
} else {
    console.log('ℹ  Automated backups disabled. Set ENABLE_AUTO_BACKUP=true to enable.');
    console.log('   You can still run manual backups with: npm run backup:now');
}

if (require.main === module) {
    // Running directly (local development)
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;

