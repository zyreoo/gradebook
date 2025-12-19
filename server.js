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


// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Home routed
app.get('/', (req, res) => {
    res.redirect('/auth/login');
});

app.get('/dashboard', async (req, res) => {

    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }

    const userData = {
        name: req.session.userName,
        email: req.session.userEmail,
        role: req.session.userRole
    };

    if (req.session.userRole === 'teacher') {
        try {
            const User = require('./models/User');
            const students = await User.getUserByRole('student');
            res.render('dashboard-teacher', { user: userData, students: students });
        } catch (error) {
            console.error('Error fetching students:', error);
            res.render('dashboard-teacher', { user: userData, students: [] });
        }
    } else if (req.session.userRole === 'student') {
        res.render('dashboard-student', { user: userData });
    } else {
        res.render('dashboard', { user: userData }); 
    }
});


app.get('/students', (req, res) =>{


    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }


    if (req.session.userRole !== 'teacher') {
        return res.redirect('/dashboard?error=' + encodeURIComponent('Access denied. Teachers only.'));
    }


    const User = require('./models/User')


    User.getUserByRole('student')
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

        const { studentId, grade, subject } = req.body; 


        if (!studentId || !grade){
            return res.redirect('/students?error='+encodeURIComponent('Student and grade are required'));
        }

        const gradeNum = parseInt(grade);

        if(isNaN(gradeNum)|| gradeNum < 1 || gradeNum > 10){
            return res.redirect('/students?error=' + encodeURIComponent('Invalid grade. Must be between 1-10.'));
        }


        const User = require('./models/User'); 
        const student = await User.findbyId(studentId); 

        if (!student){
            return res.redirect('/students?error='+encodeURIComponent('Student not found')); 
        }
        await User.addGrade({
            studentId: studentId,
            studentName: student.name, 
            grade: gradeNum, 
            teacherId: req.session.userId, 
            teacherName: req.session.userName, 
            subject: subject || 'General'
        });

        res.redirect('/students?success=' + encodeURIComponent(`Grade ${gradeNum} added for ${student.name}`));

    } catch(error){
        res.redirect('/students?error=' + encodeURIComponent('Failed to add grade. Please try again.'));
    }
}); 

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

