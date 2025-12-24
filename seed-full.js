const School = require('./models/School');
const User = require('./models/User');
require('./config/firebase');

const schools = [
    {
        name: 'John Admin',
        email: 'admin@lincoln.edu',
        password: 'password123',
        schoolName: 'Lincoln High School',
        adress: '123 Main Street, Springfield, IL 62701',
        classMasters: [
            { class: '9A', teacherEmail: 'robert.wilson@lincoln.edu' },
            { class: '10A', teacherEmail: 'robert.wilson@lincoln.edu' },
            { class: '9B', teacherEmail: 'jennifer.martinez@lincoln.edu' },
            { class: '10B', teacherEmail: 'jennifer.martinez@lincoln.edu' }
        ],
        teachers: [
            { 
                name: 'Robert Wilson', 
                email: 'robert.wilson@lincoln.edu', 
                subjects: ['Mathematics', 'Physics'],
                classAssignments: [
                    { class: '9A', subjects: ['Mathematics'] },
                    { class: '10A', subjects: ['Mathematics', 'Physics'] }
                ]
            },
            { 
                name: 'Jennifer Martinez', 
                email: 'jennifer.martinez@lincoln.edu', 
                subjects: ['English', 'History'],
                classAssignments: [
                    { class: '9B', subjects: ['English'] },
                    { class: '10B', subjects: ['English', 'History'] }
                ]
            }
        ],
        students: [
            { 
                name: 'Alice Thompson', 
                email: 'alice.thompson@lincoln.edu', 
                classYear: '9A',
                grades: [
                    { subject: 'Mathematics', grades: [9, 10, 9, 9] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'motivated', reason: 'Medical appointment', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Bob Anderson', 
                email: 'bob.anderson@lincoln.edu', 
                classYear: '9A',
                grades: [
                    { subject: 'Mathematics', grades: [7, 8, 7, 8] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Charlie Davis', 
                email: 'charlie.davis@lincoln.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [8, 9, 8] },
                    { subject: 'Physics', grades: [9, 10, 9] }
                ]
            },
            { 
                name: 'David Smith', 
                email: 'david.smith@lincoln.edu', 
                classYear: '10A',
                grades: [
                    { subject: 'Mathematics', grades: [6, 5, 6] },
                    { subject: 'Physics', grades: [5, 6, 5] }
                ],
                absences: [
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
                    { subject: 'Mathematics', type: 'unmotivated', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Emma Johnson', 
                email: 'emma.johnson@lincoln.edu', 
                classYear: '9B',
                grades: [
                    { subject: 'English', grades: [10, 9, 10, 9] }
                ]
            },
            { 
                name: 'Frank Wilson', 
                email: 'frank.wilson@lincoln.edu', 
                classYear: '10B',
                grades: [
                    { subject: 'English', grades: [7, 8, 7] },
                    { subject: 'History', grades: [8, 9, 8] }
                ],
                absences: [
                    { subject: 'English', type: 'motivated', reason: 'Family emergency', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) }
                ]
            }
        ]
    },
    {
        name: 'Sarah Johnson',
        email: 'admin@washington.edu',
        password: 'password123',
        schoolName: 'Washington Academy',
        adress: '456 Oak Avenue, Portland, OR 97201',
        classMasters: [
            { class: '11A', teacherEmail: 'david.lee@washington.edu' },
            { class: '12A', teacherEmail: 'david.lee@washington.edu' },
            { class: '11B', teacherEmail: 'emma.white@washington.edu' },
            { class: '12B', teacherEmail: 'emma.white@washington.edu' }
        ],
        teachers: [
            { 
                name: 'David Lee', 
                email: 'david.lee@washington.edu', 
                subjects: ['Science', 'Chemistry'],
                classAssignments: [
                    { class: '11A', subjects: ['Science'] },
                    { class: '12A', subjects: ['Science', 'Chemistry'] }
                ]
            },
            { 
                name: 'Emma White', 
                email: 'emma.white@washington.edu', 
                subjects: ['History', 'Geography'],
                classAssignments: [
                    { class: '11B', subjects: ['History'] },
                    { class: '12B', subjects: ['History', 'Geography'] }
                ]
            }
        ],
        students: [
            { 
                name: 'Diana Prince', 
                email: 'diana.prince@washington.edu', 
                classYear: '11A',
                grades: [
                    { subject: 'Science', grades: [9, 10, 9, 10] }
                ]
            },
            { 
                name: 'Ethan Hunt', 
                email: 'ethan.hunt@washington.edu', 
                classYear: '11A',
                grades: [
                    { subject: 'Science', grades: [8, 7, 8, 7] }
                ],
                absences: [
                    { subject: 'Science', type: 'unmotivated', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Fiona Clark', 
                email: 'fiona.clark@washington.edu', 
                classYear: '12A',
                grades: [
                    { subject: 'Science', grades: [9, 9, 10] },
                    { subject: 'Chemistry', grades: [10, 9, 10] }
                ]
            },
            { 
                name: 'George Brown', 
                email: 'george.brown@washington.edu', 
                classYear: '11B',
                grades: [
                    { subject: 'History', grades: [6, 7, 6] }
                ],
                absences: [
                    { subject: 'History', type: 'unmotivated', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
                    { subject: 'History', type: 'unmotivated', date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) },
                    { subject: 'History', type: 'unmotivated', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Helen Davis', 
                email: 'helen.davis@washington.edu', 
                classYear: '12B',
                grades: [
                    { subject: 'History', grades: [8, 9, 8] },
                    { subject: 'Geography', grades: [9, 8, 9] }
                ],
                absences: [
                    { subject: 'History', type: 'motivated', reason: 'School trip', date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) }
                ]
            }
        ]
    },
    {
        name: 'Michael Brown',
        email: 'admin@roosevelt.edu',
        password: 'password123',
        schoolName: 'Roosevelt Middle School',
        adress: '789 Pine Road, Seattle, WA 98101',
        classMasters: [
            { class: '6A', teacherEmail: 'grace.kim@roosevelt.edu' },
            { class: '7A', teacherEmail: 'grace.kim@roosevelt.edu' },
            { class: '6B', teacherEmail: 'henry.adams@roosevelt.edu' },
            { class: '8A', teacherEmail: 'henry.adams@roosevelt.edu' }
        ],
        teachers: [
            { 
                name: 'Grace Kim', 
                email: 'grace.kim@roosevelt.edu', 
                subjects: ['Geography', 'History'],
                classAssignments: [
                    { class: '6A', subjects: ['Geography'] },
                    { class: '7A', subjects: ['Geography', 'History'] }
                ]
            },
            { 
                name: 'Henry Adams', 
                email: 'henry.adams@roosevelt.edu', 
                subjects: ['Physics', 'Mathematics'],
                classAssignments: [
                    { class: '6B', subjects: ['Physics'] },
                    { class: '8A', subjects: ['Physics', 'Mathematics'] }
                ]
            }
        ],
        students: [
            { 
                name: 'George Miller', 
                email: 'george.miller@roosevelt.edu', 
                classYear: '6A',
                grades: [
                    { subject: 'Geography', grades: [8, 9, 8] }
                ]
            },
            { 
                name: 'Hannah Scott', 
                email: 'hannah.scott@roosevelt.edu', 
                classYear: '6A',
                grades: [
                    { subject: 'Geography', grades: [7, 7, 8] }
                ],
                absences: [
                    { subject: 'Geography', type: 'motivated', reason: 'Dental appointment', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Isaac Newton', 
                email: 'isaac.newton@roosevelt.edu', 
                classYear: '7A',
                grades: [
                    { subject: 'Geography', grades: [10, 10, 9] },
                    { subject: 'History', grades: [9, 10, 10] }
                ]
            },
            { 
                name: 'Julia Roberts', 
                email: 'julia.roberts@roosevelt.edu', 
                classYear: '6B',
                grades: [
                    { subject: 'Physics', grades: [5, 4, 5] }
                ],
                absences: [
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
                    { subject: 'Physics', type: 'unmotivated', date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) }
                ]
            },
            { 
                name: 'Kevin Hart', 
                email: 'kevin.hart@roosevelt.edu', 
                classYear: '8A',
                grades: [
                    { subject: 'Physics', grades: [9, 8, 9] },
                    { subject: 'Mathematics', grades: [8, 9, 8] }
                ],
                absences: [
                    { subject: 'Physics', type: 'motivated', reason: 'Medical appointment', date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000) }
                ]
            }
        ]
    }
];

async function seedDatabase() {
    console.log('🌱 Starting FULL database seed (Schools + Teachers + Students + Grades + Absences)...\n');

    let totalSchools = 0;
    let totalTeachers = 0;
    let totalStudents = 0;
    let totalClassMasters = 0;
    let totalGrades = 0;
    let totalAbsences = 0;

    try {
        for (let i = 0; i < schools.length; i++) {
            const schoolData = schools[i];
            console.log(`\n📚 School ${i + 1}/${schools.length}: ${schoolData.schoolName}`);
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
            console.log(`\n📋 Assigning teachers to classes...`);
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

            // Assign Classmasters
            if (schoolData.classMasters && schoolData.classMasters.length > 0) {
                console.log(`\n👔 Assigning classmasters...`);
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
        console.log('\n   ADMINS:');
        schools.forEach(school => {
            console.log(`   📧 ${school.email} - ${school.schoolName}`);
        });

        console.log('\n   TEACHERS (with subjects and assigned classes):');
        console.log('   📧 robert.wilson@lincoln.edu - Mathematics, Physics');
        console.log('      • Class 9A: Mathematics');
        console.log('      • Class 10A: Mathematics, Physics');
        console.log('   📧 jennifer.martinez@lincoln.edu - English, History');
        console.log('      • Class 9B: English');
        console.log('      • Class 10B: English, History');
        console.log('   📧 david.lee@washington.edu - Science, Chemistry');
        console.log('      • Class 11A: Science');
        console.log('      • Class 12A: Science, Chemistry');
        console.log('   📧 emma.white@washington.edu - History, Geography');
        console.log('      • Class 11B: History');
        console.log('      • Class 12B: History, Geography');
        console.log('   📧 grace.kim@roosevelt.edu - Geography, History');
        console.log('      • Class 6A: Geography');
        console.log('      • Class 7A: Geography, History');
        console.log('   📧 henry.adams@roosevelt.edu - Physics, Mathematics');
        console.log('      • Class 6B: Physics');
        console.log('      • Class 8A: Physics, Mathematics');

        console.log('\n   STUDENTS (with class years):');
        console.log('   📧 alice.thompson@lincoln.edu - Lincoln HS (Class 9A)');
        console.log('   📧 diana.prince@washington.edu - Washington Academy (Class 11A)');
        console.log('   📧 george.miller@roosevelt.edu - Roosevelt MS (Class 6A)');
        
        console.log('\n🚀 Access URLs:');
        console.log('   Admin Portal: http://localhost:3000/auth/admin/login');
        console.log('   User Login: http://localhost:3000/auth/login');
        
        console.log('\n💡 Teacher Dashboard:');
        console.log('   Teachers will see their assigned classes as cards');
        console.log('   Click on a class card to view students in that class');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

seedDatabase();

