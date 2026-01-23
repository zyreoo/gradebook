#!/usr/bin/env node

require('dotenv').config();
const backupService = require('../services/backupService');

async function listBackups() {
    console.log('='.repeat(80));
    console.log('  Available Backups');
    console.log('='.repeat(80));
    console.log('');

    try {
        const backups = await backupService.listBackups();
        const stats = await backupService.getBackupStats();

        console.log('DAILY BACKUPS:');
        console.log('-'.repeat(80));
        if (backups.daily.length > 0) {
            backups.daily
                .toSorted((a, b) => b.created - a.created)
                .forEach((backup, index) => {
                    const sizeMB = (backup.size / (1024 * 1024)).toFixed(2);
                    const date = new Date(backup.created).toLocaleString();
                    console.log(`  ${index + 1}. ${backup.filename}`);
                    console.log(`     Created: ${date}`);
                    console.log(`     Size: ${sizeMB} MB`);
                    console.log(`     Path: ${backup.path}`);
                    console.log('');
                });
        } else {
            console.log('  No daily backups found');
            console.log('');
        }

        console.log('');
        console.log('MONTHLY BACKUPS:');
        console.log('-'.repeat(80));
        if (backups.monthly.length > 0) {
            backups.monthly
                .toSorted((a, b) => b.created - a.created)
                .forEach((backup, index) => {
                    const sizeMB = (backup.size / (1024 * 1024)).toFixed(2);
                    const date = new Date(backup.created).toLocaleString();
                    console.log(`  ${index + 1}. ${backup.filename}`);
                    console.log(`     Created: ${date}`);
                    console.log(`     Size: ${sizeMB} MB`);
                    console.log(`     Path: ${backup.path}`);
                    console.log('');
                });
        } else {
            console.log('  No monthly backups found');
            console.log('');
        }

        console.log('');
        console.log('STATISTICS:');
        console.log('-'.repeat(80));
        console.log(`  Total daily backups: ${stats.daily.count}`);
        console.log(`  Total monthly backups: ${stats.monthly.count}`);
        console.log(`  Total storage used: ${stats.totalSizeMB} MB`);
        
        if (stats.daily.latest) {
            console.log(`  Latest daily backup: ${new Date(stats.daily.latest.created).toLocaleString()}`);
        }
        if (stats.monthly.latest) {
            console.log(`  Latest monthly backup: ${new Date(stats.monthly.latest.created).toLocaleString()}`);
        }
        
        console.log('='.repeat(80));

    } catch (error) {
        console.error('Failed to list backups:', error.message);
        process.exit(1);
    }
}

listBackups();
