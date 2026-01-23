#!/usr/bin/env node

require('dotenv').config();
const backupService = require('../services/backupService');

async function runBackup() {
    const type = process.argv[2] || 'daily';
    
    console.log('='.repeat(60));
    console.log(`  Manual Backup - ${type.toUpperCase()}`);
    console.log('='.repeat(60));
    console.log('');

    try {
        let result;
        
        if (type === 'monthly') {
            result = await backupService.createMonthlyBackup();
        } else {
            result = await backupService.createIncrementalBackup();
        }

        if (result.success) {
            console.log('');
            console.log('='.repeat(60));
            console.log('  BACKUP SUCCESSFUL');
            console.log('='.repeat(60));
            console.log(`  Path: ${result.path}`);
            console.log(`  Size: ${(result.size / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`  Documents: ${result.metadata.totalDocuments}`);
            console.log('='.repeat(60));
            process.exit(0);
        } else {
            console.error('');
            console.error('='.repeat(60));
            console.error('  BACKUP FAILED');
            console.error('='.repeat(60));
            console.error(`  Error: ${result.error}`);
            console.error('='.repeat(60));
            process.exit(1);
        }
    } catch (error) {
        console.error('');
        console.error('='.repeat(60));
        console.error('  BACKUP FAILED');
        console.error('='.repeat(60));
        console.error(`  Error: ${error.message}`);
        console.error('='.repeat(60));
        process.exit(1);
    }
}

runBackup();
