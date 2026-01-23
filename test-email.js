require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
    console.log('Testing email configuration...\n');
    
    // Check environment variables
    if (!process.env.EMAIL_USER) {
        console.error('❌ EMAIL_USER not set in .env');
        return;
    }
    
    if (!process.env.EMAIL_APP_PASSWORD) {
        console.error('❌ EMAIL_APP_PASSWORD not set in .env');
        return;
    }
    
    console.log('✓ Environment variables configured');
    console.log(`  Email: ${process.env.EMAIL_USER}`);
    console.log(`  App Password: ${'*'.repeat(16)}\n`);
    
    // Test connection
    console.log('Testing SMTP connection...');
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest.success) {
        console.error('❌ Connection failed:', connectionTest.error);
        console.log('\nTroubleshooting:');
        console.log('1. Verify App Password is correct (16 characters, no spaces)');
        console.log('2. Ensure 2-Step Verification is enabled in Google Account');
        console.log('3. Generate a new App Password at: https://myaccount.google.com/apppasswords');
        return;
    }
    
    console.log('✓ SMTP connection successful\n');
    
    // Test sending OTP
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    console.log(`Sending test OTP to ${testEmail}...`);
    
    const testCode = '123456';
    const sendTest = await emailService.sendOTP(testEmail, testCode, 'Test User');
    
    if (!sendTest.success) {
        console.error('❌ Failed to send email:', sendTest.error);
        return;
    }
    
    console.log('✓ Test email sent successfully!');
    console.log('\nCheck your inbox for the verification code email.');
    console.log('If not received, check spam/junk folder.');
}

testEmail().then(() => {
    console.log('\nTest complete!');
    process.exit(0);
}).catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
