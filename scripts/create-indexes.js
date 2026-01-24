#!/usr/bin/env node

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(color, symbol, message) {
    console.log(`${color}${symbol}${colors.reset} ${message}`);
}

function success(message) {
    log(colors.green, '✓', message);
}

function error(message) {
    log(colors.red, '✗', message);
}

function info(message) {
    log(colors.blue, 'ℹ', message);
}

function section(message) {
    console.log(`\n${colors.cyan}━━━ ${message} ━━━${colors.reset}`);
}

console.log('');
console.log('════════════════════════════════════════════════');
console.log('   FIRESTORE INDEXES CREATION GUIDE');
console.log('════════════════════════════════════════════════');
console.log('');

section('Required Indexes');

console.log('\n📋 You need to create the following indexes:\n');

console.log('1️⃣  OTP Codes Index (for 2FA)');
console.log('   Collection: otp_codes');
console.log('   Fields:');
console.log('     - userId (Ascending)');
console.log('     - verified (Ascending)');
console.log('     - createdAt (Descending)');
console.log('');

console.log('2️⃣  Audit Logs - Entity History');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - entityId (Ascending)');
console.log('     - entityType (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('3️⃣  Audit Logs - Student with Entity Type');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - studentId (Ascending)');
console.log('     - entityType (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('4️⃣  Audit Logs - Student Basic');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - studentId (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('5️⃣  Audit Logs - School with Entity Type');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - schoolId (Ascending)');
console.log('     - entityType (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('6️⃣  Audit Logs - School with Action');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - schoolId (Ascending)');
console.log('     - action (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('7️⃣  Audit Logs - School with Entity Type + Action');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - schoolId (Ascending)');
console.log('     - entityType (Ascending)');
console.log('     - action (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('8️⃣  Audit Logs - User with Entity Type');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - userId (Ascending)');
console.log('     - entityType (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('9️⃣  Audit Logs - User with Action');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - userId (Ascending)');
console.log('     - action (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

console.log('🔟 Audit Logs - User with Entity Type + Action');
console.log('   Collection: audit_logs');
console.log('   Fields:');
console.log('     - userId (Ascending)');
console.log('     - entityType (Ascending)');
console.log('     - action (Ascending)');
console.log('     - timestamp (Descending)');
console.log('');

section('How to Create Indexes');

console.log('\n📝 Method 1: Automatic (Recommended)');
console.log('');
console.log('When you run the tests, Firestore will show error messages');
console.log('with direct links to create each index. Click those links!');
console.log('');
console.log('Run: npm run test:2fa');
console.log('Run: npm run test:audit');
console.log('');
console.log('Then click the links in the error messages.');
console.log('');

console.log('📝 Method 2: Manual Creation');
console.log('');
console.log('1. Go to: https://console.firebase.google.com');
console.log('2. Select your project: onlinerecordbook-fb9c8');
console.log('3. Navigate to: Firestore Database → Indexes');
console.log('4. Click "Create Index"');
console.log('5. Configure each index as listed above');
console.log('6. Click "Create"');
console.log('');

console.log('📝 Method 3: Using Firebase CLI (if installed)');
console.log('');
console.log('If you have Firebase CLI installed:');
console.log('  firebase deploy --only firestore:indexes');
console.log('');
console.log('This will use the firestore.indexes.json file we created.');
console.log('');

section('Quick Links');

console.log('\n🔗 Direct Links to Firebase Console:');
console.log('');
console.log('Firestore Indexes:');
console.log('https://console.firebase.google.com/project/onlinerecordbook-fb9c8/firestore/indexes');
console.log('');

section('After Creating Indexes');

console.log('\n⏱️  Indexes take 2-5 minutes to build');
console.log('');
console.log('You can:');
console.log('  ✓ Continue using the app (other features work)');
console.log('  ✓ Check index status in Firebase Console');
console.log('  ✓ Re-run tests after indexes are built');
console.log('');
console.log('Once indexes are ready, run:');
console.log('  npm test');
console.log('');
console.log('All tests should pass! ✨');
console.log('');
