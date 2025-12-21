const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


require('./config/firebase')

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
            if (schoolId) {
                const schoolData = await School.findById(schoolId);
                if (schoolData && schoolData.classYearTeachers) {
                    for (const [classYear, teacherIds] of Object.entries(schoolData.classYearTeachers)) {
                        if (teacherIds.includes(teacherId)) {
                            assignedClasses.push(classYear);
                        }
                    }
                }
            }
            
            res.render('dashboard-teacher', { 
                user: userData,
                assignedClasses: assignedClasses 
            });
        } catch (error) {
            console.error('Error fetching classes:', error);
            res.render('dashboard-teacher', { 
                user: userData,
                assignedClasses: [] 
            });
        }
    } else if (req.session.userRole === 'student') {
        try {
            const User = require('./models/User');
            const studentId = req.session.userId;
            
            const allGrades = await User.getStudentGrades(studentId);
            
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
            
            // Calculate averages for each subject
            const subjects = Object.keys(gradesBySubject).map(subjectName => {
                const subjectData = gradesBySubject[subjectName];
                const grades = subjectData.grades.map(g => g.value);
                const average = grades.length > 0 
                    ? (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(2)
                    : 0;
                
                return {
                    name: subjectName,
                    grades: subjectData.grades.sort((a, b) => b.date - a.date), // Most recent first
                    average: parseFloat(average),
                    teacherName: subjectData.teacherName,
                    gradeCount: grades.length
                };
            });
            
            // Sort subjects by name
            subjects.sort((a, b) => a.name.localeCompare(b.name));
            
            // Calculate overall statistics
            const totalGrades = allGrades.length;
            const overallAverage = totalGrades > 0
                ? (allGrades.reduce((sum, g) => sum + g.grade, 0) / totalGrades).toFixed(2)
                : 0;
            
            res.render('dashboard-student', { 
                user: userData,
                subjects: subjects,
                stats: {
                    totalSubjects: subjects.length,
                    totalGrades: totalGrades,
                    overallAverage: parseFloat(overallAverage)
                }
            });
        } catch (error) {
            console.error('Error fetching student grades:', error);
            res.render('dashboard-student', { 
                user: userData,
                subjects: [],
                stats: {
                    totalSubjects: 0,
                    totalGrades: 0,
                    overallAverage: 0
                }
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

        
        const teacher = await User.findbyId(teacherId);
        // Get all students in this class year from the same school
        const allStudents = await User.getUserByRoleAndSchool('student', schoolId);
        const studentsInClass = allStudents.filter(student => student.classYear === classYear);

        res.render('class-detail', {
            user: {
                name: req.session.userName,
                email: req.session.userEmail,
                role: req.session.userRole
            },
            teacher: teacher, 
            classYear: classYear,
            students: studentsInClass,
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

        const { studentId, grade, classYear } = req.body; 

        if (!studentId || !grade){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Student and grade are required'));
        }

        const gradeNum = parseInt(grade);

        if(isNaN(gradeNum)|| gradeNum < 1 || gradeNum > 10){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Invalid grade. Must be between 1-10.'));
        }

        const User = require('./models/User'); 
        
        // Get teacher's subject
        const teacher = await User.findbyId(req.session.userId); 

        if(!teacher || !teacher.subject){
            const redirectUrl = classYear ? `/class/${classYear}` : '/students';
            return res.redirect(redirectUrl + '?error=' + encodeURIComponent('Teacher subject not assigned. Contact your administrator.'));
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

        // Add grade with teacher's subject
        await User.addGrade({
            studentId: studentId,
            studentName: student.name, 
            grade: gradeNum, 
            teacherId: req.session.userId, 
            teacherName: req.session.userName, 
            subject: teacher.subject  // Use teacher's assigned subject
        });

        const redirectUrl = classYear ? `/class/${classYear}` : '/students';
        res.redirect(redirectUrl + '?success=' + encodeURIComponent(`Grade ${gradeNum} added for ${student.name} in ${teacher.subject}`));

    } catch(error){
        console.error('Error adding grade:', error);
        const classYear = req.body.classYear;
        const redirectUrl = classYear ? `/class/${classYear}` : '/students';
        res.redirect(redirectUrl + '?error=' + encodeURIComponent('Failed to add grade. Please try again.'));
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

