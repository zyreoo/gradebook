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
            { name: 'Robert Wilson', email: 'robert.wilson@lincoln.edu' },
            { name: 'Jennifer Martinez', email: 'jennifer.martinez@lincoln.edu' }
        ],
        students: [
            { name: 'Alice Thompson', email: 'alice.thompson@lincoln.edu' },
            { name: 'Bob Anderson', email: 'bob.anderson@lincoln.edu' },
            { name: 'Charlie Davis', email: 'charlie.davis@lincoln.edu' }
        ]
    },
    {
        name: 'Sarah Johnson',
        email: 'admin@washington.edu',
        password: 'password123',
        schoolName: 'Washington Academy',
        adress: '456 Oak Avenue, Portland, OR 97201',
        teachers: [
            { name: 'David Lee', email: 'david.lee@washington.edu' },
            { name: 'Emma White', email: 'emma.white@washington.edu' }
        ],
        students: [
            { name: 'Diana Prince', email: 'diana.prince@washington.edu' },
            { name: 'Ethan Hunt', email: 'ethan.hunt@washington.edu' },
            { name: 'Fiona Clark', email: 'fiona.clark@washington.edu' }
        ]
    },
    {
        name: 'Michael Brown',
        email: 'admin@roosevelt.edu',
        password: 'password123',
        schoolName: 'Roosevelt Middle School',
        adress: '789 Pine Road, Seattle, WA 98101',
        teachers: [
            { name: 'Grace Kim', email: 'grace.kim@roosevelt.edu' },
            { name: 'Henry Adams', email: 'henry.adams@roosevelt.edu' }
        ],
        students: [
            { name: 'George Miller', email: 'george.miller@roosevelt.edu' },
            { name: 'Hannah Scott', email: 'hannah.scott@roosevelt.edu' },
            { name: 'Isaac Newton', email: 'isaac.newton@roosevelt.edu' }
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
            for (const teacher of schoolData.teachers) {
                const existingTeacher = await User.findbyEmail(teacher.email);
                if (existingTeacher) {
                    console.log(`   ⚠️  Teacher ${teacher.email} already exists, skipping`);
                    continue;
                }

                await User.create({
                    name: teacher.name,
                    email: teacher.email,
                    password: 'password123',
                    role: 'teacher',
                    schoolId: schoolId
                });
                totalTeachers++;
                console.log(`   ✅ ${teacher.name} (${teacher.email})`);
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
                    schoolId: schoolId
                });
                totalStudents++;
                console.log(`   ✅ ${student.name} (${student.email})`);
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

        console.log('\n   TEACHERS (sample):');
        console.log('   📧 robert.wilson@lincoln.edu - Lincoln High School');
        console.log('   📧 david.lee@washington.edu - Washington Academy');

        console.log('\n   STUDENTS (sample):');
        console.log('   📧 alice.thompson@lincoln.edu - Lincoln High School');
        console.log('   📧 diana.prince@washington.edu - Washington Academy');
        
        console.log('\n🚀 Access URLs:');
        console.log('   Admin Portal: http://localhost:3000/auth/admin/login');
        console.log('   User Login: http://localhost:3000/auth/login');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error seeding database:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the seed function
seedDatabase();

