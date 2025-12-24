const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase - fail fast if it doesn't work
try {
    require('./config/firebase');
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('CRITICAL: Failed to initialize Firebase');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    // In serverless, we want to fail fast - the app won't work without Firebase
    throw error;
}

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
const { validateHeaderName } = require('http');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

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

    const userData = {
        name: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
    };

    if (req.session.userRole === 'teacher') {
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
    } else if (req.session.userRole === 'student') {
        try {
            const User = require('./models/User');
            const School = require('./models/School');
            const studentId = req.session.userId;
            const schoolId = req.session.schoolId;
            
            const allGrades = await User.getStudentGrades(studentId);
            const allAbsences = await User.getStudentAbsences(studentId);
            
            const gradesBySubject = {};
            
            allGrades.forEach(gradeEntry => {
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
            
            
            // Get student's class year
            const studentInfo = await User.findbyId(studentId);
            const studentClassYear = studentInfo?.classYear;
            
            // Get subjects taught by teachers assigned to student's class
            let availableSubjects = [];
            
            if (schoolId && studentClassYear) {
                // Get school data to find teachers assigned to this class
                const schoolData = await School.findById(schoolId);
                const classTeachers = schoolData?.classYearTeachers?.[studentClassYear] || [];
                
                // Collect subjects from all teachers assigned to this class
                const teacherSubjectsSet = new Set();
                for (const teacherId of classTeachers) {
                    const teacher = await User.findbyId(teacherId);
                    if (teacher) {
                        // Support both old single subject and new multiple subjects
                        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);
                        teacherSubjects.forEach(subj => teacherSubjectsSet.add(subj));
                    }
                }
                availableSubjects = Array.from(teacherSubjectsSet);
            } else {
                // Fallback: if no class year, show all school subjects
                availableSubjects = schoolId ? await School.getSubjects(schoolId) : [];
            }
            
            // Create subject list with only subjects taught in this class
            const subjects = availableSubjects.map(subjectName => {
                const subjectData = gradesBySubject[subjectName];
                
                if (subjectData) {
                    // Subject has grades
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
                } else {
                    // Subject has no grades yet but is taught in this class
                    return {
                        name: subjectName,
                        grades: [],
                        average: 0,
                        teacherName: null,
                        gradeCount: 0,
                        hasGrades: false
                    };
                }
            });
            
            // Sort subjects by name
            subjects.sort((a, b) => a.name.localeCompare(b.name));
            
            // Process absences by subject
            const absencesBySubject = {};
            allAbsences.forEach(absence => {
                const subject = absence.subject || 'General';
                if (!absencesBySubject[subject]) {
                    absencesBySubject[subject] = {
                        motivated: [],
                        unmotivated: []
                    };
                }
                if (absence.type === 'motivated') {
                    absencesBySubject[subject].motivated.push({
                        date: absence.date,
                        reason: absence.reason,
                        teacherName: absence.teacherName
                    });
                } else {
                    absencesBySubject[subject].unmotivated.push({
                        date: absence.date,
                        teacherName: absence.teacherName
                    });
                }
            });
            
            // Calculate overall statistics (only from subjects with grades)
            const totalGrades = allGrades.length;
            const overallAverage = totalGrades > 0
                ? (allGrades.reduce((sum, g) => sum + g.grade, 0) / totalGrades).toFixed(2)
                : 0;
            
            const stats = {
                totalSubjects: subjects.filter(s => s.hasGrades).length,
                totalGrades: totalGrades,
                overallAverage: parseFloat(overallAverage),
                totalAbsences: allAbsences.length,
                motivatedAbsences: allAbsences.filter(a => a.type === 'motivated').length,
                unmotivatedAbsences: allAbsences.filter(a => a.type === 'unmotivated').length
            };

            // Generate feedback using decision tree
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
    } else if(req.session.userRole === 'parent'){

        try{

            const User = require('./models/User'); 
            const School = require('./models/School'); 
            const parentId = req.session.userId; 

            const students = await User.getStudentByParentId(parentId); 

            const studentsWithData = await Promise.all(students.map(async (student) =>{
                const allGrades = await User.getStudentGrades(student.uid); 
                const allAbsences = await User.getStudentAbsences(student.uid); 

                const gradesBySubject = {}; 

                allGrades.forEach(gradeEntry => {
                    const subject = gradeEntry.subject || 'General'; 

                    if(!gradesBySubject[subject]){
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


            let availableSubjects = []; 
            if (student.schoolId && student.classYear){
                const schoolData = await School.findById(student.schoolId);
                const classTeachers = schoolData?.classYearTeachers?.[student.classYear] || []; 

                const teacherSubjectsSet = new Set(); 

                for(const teacherId of classTeachers) {
                    const teacher = await User.findbyId(teacherId); 
                    if(teacher){
                        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []); 
                        teacherSubjects.forEach(subj => teacherSubjectsSet.add(subj)); 
                    }
                }
                availableSubjects = Array.from(teacherSubjectsSet); 
            } else{
                availableSubjects = student.schoolId? await School.getSubjects(student.schoolId) : []; 
            }



            const subjects = availableSubjects.map(subjectName => {
                const subjectData = gradesBySubject[subjectName]; 

                if (subjectData){
                    const grades = subjectData.grades.map(g => g.value); 
                    const average = grades.length > 0
                        ? (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(2)
                        : 0; 

                    return{
                        name:subjectName, 
                        grades: subjectData.grades.sort((a,b) => b.date - a.date), 
                        average: parseFloat(average), 
                        teacherName: subjectData.teacherName, 
                        gradeCount: grades.length, 
                        hasGrades: true
                    }; 
                }else{
                    return{
                        name: subjectName, 
                        grades: [], 
                        average: 0, 
                        teacherName:null, 
                        gradeCount: 0, 
                        hasGrades: false
                    }; 
                }
            });

            subjects.sort((a, b) => a.name.localeCompare(b.name));

            const absencesBySubject = {};
            allAbsences.forEach(absence => {
                const subject = absence.subject || 'General';
                if (!absencesBySubject[subject]) {
                    absencesBySubject[subject] = {
                        motivated: [],
                        unmotivated: []
                    };
                }
                if (absence.type === 'motivated') {
                    absencesBySubject[subject].motivated.push({
                        date: absence.date,
                        reason: absence.reason,
                        teacherName: absence.teacherName
                    });
                } else {
                    absencesBySubject[subject].unmotivated.push({
                        date: absence.date,
                        teacherName: absence.teacherName
                    });
                }
            });

            const totalGrades = allGrades.length;
            const overallAverage = totalGrades > 0
                ? (allGrades.reduce((sum, g) => sum + g.grade, 0) / totalGrades).toFixed(2)
                : 0;
            
            const stats = {
                totalSubjects: subjects.filter(s => s.hasGrades).length,
                totalGrades: totalGrades,
                overallAverage: parseFloat(overallAverage),
                totalAbsences: allAbsences.length,
                motivatedAbsences: allAbsences.filter(a => a.type === 'motivated').length,
                unmotivatedAbsences: allAbsences.filter(a => a.type === 'unmotivated').length
            };

            // Generate feedback using decision tree
            const { generateStudentFeedback } = require('./utils/feedbackGenerator');
            const feedback = generateStudentFeedback(stats, subjects, absencesBySubject);
            
            return {
                ...student,
                subjects: subjects,
                absencesBySubject: absencesBySubject,
                stats: stats,
                feedback: feedback
            };
        }));
        
        res.render('dashboard-parent', { 
            user: userData,
            students: studentsWithData
        });


        } catch (error){
            console.error('Error fetching parent dashboard:', error);
            res.render('dashboard-parent', { 
                user: userData,
                students: []
            });
        } 
    } else {
        res.render('dashboard', { user: userData }); 
    }
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

        // If classmaster, get all grades and absences for all students
        let studentsWithData = studentsInClass;
        if (isClassmaster) {
            studentsWithData = await Promise.all(studentsInClass.map(async (student) => {
                const allGrades = await User.getStudentGrades(student.uid);
                const allAbsences = await User.getStudentAbsences(student.uid);
                return {
                    ...student,
                    allGrades: allGrades,
                    allAbsences: allAbsences
                };
            }));
        }

        res.render('class-detail', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            teacher: teacher, 
            classYear: classYear,
            students: studentsWithData,
            isClassmaster: isClassmaster,
            error: req.query.error || null,
            success: req.query.success || null
        });
    } catch (error) {
        console.error('Error fetching class data:', error);
        res.redirect('/dashboard?error=' + encodeURIComponent('Failed to load class data'));
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


app.post('/add-grade', async (req, res) =>{

    try{
        if(!req.session.userId){
            return res.redirect("/auth/login")
        }

        if(req.session.userRole !== 'teacher'){
            return res.redirect('/students?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { studentId, grade, classYear, subject } = req.body; 

        if (!studentId || !grade || !subject){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Student, grade, and subject are required'));
        }

        const gradeNum = parseInt(grade);

        if(isNaN(gradeNum)|| gradeNum < 1 || gradeNum > 10){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Invalid grade. Must be between 1-10.'));
        }

        const User = require('./models/User'); 
        
        // Get teacher's subjects
        const teacher = await User.findbyId(req.session.userId); 

        // Support both old single subject and new multiple subjects
        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);

        if(!teacher || teacherSubjects.length === 0){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('No subjects assigned. Contact your administrator.'));
        }

        // Verify teacher teaches this subject
        if (!teacherSubjects.includes(subject)) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('You are not assigned to teach this subject.'));
        }

        // Verify student exists and is in the same school
        const student = await User.findbyId(studentId); 

        if(!student){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Student not found'));
        }

        if (student.schoolId !== req.session.schoolId) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Cannot add grade for student from different school'));
        }

        // Add grade with selected subject
        await User.addGrade({
            studentId: studentId,
            studentName: student.name, 
            grade: gradeNum, 
            teacherId: req.session.userId, 
            teacherName: req.session.userName, 
            subject: subject
        });

        const redirectUrl = classYear ? `/class/${classYear}` : '/students';
        res.redirect(redirectUrl + '?success=' + encodeURIComponent(`Grade ${gradeNum} added for ${student.name} in ${subject}`));

    } catch(error){
        console.error('Error adding grade:', error);
        const classYear = req.body.classYear;
        const redirectUrl = classYear ? `/class/${classYear}` : '/students';
        res.redirect(redirectUrl + '?error=' + encodeURIComponent('Failed to add grade. Please try again.'));
    }
}); 

app.post('/add-absence', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/auth/login");
        }

        if (req.session.userRole !== 'teacher') {
            return res.redirect('/students?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { studentId, date, type, reason, classYear, subject } = req.body; 

        if (!studentId || !date || !type || !subject) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Student, date, type, and subject are required'));
        }

        if (type !== 'motivated' && type !== 'unmotivated') {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Invalid absence type'));
        }

        const User = require('./models/User'); 
        
        // Get teacher's subjects
        const teacher = await User.findbyId(req.session.userId); 
        const teacherSubjects = teacher.subjects || (teacher.subject ? [teacher.subject] : []);

        if (!teacher || teacherSubjects.length === 0) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('No subjects assigned. Contact your administrator.'));
        }

        // Verify teacher teaches this subject
        if (!teacherSubjects.includes(subject)) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('You are not assigned to teach this subject.'));
        }

        // Verify student exists and is in the same school
        const student = await User.findbyId(studentId); 

        if (!student) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Student not found'));
        }

        if (student.schoolId !== req.session.schoolId) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Cannot add absence for student from different school'));
        }

        // Parse date
        const absenceDate = new Date(date);
        if (isNaN(absenceDate.getTime())) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Invalid date format'));
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
        const redirectUrl = classYear ? `/class/${classYear}` : '/students';
        res.redirect(redirectUrl + '?success=' + encodeURIComponent(`${typeLabel} absence recorded for ${student.name} on ${date} in ${subject}`));

    } catch(error) {
        console.error('Error adding absence:', error);
        const classYear = req.body.classYear;
        const redirectUrl = classYear ? `/class/${classYear}` : '/students';
        res.redirect(redirectUrl + '?error=' + encodeURIComponent('Failed to add absence. Please try again.'));
    }
});

app.post('/motivate-absence', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect("/auth/login");
        }

        if (req.session.userRole !== 'teacher') {
            return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
        }

        const { absenceId, classYear } = req.body;
        const schoolId = req.session.schoolId;
        const teacherId = req.session.userId;

        if (!absenceId) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/dashboard';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Absence ID is required'));
        }

        const School = require('./models/School');
        const User = require('./models/User');
        const { db } = require('./config/firebase');

        // Get the absence
        const absenceRef = db.collection('absences').doc(absenceId);
        const absenceDoc = await absenceRef.get();

        if (!absenceDoc.exists) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/dashboard';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Absence not found'));
        }

        const absence = absenceDoc.data();
        const student = await User.findbyId(absence.studentId);

        if (!student || student.schoolId !== schoolId) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/dashboard';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Invalid absence'));
        }

        // Check if teacher is classmaster of this student's class
        const classmasterId = await School.getClassmaster(schoolId, student.classYear);
        if (classmasterId !== teacherId) {
            const redirectUrl = classYear ? `/class/${classYear}` : '/dashboard';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Only the classmaster can motivate absences'));
        }

        // Update absence to motivated
        await absenceRef.update({
            type: 'motivated',
            motivatedBy: teacherId,
            motivatedAt: new Date()
        });

        const redirectUrl = classYear ? `/class/${classYear}` : '/dashboard';
        res.redirect(redirectUrl + '?success=' + encodeURIComponent(`Absence motivated for ${absence.studentName}`));

    } catch (error) {
        console.error('Error motivating absence:', error);
        const classYear = req.body.classYear;
        const redirectUrl = classYear ? `/class/${classYear}` : '/dashboard';
        res.redirect(redirectUrl + '?error=' + encodeURIComponent('Failed to motivate absence. Please try again.'));
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

if (require.main === module) {
    // Running directly (local development)
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

module.exports = app;

