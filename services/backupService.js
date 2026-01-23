const { db } = require('../config/firebase');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

class BackupService {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || './backups';
        this.collectionsToBackup = [
            'users',
            'schools',
            'grades',
            'absences',
            'otp_codes'
        ];
    }

    /**
     * Create backup directory if it doesn't exist
     */
    async ensureBackupDirectory() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            
            // Create subdirectories for different backup types
            await fs.mkdir(path.join(this.backupDir, 'daily'), { recursive: true });
            await fs.mkdir(path.join(this.backupDir, 'monthly'), { recursive: true });
            
            return true;
        } catch (error) {
            console.error('Error creating backup directory:', error);
            return false;
        }
    }

    /**
     * Export a single collection
     */
    async exportCollection(collectionName) {
        const data = [];
        const snapshot = await db.collection(collectionName).get();
        
        snapshot.forEach(doc => {
            data.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return data;
    }

    /**
     * Serialize Firestore data (handle Timestamps, etc.)
     */
    serializeData(data) {
        return JSON.stringify(data, (key, value) => {
            // Convert Firestore Timestamps to ISO strings
            if (value && typeof value === 'object' && value._seconds !== undefined) {
                return new Date(value._seconds * 1000).toISOString();
            }
            return value;
        }, 2);
    }

    /**
     * Create a full backup of all collections
     */
    async createFullBackup(backupType = 'daily') {
        try {
            await this.ensureBackupDirectory();

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, backupType, `backup-${timestamp}.json`);
            
            console.log(`Creating ${backupType} backup...`);
            
            const backupData = {
                timestamp: new Date().toISOString(),
                type: backupType,
                collections: {}
            };

            // Export all collections
            for (const collectionName of this.collectionsToBackup) {
                console.log(`  Exporting ${collectionName}...`);
                backupData.collections[collectionName] = await this.exportCollection(collectionName);
            }

            // Count total documents
            const totalDocs = Object.values(backupData.collections)
                .reduce((sum, collection) => sum + collection.length, 0);

            backupData.metadata = {
                totalCollections: this.collectionsToBackup.length,
                totalDocuments: totalDocs,
                completedAt: new Date().toISOString()
            };

            // Write backup file
            await fs.writeFile(backupPath, this.serializeData(backupData));
            
            const stats = await fs.stat(backupPath);
            const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log(`✓ Backup completed: ${backupPath}`);
            console.log(`  Collections: ${backupData.metadata.totalCollections}`);
            console.log(`  Documents: ${totalDocs}`);
            console.log(`  Size: ${sizeInMB} MB`);

            return {
                success: true,
                path: backupPath,
                metadata: backupData.metadata,
                size: stats.size
            };

        } catch (error) {
            console.error('Backup failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create incremental backup (only changed documents since last backup)
     * Note: For full incremental support, you'd need to track document versions
     * This simplified version creates a full backup but with incremental naming
     */
    async createIncrementalBackup() {
        return this.createFullBackup('daily');
    }

    /**
     * Create monthly backup
     */
    async createMonthlyBackup() {
        return this.createFullBackup('monthly');
    }

    /**
     * Clean up old backups (keep last N backups)
     */
    async cleanupOldBackups(backupType = 'daily', keepCount = 30) {
        try {
            const backupTypeDir = path.join(this.backupDir, backupType);
            const files = await fs.readdir(backupTypeDir);
            
            // Filter backup files and sort by date (newest first)
            const backupFiles = files
                .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
                .sort()
                .reverse();

            // Delete old backups
            if (backupFiles.length > keepCount) {
                const filesToDelete = backupFiles.slice(keepCount);
                
                for (const file of filesToDelete) {
                    const filePath = path.join(backupTypeDir, file);
                    await fs.unlink(filePath);
                    console.log(`Deleted old backup: ${file}`);
                }

                return {
                    success: true,
                    deleted: filesToDelete.length
                };
            }

            return {
                success: true,
                deleted: 0
            };

        } catch (error) {
            console.error('Cleanup failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupPath) {
        try {
            console.log(`Restoring from backup: ${backupPath}`);
            
            const backupContent = await fs.readFile(backupPath, 'utf8');
            const backupData = JSON.parse(backupContent);

            if (!backupData.collections) {
                throw new Error('Invalid backup file format');
            }

            let restoredCount = 0;

            // Restore each collection
            for (const [collectionName, documents] of Object.entries(backupData.collections)) {
                console.log(`  Restoring ${collectionName} (${documents.length} documents)...`);
                
                const batch = db.batch();
                let batchCount = 0;

                for (const doc of documents) {
                    const { id, ...data } = doc;
                    const docRef = db.collection(collectionName).doc(id);
                    batch.set(docRef, data);
                    batchCount++;
                    restoredCount++;

                    // Firestore batch limit is 500
                    if (batchCount === 500) {
                        await batch.commit();
                        batchCount = 0;
                    }
                }

                if (batchCount > 0) {
                    await batch.commit();
                }
            }

            console.log(`✓ Restore completed: ${restoredCount} documents restored`);

            return {
                success: true,
                restored: restoredCount
            };

        } catch (error) {
            console.error('Restore failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List available backups
     */
    async listBackups() {
        try {
            const backups = {
                daily: [],
                monthly: []
            };

            for (const type of ['daily', 'monthly']) {
                const backupTypeDir = path.join(this.backupDir, type);
                
                try {
                    const files = await fs.readdir(backupTypeDir);
                    
                    for (const file of files) {
                        if (file.startsWith('backup-') && file.endsWith('.json')) {
                            const filePath = path.join(backupTypeDir, file);
                            const stats = await fs.stat(filePath);
                            
                            backups[type].push({
                                filename: file,
                                path: filePath,
                                size: stats.size,
                                created: stats.birthtime,
                                modified: stats.mtime
                            });
                        }
                    }
                } catch (error) {
                    // Directory might not exist
                    console.warn(`No ${type} backups found`);
                }
            }

            return backups;

        } catch (error) {
            console.error('Failed to list backups:', error);
            return { daily: [], monthly: [] };
        }
    }

    /**
     * Get backup statistics
     */
    async getBackupStats() {
        const backups = await this.listBackups();
        
        const dailyCount = backups.daily.length;
        const monthlyCount = backups.monthly.length;
        
        const totalSize = [...backups.daily, ...backups.monthly]
            .reduce((sum, backup) => sum + backup.size, 0);

        const latestDaily = backups.daily.length > 0 
            ? backups.daily.sort((a, b) => b.created - a.created)[0]
            : null;

        const latestMonthly = backups.monthly.length > 0
            ? backups.monthly.sort((a, b) => b.created - a.created)[0]
            : null;

        return {
            daily: {
                count: dailyCount,
                latest: latestDaily
            },
            monthly: {
                count: monthlyCount,
                latest: latestMonthly
            },
            totalSize: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
        };
    }
}

module.exports = new BackupService();
