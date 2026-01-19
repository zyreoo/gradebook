const School = require('./models/School');
const User = require('./models/User');
require('./config/firebase');

// Single school with 10 teachers all teaching the same class (10A)
const schools = [
    {
        name: 'Principal Smith',
        email: 'admin@highschool.edu', 
        password: 'password123',
        schoolName: 'Central High School',
        adress: '123 Education Street, Springfield, IL 62701',
        classMasters: [
            { class: '10A', teacherEmail: 'maria.popescu@highschool.edu' } // Mathematics teacher is classmaster
        ],
        teachers: [
            { 
                name: 'Maria Popescu', 
                email: 'maria.popescu@highschool.edu', 
                subjects: ['Mathematics'],
                classAssignments: [
                    { class: '10A', subjects: ['Mathematics'] }
                ]
            },
            { 
                name: 'Ion Ionescu', 
                email: 'ion.ionescu@highschool.edu', 
                subjects: ['Physics'],
                classAssignments: [
                    { class: '10A', subjects: ['Physics'] }
                ]
            },
            { 
                name: 'Elena Georgescu', 
                email: 'elena.georgescu@highschool.edu', 
                subjects: ['Chemistry'],
                classAssignments: [
                    { class: '10A', subjects: ['Chemistry'] }
                ]
            },
            { 
                name: 'Alexandru Radu', 
                email: 'alexandru.radu@highschool.edu', 
                subjects: ['Biology'],
                classAssignments: [
                    { class: '10A', subjects: ['Biology'] }
                ]
            },
            { 
                name: 'Ana Dumitrescu', 
                email: 'ana.dumitrescu@highschool.edu', 
                subjects: ['English'],
                classAssignments: [
                    { class: '10A', subjects: ['English'] }
                ]
            },
            { 
                name: 'Mihai Constantinescu', 
                email: 'mihai.constantinescu@highschool.edu', 
                subjects: ['History'],
                classAssignments: [
                    { class: '10A', subjects: ['History'] }
                ]
            },
            { 
                name: 'Andreea Stan', 
                email: 'andreea.stan@highschool.edu', 
                subjects: ['Geography'],
                classAssignments: [
                    { class: '10A', subjects: ['Geography'] }
                ]
            },
            { 
                name: 'Cristian Nistor', 
                email: 'cristian.nistor@highschool.edu', 
                subjects: ['Romanian'],
                classAssignments: [
                    { class: '10A', subjects: ['Romanian'] }
                ]
            },
            { 
                name: 'Laura Marin', 
                email: 'laura.marin@highschool.edu', 
                subjects: ['French'],
                classAssignments: [
                    { class: '10A', subjects: ['French'] }
                ]
            },
            { 
                name: 'Dragos Petrescu', 
                email: 'dragos.petrescu@highschool.edu', 
                subjects: ['Physical Education'],
                classAssignments: [
                    { class: '10A', subjects: ['Physical Education'] }
                ]
            }
        ],
        students: [
            { 
                name: 'Alexandru Popescu', 
                email: 'alexandru.popescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [9, 10, 9, 9, 10] },
                    { subject: 'Physics', grades: [8, 9, 8, 9] },
                    { subject: 'Chemistry', grades: [9, 9, 10, 9] },
                    { subject: 'Biology', grades: [8, 9, 8] },
                    { subject: 'English', grades: [9, 10, 9, 9] },
                    { subject: 'History', grades: [8, 8, 9] },
                    { subject: 'Geography', grades: [9, 9, 8] },
                    { subject: 'Romanian', grades: [10, 9, 10, 9] },
                    { subject: 'French', grades: [8, 8, 9] },
                    { subject: 'Physical Education', grades: [10, 10, 9] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'motivated', reason: 'Medical appointment', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Maria Ionescu', 
                email: 'maria.ionescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [7, 8, 7, 8, 7] },
                    { subject: 'Physics', grades: [6, 7, 6, 7] },
                    { subject: 'Chemistry', grades: [7, 8, 7, 8] },
                    { subject: 'Biology', grades: [8, 8, 9] },
                    { subject: 'English', grades: [9, 9, 10, 9] },
                    { subject: 'History', grades: [9, 10, 9] },
                    { subject: 'Geography', grades: [8, 9, 9] },
                    { subject: 'Romanian', grades: [9, 10, 9, 10] },
                    { subject: 'French', grades: [9, 9, 10] },
                    { subject: 'Physical Education', grades: [8, 8, 9] }
                ],
                absences: [
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
                    { subject: 'Chemistry', type: 'unmotivated', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Andrei Georgescu', 
                email: 'andrei.georgescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [10, 10, 9, 10, 9] },
                    { subject: 'Physics', grades: [10, 9, 10, 9] },
                    { subject: 'Chemistry', grades: [9, 10, 9, 10] },
                    { subject: 'Biology', grades: [9, 9, 10] },
                    { subject: 'English', grades: [8, 8, 9, 8] },
                    { subject: 'History', grades: [7, 8, 7] },
                    { subject: 'Geography', grades: [8, 8, 9] },
                    { subject: 'Romanian', grades: [8, 9, 8, 9] },
                    { subject: 'French', grades: [7, 8, 7] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ]
            },
            { 
                name: 'Elena Radu', 
                email: 'elena.radu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [6, 5, 6, 5, 6] },
                    { subject: 'Physics', grades: [5, 6, 5, 6] },
                    { subject: 'Chemistry', grades: [6, 5, 6, 5] },
                    { subject: 'Biology', grades: [7, 6, 7] },
                    { subject: 'English', grades: [8, 9, 8, 9] },
                    { subject: 'History', grades: [9, 9, 10] },
                    { subject: 'Geography', grades: [8, 9, 8] },
                    { subject: 'Romanian', grades: [9, 10, 9, 10] },
                    { subject: 'French', grades: [8, 9, 8] },
                    { subject: 'Physical Education', grades: [7, 7, 8] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'David Dumitrescu', 
                email: 'david.dumitrescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [8, 9, 8, 9, 8] },
                    { subject: 'Physics', grades: [9, 8, 9, 8] },
                    { subject: 'Chemistry', grades: [8, 9, 8, 9] },
                    { subject: 'Biology', grades: [9, 9, 8] },
                    { subject: 'English', grades: [7, 8, 7, 8] },
                    { subject: 'History', grades: [8, 8, 9] },
                    { subject: 'Geography', grades: [9, 8, 9] },
                    { subject: 'Romanian', grades: [8, 9, 8, 9] },
                    { subject: 'French', grades: [9, 8, 9] },
                    { subject: 'Physical Education', grades: [10, 9, 10] }
                ],
                absences: [
                    { subject: 'English', type: 'motivated', reason: 'Family emergency', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Ioana Constantinescu', 
                email: 'ioana.constantinescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [9, 9, 10, 9, 9] },
                    { subject: 'Physics', grades: [8, 9, 8, 9] },
                    { subject: 'Chemistry', grades: [9, 9, 10, 9] },
                    { subject: 'Biology', grades: [10, 9, 10] },
                    { subject: 'English', grades: [10, 9, 10, 9] },
                    { subject: 'History', grades: [9, 10, 9] },
                    { subject: 'Geography', grades: [9, 9, 10] },
                    { subject: 'Romanian', grades: [10, 9, 10, 9] },
                    { subject: 'French', grades: [10, 9, 10] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ]
            },
            { 
                name: 'Stefan Stan', 
                email: 'stefan.stan@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [7, 7, 8, 7, 7] },
                    { subject: 'Physics', grades: [7, 8, 7, 8] },
                    { subject: 'Chemistry', grades: [8, 7, 8, 7] },
                    { subject: 'Biology', grades: [7, 8, 7] },
                    { subject: 'English', grades: [6, 7, 6, 7] },
                    { subject: 'History', grades: [8, 8, 9] },
                    { subject: 'Geography', grades: [9, 8, 9] },
                    { subject: 'Romanian', grades: [7, 8, 7, 8] },
                    { subject: 'French', grades: [6, 7, 6] },
                    { subject: 'Physical Education', grades: [8, 8, 9] }
                ],
                absences: [
                    { subject: 'English', type: 'unmotivated', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
                    { subject: 'French', type: 'unmotivated', date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Ana Nistor', 
                email: 'ana.nistor@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [8, 8, 9, 8, 8] },
                    { subject: 'Physics', grades: [9, 8, 9, 8] },
                    { subject: 'Chemistry', grades: [8, 9, 8, 9] },
                    { subject: 'Biology', grades: [9, 8, 9] },
                    { subject: 'English', grades: [9, 9, 10, 9] },
                    { subject: 'History', grades: [10, 9, 10] },
                    { subject: 'Geography', grades: [9, 10, 9] },
                    { subject: 'Romanian', grades: [9, 10, 9, 10] },
                    { subject: 'French', grades: [9, 9, 10] },
                    { subject: 'Physical Education', grades: [8, 9, 8] }
                ],
                absences: [
                    { subject: 'Biology', type: 'motivated', reason: 'Medical appointment', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Mihai Marin', 
                email: 'mihai.marin@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [5, 6, 5, 6, 5] },
                    { subject: 'Physics', grades: [6, 5, 6, 5] },
                    { subject: 'Chemistry', grades: [5, 6, 5, 6] },
                    { subject: 'Biology', grades: [6, 5, 6] },
                    { subject: 'English', grades: [7, 7, 8, 7] },
                    { subject: 'History', grades: [8, 7, 8] },
                    { subject: 'Geography', grades: [7, 8, 7] },
                    { subject: 'Romanian', grades: [7, 8, 7, 8] },
                    { subject: 'French', grades: [6, 7, 6] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
                    { subject: 'Chemistry', type: 'unmotivated', date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Cristina Petrescu', 
                email: 'cristina.petrescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [10, 9, 10, 9, 10] },
                    { subject: 'Physics', grades: [9, 10, 9, 10] },
                    { subject: 'Chemistry', grades: [10, 9, 10, 9] },
                    { subject: 'Biology', grades: [9, 10, 9] },
                    { subject: 'English', grades: [8, 9, 8, 9] },
                    { subject: 'History', grades: [9, 9, 10] },
                    { subject: 'Geography', grades: [9, 9, 10] },
                    { subject: 'Romanian', grades: [9, 10, 9, 10] },
                    { subject: 'French', grades: [9, 9, 10] },
                    { subject: 'Physical Education', grades: [8, 9, 8] }
                ]
            },
            { 
                name: 'Bogdan Popescu', 
                email: 'bogdan.popescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [6, 7, 6, 7, 6] },
                    { subject: 'Physics', grades: [7, 6, 7, 6] },
                    { subject: 'Chemistry', grades: [6, 7, 6, 7] },
                    { subject: 'Biology', grades: [7, 6, 7] },
                    { subject: 'English', grades: [8, 8, 9, 8] },
                    { subject: 'History', grades: [7, 8, 7] },
                    { subject: 'Geography', grades: [8, 7, 8] },
                    { subject: 'Romanian', grades: [8, 8, 9, 8] },
                    { subject: 'French', grades: [7, 8, 7] },
                    { subject: 'Physical Education', grades: [10, 10, 9] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Raluca Ionescu', 
                email: 'raluca.ionescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [9, 8, 9, 8, 9] },
                    { subject: 'Physics', grades: [8, 9, 8, 9] },
                    { subject: 'Chemistry', grades: [9, 8, 9, 8] },
                    { subject: 'Biology', grades: [8, 9, 8] },
                    { subject: 'English', grades: [10, 9, 10, 9] },
                    { subject: 'History', grades: [9, 10, 9] },
                    { subject: 'Geography', grades: [9, 9, 10] },
                    { subject: 'Romanian', grades: [10, 9, 10, 9] },
                    { subject: 'French', grades: [10, 9, 10] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ]
            },
            { 
                name: 'Adrian Georgescu', 
                email: 'adrian.georgescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [8, 9, 8, 9, 8] },
                    { subject: 'Physics', grades: [9, 8, 9, 8] },
                    { subject: 'Chemistry', grades: [8, 9, 8, 9] },
                    { subject: 'Biology', grades: [9, 8, 9] },
                    { subject: 'English', grades: [7, 8, 7, 8] },
                    { subject: 'History', grades: [8, 8, 9] },
                    { subject: 'Geography', grades: [8, 9, 8] },
                    { subject: 'Romanian', grades: [8, 9, 8, 9] },
                    { subject: 'French', grades: [8, 8, 9] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ],
                absences: [
                    { subject: 'History', type: 'motivated', reason: 'School trip', date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Diana Radu', 
                email: 'diana.radu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [7, 8, 7, 8, 7] },
                    { subject: 'Physics', grades: [8, 7, 8, 7] },
                    { subject: 'Chemistry', grades: [7, 8, 7, 8] },
                    { subject: 'Biology', grades: [8, 7, 8] },
                    { subject: 'English', grades: [9, 9, 10, 9] },
                    { subject: 'History', grades: [10, 9, 10] },
                    { subject: 'Geography', grades: [9, 10, 9] },
                    { subject: 'Romanian', grades: [9, 10, 9, 10] },
                    { subject: 'French', grades: [9, 9, 10] },
                    { subject: 'Physical Education', grades: [8, 9, 8] }
                ]
            },
            { 
                name: 'Radu Dumitrescu', 
                email: 'radu.dumitrescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [10, 10, 9, 10, 9] },
                    { subject: 'Physics', grades: [10, 9, 10, 9] },
                    { subject: 'Chemistry', grades: [9, 10, 9, 10] },
                    { subject: 'Biology', grades: [10, 9, 10] },
                    { subject: 'English', grades: [8, 9, 8, 9] },
                    { subject: 'History', grades: [9, 9, 10] },
                    { subject: 'Geography', grades: [9, 9, 10] },
                    { subject: 'Romanian', grades: [9, 10, 9, 10] },
                    { subject: 'French', grades: [9, 9, 10] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ]
            },
            { 
                name: 'Andreea Constantinescu', 
                email: 'andreea.constantinescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [6, 6, 7, 6, 6] },
                    { subject: 'Physics', grades: [6, 7, 6, 7] },
                    { subject: 'Chemistry', grades: [7, 6, 7, 6] },
                    { subject: 'Biology', grades: [6, 7, 6] },
                    { subject: 'English', grades: [8, 8, 9, 8] },
                    { subject: 'History', grades: [9, 8, 9] },
                    { subject: 'Geography', grades: [8, 9, 8] },
                    { subject: 'Romanian', grades: [8, 9, 8, 9] },
                    { subject: 'French', grades: [8, 8, 9] },
                    { subject: 'Physical Education', grades: [7, 8, 7] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Vlad Stan', 
                email: 'vlad.stan@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [9, 9, 10, 9, 9] },
                    { subject: 'Physics', grades: [9, 10, 9, 10] },
                    { subject: 'Chemistry', grades: [10, 9, 10, 9] },
                    { subject: 'Biology', grades: [9, 10, 9] },
                    { subject: 'English', grades: [7, 8, 7, 8] },
                    { subject: 'History', grades: [8, 8, 9] },
                    { subject: 'Geography', grades: [8, 9, 8] },
                    { subject: 'Romanian', grades: [8, 9, 8, 9] },
                    { subject: 'French', grades: [7, 8, 7] },
                    { subject: 'Physical Education', grades: [10, 9, 10] }
                ]
            },
            { 
                name: 'Gabriela Nistor', 
                email: 'gabriela.nistor@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [8, 8, 9, 8, 8] },
                    { subject: 'Physics', grades: [8, 9, 8, 9] },
                    { subject: 'Chemistry', grades: [9, 8, 9, 8] },
                    { subject: 'Biology', grades: [8, 9, 8] },
                    { subject: 'English', grades: [10, 9, 10, 9] },
                    { subject: 'History', grades: [9, 10, 9] },
                    { subject: 'Geography', grades: [9, 9, 10] },
                    { subject: 'Romanian', grades: [10, 9, 10, 9] },
                    { subject: 'French', grades: [10, 9, 10] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ],
                absences: [
                    { subject: 'Chemistry', type: 'motivated', reason: 'Dental appointment', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Florin Marin', 
                email: 'florin.marin@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [5, 6, 5, 6, 5] },
                    { subject: 'Physics', grades: [6, 5, 6, 5] },
                    { subject: 'Chemistry', grades: [5, 6, 5, 6] },
                    { subject: 'Biology', grades: [6, 5, 6] },
                    { subject: 'English', grades: [7, 7, 8, 7] },
                    { subject: 'History', grades: [8, 7, 8] },
                    { subject: 'Geography', grades: [7, 8, 7] },
                    { subject: 'Romanian', grades: [7, 8, 7, 8] },
                    { subject: 'French', grades: [6, 7, 6] },
                    { subject: 'Physical Education', grades: [8, 8, 9] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Monica Petrescu', 
                email: 'monica.petrescu@highschool.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [9, 10, 9, 10, 9] },
                    { subject: 'Physics', grades: [10, 9, 10, 9] },
                    { subject: 'Chemistry', grades: [9, 10, 9, 10] },
                    { subject: 'Biology', grades: [10, 9, 10] },
                    { subject: 'English', grades: [9, 9, 10, 9] },
                    { subject: 'History', grades: [10, 9, 10] },
                    { subject: 'Geography', grades: [9, 10, 9] },
                    { subject: 'Romanian', grades: [10, 9, 10, 9] },
                    { subject: 'French', grades: [9, 10, 9] },
                    { subject: 'Physical Education', grades: [9, 9, 10] }
                ]
            }
        ]
    }
];

async function seedDatabase() {
    console.log('🌱 Starting FULL database seed (One School + 10 Teachers + Students + Grades + Absences)...\n');

    let totalSchools = 0;
    let totalTeachers = 0;
    let totalStudents = 0;
    let totalClassMasters = 0;
    let totalGrades = 0;
    let totalAbsences = 0;

    try {
        for (let i = 0; i < schools.length; i++) {
            const schoolData = schools[i];
            console.log(`\n📚 School: ${schoolData.schoolName}`);
            console.log('━'.repeat(60));
            
            // Check if school admin already exists
            const existingAdmin = await User.findbyEmail(schoolData.email);
            let schoolId;

            if (existingAdmin) {
                console.log(`⚠️  Admin ${schoolData.email} already exists`);
                schoolId = existingAdmin.schoolId;
                if (!schoolId) {
                    console.log('❌ Existing admin has no schoolId, skipping...');
                    continue;
                }
                console.log(`   Using existing school ID: ${schoolId}`);
            } else {
                // Create school and admin
                const result = await School.create({
                    name: schoolData.name,
                    email: schoolData.email,
                    password: schoolData.password,
                    schoolName: schoolData.schoolName,
                    adress: schoolData.adress
                });
                
                schoolId = result.school.id;
                totalSchools++;
                console.log(`✅ School created: ${result.school.name}`);
                console.log(`✅ Admin created: ${result.admin.name} (${result.admin.email})`);
            }

            // Add all subjects to school
            console.log(`\n📚 Adding subjects to school...`);
            const allSubjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Romanian', 'French', 'Physical Education'];
            for (const subject of allSubjects) {
                try {
                    await School.addSubject(schoolId, subject);
                    console.log(`   ✅ Subject added: ${subject}`);
                } catch (error) {
                    if (error.message.includes('already exists')) {
                        console.log(`   ⚠️  Subject ${subject} already exists`);
                    } else {
                        throw error;
                    }
                }
            }

            // Add Teachers
            console.log(`\n👨‍🏫 Adding ${schoolData.teachers.length} teachers...`);
            const teacherMap = {}; // Store teacher UIDs for class assignment
            
            for (const teacher of schoolData.teachers) {
                const existingTeacher = await User.findbyEmail(teacher.email);
                if (existingTeacher) {
                    console.log(`   ⚠️  Teacher ${teacher.email} already exists, skipping`);
                    teacherMap[teacher.email] = existingTeacher.uid;
                    continue;
                }

                const newTeacher = await User.create({
                    name: teacher.name,
                    email: teacher.email,
                    password: 'password123',
                    role: 'teacher',
                    subjects: teacher.subjects,
                    schoolId: schoolId
                });
                teacherMap[teacher.email] = newTeacher.uid;
                totalTeachers++;
                console.log(`   ✅ ${teacher.name} (${teacher.email}) - Subjects: ${teacher.subjects.join(', ')}`);
            }

            // Assign Teachers to Classes with specific subjects
            console.log(`\n📋 Assigning all teachers to Class 10A...`);
            for (const teacher of schoolData.teachers) {
                const teacherUid = teacherMap[teacher.email];
                if (teacherUid && teacher.classAssignments) {
                    for (const assignment of teacher.classAssignments) {
                        await School.assignTeacherToClass(
                            schoolId, 
                            assignment.class, 
                            teacherUid,
                            assignment.subjects
                        );
                        console.log(`   ✅ ${teacher.name} → Class ${assignment.class} (${assignment.subjects.join(', ')})`);
                    }
                }
            }

            // Assign Classmaster
            if (schoolData.classMasters && schoolData.classMasters.length > 0) {
                console.log(`\n👔 Assigning classmaster...`);
                for (const classMaster of schoolData.classMasters) {
                    const teacherUid = teacherMap[classMaster.teacherEmail];
                    if (teacherUid) {
                        await School.assignClassmaster(schoolId, classMaster.class, teacherUid);
                        totalClassMasters++;
                        const teacher = schoolData.teachers.find(t => t.email === classMaster.teacherEmail);
                        console.log(`   ✅ ${teacher?.name || classMaster.teacherEmail} → Classmaster of ${classMaster.class}`);
                    } else {
                        console.log(`   ⚠️  Teacher ${classMaster.teacherEmail} not found, skipping classmaster assignment for ${classMaster.class}`);
                    }
                }
            }

            // Add Students
            console.log(`\n👨‍🎓 Adding ${schoolData.students.length} students...`);
            const studentMap = {}; // Store student UIDs for adding grades/absences
            
            for (const student of schoolData.students) {
                const existingStudent = await User.findbyEmail(student.email);
                let studentUid;
                
                if (existingStudent) {
                    console.log(`   ⚠️  Student ${student.email} already exists, skipping creation`);
                    studentUid = existingStudent.uid;
                } else {
                    const newStudent = await User.create({
                        name: student.name,
                        email: student.email,
                        password: 'password123',
                        role: 'student',
                        schoolId: schoolId,
                        classYear: student.classYear
                    });
                    totalStudents++;
                    studentUid = newStudent.uid;
                    console.log(`   ✅ ${student.name} (${student.email}) - Class ${student.classYear}`);
                }
                
                studentMap[student.email] = studentUid;
            }

            // Add Grades and Absences for students
            console.log(`\n📝 Adding grades and absences...`);
            for (const student of schoolData.students) {
                const studentUid = studentMap[student.email];
                if (!studentUid) continue;

                if (student.grades || student.absences) {
                    console.log(`\n📝 Adding grades and absences for ${student.name}...`);
                
                    // Add grades
                    if (student.grades && student.grades.length > 0) {
                        for (const gradeData of student.grades) {
                            // Find teacher who teaches this subject
                            const teacherForSubject = schoolData.teachers.find(t => 
                                t.subjects.includes(gradeData.subject)
                            );
                            
                            if (teacherForSubject) {
                                const teacherUid = teacherMap[teacherForSubject.email];
                                if (teacherUid) {
                                    for (const gradeValue of gradeData.grades) {
                                        await User.addGrade({
                                            studentId: studentUid,
                                            studentName: student.name,
                                            grade: gradeValue,
                                            teacherId: teacherUid,
                                            teacherName: teacherForSubject.name,
                                            subject: gradeData.subject
                                        });
                                        totalGrades++;
                                    }
                                    console.log(`   ✅ ${student.name}: Added ${gradeData.grades.length} grades for ${gradeData.subject}`);
                                }
                            }
                        }
                    }

                    // Add absences
                    if (student.absences && student.absences.length > 0) {
                        for (const absenceData of student.absences) {
                            // Find teacher who teaches this subject
                            const teacherForSubject = schoolData.teachers.find(t => 
                                t.subjects.includes(absenceData.subject)
                            );
                            
                            if (teacherForSubject) {
                                const teacherUid = teacherMap[teacherForSubject.email];
                                if (teacherUid) {
                                    await User.addAbsence({
                                        studentId: studentUid,
                                        studentName: student.name,
                                        teacherId: teacherUid,
                                        teacherName: teacherForSubject.name,
                                        subject: absenceData.subject,
                                        date: absenceData.date,
                                        type: absenceData.type || 'unmotivated',
                                        reason: absenceData.reason || ''
                                    });
                                    totalAbsences++;
                                }
                            }
                        }
                        console.log(`   ✅ ${student.name}: Added ${student.absences.length} absences`);
                    }
                }
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('✨ Database seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   Schools created: ${totalSchools}`);
        console.log(`   Teachers created: ${totalTeachers}`);
        console.log(`   Classmasters assigned: ${totalClassMasters}`);
        console.log(`   Students created: ${totalStudents}`);
        console.log(`   Grades added: ${totalGrades}`);
        console.log(`   Absences added: ${totalAbsences}`);
        console.log(`   Total users: ${totalSchools + totalTeachers + totalStudents}`);
        
        console.log('\n🔑 Login Credentials (all passwords: "password123"):');
        console.log('\n   ADMIN:');
        console.log(`   📧 admin@highschool.edu - Central High School`);
        console.log(`      Password: password123`);

        console.log('\n   TEACHERS (all teaching Class 10A):');
        console.log('   📧 maria.popescu@highschool.edu - Mathematics (Classmaster)');
        console.log('   📧 ion.ionescu@highschool.edu - Physics');
        console.log('   📧 elena.georgescu@highschool.edu - Chemistry');
        console.log('   📧 alexandru.radu@highschool.edu - Biology');
        console.log('   📧 ana.dumitrescu@highschool.edu - English');
        console.log('   📧 mihai.constantinescu@highschool.edu - History');
        console.log('   📧 andreea.stan@highschool.edu - Geography');
        console.log('   📧 cristian.nistor@highschool.edu - Romanian');
        console.log('   📧 laura.marin@highschool.edu - French');
        console.log('   📧 dragos.petrescu@highschool.edu - Physical Education');

        console.log('\n   STUDENTS (all in Class 10A):');
        console.log('   📧 alexandru.popescu@highschool.edu');
        console.log('   📧 maria.ionescu@highschool.edu');
        console.log('   📧 andrei.georgescu@highschool.edu');
        console.log('   📧 elena.radu@highschool.edu');
        console.log('   📧 david.dumitrescu@highschool.edu');
        console.log('   ... and 15 more students');
        console.log('   (All students have grades in all 10 subjects)');
        
        console.log('\n🚀 Access URLs:');
        console.log('   Admin Portal: http://localhost:3000/auth/login');
        console.log('   User Login: http://localhost:3000/auth/login');
        
        console.log('\n💡 Setup:');
        console.log('   • 1 School: Central High School');
        console.log('   • 10 Teachers: All teaching Class 10A');
        console.log('   • 1 Classmaster: Maria Popescu (Mathematics teacher)');
        console.log('   • 20 Students: All in Class 10A');
        console.log('   • All students have grades across all 10 subjects');
        console.log('   • Some students have absences (motivated and unmotivated)');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

seedDatabase();
