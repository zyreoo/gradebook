const School = require('./models/School');
const User = require('./models/User');
require('./config/firebase');

const schools = [
    {
        name: 'John Admin',
        email: 'admin@lincoln.edu',
        password: 'password123',
        schoolName: 'Lincoln High School',
        adress: '123 Main Street, Springfield, IL 62701'
    },
    {
        name: 'Sarah Johnson',
        email: 'admin@washington.edu',
        password: 'password123',
        schoolName: 'Washington Academy',
        adress: '456 Oak Avenue, Portland, OR 97201'
    },
    {
        name: 'Michael Brown',
        email: 'admin@roosevelt.edu',
        password: 'password123',
        schoolName: 'Roosevelt Middle School',
        adress: '789 Pine Road, Seattle, WA 98101'
    },
    {
        name: 'Emily Davis',
        email: 'admin@kennedy.edu',
        password: 'password123',
        schoolName: 'Kennedy Elementary',
        adress: '321 Elm Street, Boston, MA 02101'
    }
];

async function seedDatabase() {
    console.log('🌱 Starting database seed...\n');

    try {
        for (let i = 0; i < schools.length; i++) {
            const schoolData = schools[i];
            console.log(`📚 Creating School ${i + 1}/${schools.length}: ${schoolData.schoolName}`);
            
            // Check if school admin already exists
            const existingUser = await User.findbyEmail(schoolData.email);
            if (existingUser) {
                console.log(`   ⚠️  Admin ${schoolData.email} already exists, skipping...\n`);
                continue;
            }

            // Create school and admin
            const result = await School.create(schoolData);
            
            console.log(`   ✅ School created with ID: ${result.school.id}`);
            console.log(`   ✅ Admin created: ${result.admin.name} (${result.admin.email})`);
            console.log(`   📍 Address: ${result.school.adress || 'Not provided'}\n`);
        }

        console.log('✨ Database seeding completed successfully!\n');
        console.log('📋 Summary:');
        console.log(`   Total schools created: ${schools.length}`);
        console.log(`   Each school has 1 admin account`);
        console.log('\n🔑 Login credentials (all passwords are "password123"):');
        schools.forEach(school => {
            console.log(`   - ${school.schoolName}: ${school.email}`);
        });
        console.log('\n🚀 You can now login at: http://localhost:3000/auth/admin/login');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the seed function
seedDatabase();

