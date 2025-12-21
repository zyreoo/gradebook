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
        teachers: [
            { name: 'Robert Wilson', email: 'robert.wilson@lincoln.edu', subject: 'Mathematics', classes: ['9A', '10A'] },
            { name: 'Jennifer Martinez', email: 'jennifer.martinez@lincoln.edu', subject: 'English', classes: ['9B', '10B'] }
        ],
        students: [
            { name: 'Alice Thompson', email: 'alice.thompson@lincoln.edu', classYear: '9A' },
            { name: 'Bob Anderson', email: 'bob.anderson@lincoln.edu', classYear: '9A' },
            { name: 'Charlie Davis', email: 'charlie.davis@lincoln.edu', classYear: '10A' },
            { name: 'David Smith', email: 'david.smith@lincoln.edu', classYear: '10A' },
            { name: 'Emma Johnson', email: 'emma.johnson@lincoln.edu', classYear: '9B' },
            { name: 'Frank Wilson', email: 'frank.wilson@lincoln.edu', classYear: '10B' }
        ]
    },
    {
        name: 'Sarah Johnson',
        email: 'admin@washington.edu',
        password: 'password123',
        schoolName: 'Washington Academy',
        adress: '456 Oak Avenue, Portland, OR 97201',
        teachers: [
            { name: 'David Lee', email: 'david.lee@washington.edu', subject: 'Science', classes: ['11A', '12A'] },
            { name: 'Emma White', email: 'emma.white@washington.edu', subject: 'History', classes: ['11B', '12B'] }
        ],
        students: [
            { name: 'Diana Prince', email: 'diana.prince@washington.edu', classYear: '11A' },
            { name: 'Ethan Hunt', email: 'ethan.hunt@washington.edu', classYear: '11A' },
            { name: 'Fiona Clark', email: 'fiona.clark@washington.edu', classYear: '12A' },
            { name: 'George Brown', email: 'george.brown@washington.edu', classYear: '11B' },
            { name: 'Helen Davis', email: 'helen.davis@washington.edu', classYear: '12B' }
        ]
    },
    {
        name: 'Michael Brown',
        email: 'admin@roosevelt.edu',
        password: 'password123',
        schoolName: 'Roosevelt Middle School',
        adress: '789 Pine Road, Seattle, WA 98101',
        teachers: [
            { name: 'Grace Kim', email: 'grace.kim@roosevelt.edu', subject: 'Geography', classes: ['6A', '7A'] },
            { name: 'Henry Adams', email: 'henry.adams@roosevelt.edu', subject: 'Physics', classes: ['6B', '8A'] }
        ],
        students: [
            { name: 'George Miller', email: 'george.miller@roosevelt.edu', classYear: '6A' },
            { name: 'Hannah Scott', email: 'hannah.scott@roosevelt.edu', classYear: '6A' },
            { name: 'Isaac Newton', email: 'isaac.newton@roosevelt.edu', classYear: '7A' },
            { name: 'Julia Roberts', email: 'julia.roberts@roosevelt.edu', classYear: '6B' },
            { name: 'Kevin Hart', email: 'kevin.hart@roosevelt.edu', classYear: '8A' }
        ]
    }
];

async function seedDatabase() {
    console.log('🌱 Starting FULL database seed (Schools + Teachers + Students)...\n');

    let totalSchools = 0;
    let totalTeachers = 0;
    let totalStudents = 0;

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
                    subject: teacher.subject,
                    schoolId: schoolId
                });
                teacherMap[teacher.email] = newTeacher.uid;
                totalTeachers++;
                console.log(`   ✅ ${teacher.name} (${teacher.email}) - Subject: ${teacher.subject}`);
            }

            // Assign Teachers to Classes
            console.log(`\n📋 Assigning teachers to classes...`);
            for (const teacher of schoolData.teachers) {
                const teacherUid = teacherMap[teacher.email];
                if (teacherUid && teacher.classes) {
                    for (const classYear of teacher.classes) {
                        await School.assignTeacherToClass(schoolId, classYear, teacherUid);
                        console.log(`   ✅ ${teacher.name} → Class ${classYear}`);
                    }
                }
            }

            // Add Students
            console.log(`\n👨‍🎓 Adding ${schoolData.students.length} students...`);
            for (const student of schoolData.students) {
                const existingStudent = await User.findbyEmail(student.email);
                if (existingStudent) {
                    console.log(`   ⚠️  Student ${student.email} already exists, skipping`);
                    continue;
                }

                await User.create({
                    name: student.name,
                    email: student.email,
                    password: 'password123',
                    role: 'student',
                    schoolId: schoolId,
                    classYear: student.classYear
                });
                totalStudents++;
                console.log(`   ✅ ${student.name} (${student.email}) - Class ${student.classYear}`);
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('✨ Database seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   Schools created: ${totalSchools}`);
        console.log(`   Teachers created: ${totalTeachers}`);
        console.log(`   Students created: ${totalStudents}`);
        console.log(`   Total users: ${totalSchools + totalTeachers + totalStudents}`);
        
        console.log('\n🔑 Login Credentials (all passwords: "password123"):');
        console.log('\n   ADMINS:');
        schools.forEach(school => {
            console.log(`   📧 ${school.email} - ${school.schoolName}`);
        });

        console.log('\n   TEACHERS (with subjects and assigned classes):');
        console.log('   📧 robert.wilson@lincoln.edu - Mathematics (Classes: 9A, 10A)');
        console.log('   📧 jennifer.martinez@lincoln.edu - English (Classes: 9B, 10B)');
        console.log('   📧 david.lee@washington.edu - Science (Classes: 11A, 12A)');
        console.log('   📧 emma.white@washington.edu - History (Classes: 11B, 12B)');
        console.log('   📧 grace.kim@roosevelt.edu - Geography (Classes: 6A, 7A)');
        console.log('   📧 henry.adams@roosevelt.edu - Physics (Classes: 6B, 8A)');

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

