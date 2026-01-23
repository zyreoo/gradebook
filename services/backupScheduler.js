const backupService = require('./backupService');

class BackupScheduler {
    constructor() {
        this.dailyBackupInterval = null;
        this.monthlyBackupInterval = null;
        this.cleanupInterval = null;
    }

    /**
     * Start automated backup schedule
     */
    start() {
        console.log('Starting backup scheduler...');

        // Daily incremental backup at 2 AM
        this.scheduleDailyBackup();

        // Monthly full backup on 1st of month at 3 AM
        this.scheduleMonthlyBackup();

        // Cleanup old backups daily at 4 AM
        this.scheduleCleanup();

        console.log('✓ Backup scheduler started');
        console.log('  Daily backups: Every day at 2:00 AM');
        console.log('  Monthly backups: 1st of month at 3:00 AM');
        console.log('  Cleanup: Every day at 4:00 AM (keep last 30 daily, 12 monthly)');
    }

    /**
     * Schedule daily incremental backups
     */
    scheduleDailyBackup() {
        // Check every hour if it's time for daily backup
        this.dailyBackupInterval = setInterval(async () => {
            const now = new Date();
            
            // Run at 2 AM
            if (now.getHours() === 2 && now.getMinutes() < 60) {
                console.log('\n=== Running Daily Backup ===');
                const result = await backupService.createIncrementalBackup();
                
                if (result.success) {
                    console.log('✓ Daily backup completed successfully');
                } else {
                    console.error('✗ Daily backup failed:', result.error);
                }
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    /**
     * Schedule monthly full backups
     */
    scheduleMonthlyBackup() {
        // Check every hour if it's time for monthly backup
        this.monthlyBackupInterval = setInterval(async () => {
            const now = new Date();
            
            // Run on 1st day of month at 3 AM
            if (now.getDate() === 1 && now.getHours() === 3 && now.getMinutes() < 60) {
                console.log('\n=== Running Monthly Backup ===');
                const result = await backupService.createMonthlyBackup();
                
                if (result.success) {
                    console.log('✓ Monthly backup completed successfully');
                } else {
                    console.error('✗ Monthly backup failed:', result.error);
                }
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    /**
     * Schedule cleanup of old backups
     */
    scheduleCleanup() {
        // Check every hour if it's time for cleanup
        this.cleanupInterval = setInterval(async () => {
            const now = new Date();
            
            // Run at 4 AM
            if (now.getHours() === 4 && now.getMinutes() < 60) {
                console.log('\n=== Running Backup Cleanup ===');
                
                // Keep last 30 daily backups
                const dailyResult = await backupService.cleanupOldBackups('daily', 30);
                if (dailyResult.success && dailyResult.deleted > 0) {
                    console.log(`✓ Cleaned up ${dailyResult.deleted} old daily backups`);
                }
                
                // Keep last 12 monthly backups (1 year)
                const monthlyResult = await backupService.cleanupOldBackups('monthly', 12);
                if (monthlyResult.success && monthlyResult.deleted > 0) {
                    console.log(`✓ Cleaned up ${monthlyResult.deleted} old monthly backups`);
                }
            }
        }, 60 * 60 * 1000); // Check every hour
    }

    /**
     * Stop all scheduled tasks
     */
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

    /**
     * Run backup immediately (for testing)
     */
    async runNow(type = 'daily') {
        console.log(`Running ${type} backup now...`);
        
        if (type === 'monthly') {
            return await backupService.createMonthlyBackup();
        }
        
        return await backupService.createIncrementalBackup();
    }
}

module.exports = new BackupScheduler();
