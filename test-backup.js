require('dotenv').config();
const backupService = require('./services/backupService');

async function testBackupSystem() {
    console.log('='.repeat(80));
    console.log('  Testing Backup System');
    console.log('='.repeat(80));
    console.log('');

    try {
        // Test 1: Create backup directory
        console.log('Test 1: Creating backup directory...');
        const dirCreated = await backupService.ensureBackupDirectory();
        if (dirCreated) {
            console.log('✓ Backup directory created successfully');
        } else {
            console.error('✗ Failed to create backup directory');
            return;
        }
        console.log('');

        // Test 2: Create a test backup
        console.log('Test 2: Creating test backup...');
        const backupResult = await backupService.createIncrementalBackup();
        
        if (backupResult.success) {
            console.log('✓ Backup created successfully');
            console.log(`  Path: ${backupResult.path}`);
            console.log(`  Size: ${(backupResult.size / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`  Documents: ${backupResult.metadata.totalDocuments}`);
        } else {
            console.error('✗ Backup failed:', backupResult.error);
            return;
        }
        console.log('');

        // Test 3: List backups
        console.log('Test 3: Listing backups...');
        const backups = await backupService.listBackups();
        const dailyCount = backups.daily.length;
        const monthlyCount = backups.monthly.length;
        
        console.log(`✓ Found ${dailyCount} daily backup(s)`);
        console.log(`✓ Found ${monthlyCount} monthly backup(s)`);
        console.log('');

        // Test 4: Get backup statistics
        console.log('Test 4: Getting backup statistics...');
        const stats = await backupService.getBackupStats();
        
        console.log('✓ Backup statistics:');
        console.log(`  Total daily backups: ${stats.daily.count}`);
        console.log(`  Total monthly backups: ${stats.monthly.count}`);
        console.log(`  Total storage used: ${stats.totalSizeMB} MB`);
        
        if (stats.daily.latest) {
            console.log(`  Latest daily backup: ${new Date(stats.daily.latest.created).toLocaleString()}`);
        }
        console.log('');

        // Summary
        console.log('='.repeat(80));
        console.log('  ALL TESTS PASSED ✓');
        console.log('='.repeat(80));
        console.log('');
        console.log('Backup system is working correctly!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Enable automated backups: Set ENABLE_AUTO_BACKUP=true in .env');
        console.log('2. Configure cloud storage for second backup location (production)');
        console.log('3. Test restore process: npm run backup:restore -- <backup-file>');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('='.repeat(80));
        console.error('  TEST FAILED ✗');
        console.error('='.repeat(80));
        console.error(`  Error: ${error.message}`);
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
        console.error('='.repeat(80));
        process.exit(1);
    }
}

testBackupSystem().then(() => {
    console.log('Test complete!');
    process.exit(0);
}).catch(error => {
    console.error('Test error:', error);
    process.exit(1);
});
