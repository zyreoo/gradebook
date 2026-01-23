#!/usr/bin/env node

require('dotenv').config();
const backupService = require('../services/backupService');
const readline = require('node:readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function restoreBackup() {
    const backupPath = process.argv[2];

    if (!backupPath) {
        console.error('Usage: node backup-restore.js <path-to-backup-file>');
        console.error('');
        console.error('To list available backups, run: node backup-list.js');
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('  RESTORE FROM BACKUP');
    console.log('='.repeat(80));
    console.log('');
    console.log('⚠️  WARNING: This will OVERWRITE existing data in Firestore!');
    console.log('');
    console.log(`Backup file: ${backupPath}`);
    console.log('');

    const answer = await question('Are you sure you want to continue? (yes/no): ');

    if (answer.toLowerCase() !== 'yes') {
        console.log('Restore cancelled.');
        rl.close();
        process.exit(0);
    }

    console.log('');
    console.log('Starting restore...');
    console.log('');

    try {
        const result = await backupService.restoreFromBackup(backupPath);

        if (result.success) {
            console.log('');
            console.log('='.repeat(80));
            console.log('  RESTORE SUCCESSFUL');
            console.log('='.repeat(80));
            console.log(`  Documents restored: ${result.restored}`);
            console.log('='.repeat(80));
            rl.close();
            process.exit(0);
        } else {
            console.error('');
            console.error('='.repeat(80));
            console.error('  RESTORE FAILED');
            console.error('='.repeat(80));
            console.error(`  Error: ${result.error}`);
            console.error('='.repeat(80));
            rl.close();
            process.exit(1);
        }
    } catch (error) {
        console.error('');
        console.error('='.repeat(80));
        console.error('  RESTORE FAILED');
        console.error('='.repeat(80));
        console.error(`  Error: ${error.message}`);
        console.error('='.repeat(80));
        rl.close();
        process.exit(1);
    }
}

restoreBackup();
