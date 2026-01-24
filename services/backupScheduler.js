const backupService = require('./backupService');

class BackupScheduler {
    constructor() {
        this.dailyBackupInterval = null;
        this.monthlyBackupInterval = null;
        this.cleanupInterval = null;
    }

    start() {
        console.log('Starting backup scheduler...');

        this.scheduleDailyBackup();
        this.scheduleMonthlyBackup();
        this.scheduleCleanup();

        console.log('✓ Backup scheduler started');
        console.log('  Daily backups: Every day at 2:00 AM');
        console.log('  Monthly backups: 1st of month at 3:00 AM');
        console.log('  Cleanup: Every day at 4:00 AM (keep last 30 daily, 12 monthly)');
    }

    scheduleDailyBackup() {
        this.dailyBackupInterval = setInterval(async () => {
            const now = new Date();

            if (now.getHours() === 2 && now.getMinutes() < 60) {
                console.log('\n=== Running Daily Backup ===');
                const result = await backupService.createIncrementalBackup();
                
                if (result.success) {
                    console.log('✓ Daily backup completed successfully');
                } else {
                    console.error('✗ Daily backup failed:', result.error);
                }
            }
        }, 60 * 60 * 1000);
    }

    scheduleMonthlyBackup() {
        this.monthlyBackupInterval = setInterval(async () => {
            const now = new Date();

            if (now.getDate() === 1 && now.getHours() === 3 && now.getMinutes() < 60) {
                console.log('\n=== Running Monthly Backup ===');
                const result = await backupService.createMonthlyBackup();
                
                if (result.success) {
                    console.log('✓ Monthly backup completed successfully');
                } else {
                    console.error('✗ Monthly backup failed:', result.error);
                }
            }
        }, 60 * 60 * 1000);
    }

    scheduleCleanup() {
        this.cleanupInterval = setInterval(async () => {
            const now = new Date();

            if (now.getHours() === 4 && now.getMinutes() < 60) {
                console.log('\n=== Running Backup Cleanup ===');

                const dailyResult = await backupService.cleanupOldBackups('daily', 30);
                if (dailyResult.success && dailyResult.deleted > 0) {
                    console.log(`✓ Cleaned up ${dailyResult.deleted} old daily backups`);
                }

                const monthlyResult = await backupService.cleanupOldBackups('monthly', 12);
                if (monthlyResult.success && monthlyResult.deleted > 0) {
                    console.log(`✓ Cleaned up ${monthlyResult.deleted} old monthly backups`);
                }
            }
        }, 60 * 60 * 1000);
    }

    stop() {
        if (this.dailyBackupInterval) {
            clearInterval(this.dailyBackupInterval);
        }
        if (this.monthlyBackupInterval) {
            clearInterval(this.monthlyBackupInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        console.log('Backup scheduler stopped');
    }

    async runNow(type = 'daily') {
        console.log(`Running ${type} backup now...`);
        
        if (type === 'monthly') {
            return await backupService.createMonthlyBackup();
        }
        
        return await backupService.createIncrementalBackup();
    }
}

module.exports = new BackupScheduler();
