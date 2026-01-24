const { db } = require('../config/firebase');

/**
 * AuditLog Model - Immutable audit trail for all grade and absence modifications
 * Implements Article 16 compliance requirements
 */
class AuditLog {
    /**
     * Creates an audit log entry
     * @param {Object} params
     * @param {string} params.action - Type of action: 'CREATE', 'UPDATE', 'DELETE'
     * @param {string} params.entityType - Type of entity: 'GRADE', 'ABSENCE'
     * @param {string} params.entityId - ID of the grade/absence being modified
     * @param {string} params.userId - ID of user performing the action
     * @param {string} params.userName - Name of user performing the action
     * @param {string} params.userRole - Role of user (teacher, school_admin, etc.)
     * @param {Object} params.oldData - Previous state (null for CREATE)
     * @param {Object} params.newData - New state (null for DELETE)
     * @param {string} params.reason - Reason for the change (optional)
     * @param {string} params.schoolId - School ID for filtering
     * @param {string} params.studentId - Student ID for filtering
     * @param {string} params.ipAddress - IP address of the user (optional)
     * @returns {Promise<Object>} The created audit log entry
     */
    static async create({
        action,
        entityType,
        entityId,
        userId,
        userName,
        userRole,
        oldData = null,
        newData = null,
        reason = '',
        schoolId = null,
        studentId = null,
        ipAddress = null
    }) {
        // Validate required fields
        if (!action || !entityType || !entityId || !userId || !userName) {
            throw new Error('Missing required audit log fields');
        }

        // Validate action type
        const validActions = ['CREATE', 'UPDATE', 'DELETE'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action type: ${action}`);
        }

        // Validate entity type
        const validEntityTypes = ['GRADE', 'ABSENCE'];
        if (!validEntityTypes.includes(entityType)) {
            throw new Error(`Invalid entity type: ${entityType}`);
        }

        const auditData = {
            // Action information
            action,
            entityType,
            entityId,

            // User information
            userId,
            userName,
            userRole,

            // Data changes
            oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null, // Deep clone
            newData: newData ? JSON.parse(JSON.stringify(newData)) : null, // Deep clone
            
            // Additional context
            reason: reason || '',
            schoolId,
            studentId,
            ipAddress,

            // Timestamp (immutable)
            timestamp: new Date(),
            timestampMs: Date.now(),

            // Integrity check (simple hash for verification)
            checksum: this._generateChecksum({
                action,
                entityType,
                entityId,
                userId,
                oldData,
                newData,
                timestamp: Date.now()
            })
        };

        const auditRef = await db.collection('audit_logs').add(auditData);

        return { id: auditRef.id, ...auditData };
    }

    /**
     * Get audit logs for a specific entity
     * @param {string} entityType - 'GRADE' or 'ABSENCE'
     * @param {string} entityId - ID of the entity
     * @returns {Promise<Array>} Array of audit log entries
     */
    static async getByEntity(entityType, entityId) {
        const snapshot = await db.collection('audit_logs')
            .where('entityType', '==', entityType)
            .where('entityId', '==', entityId)
            .orderBy('timestamp', 'desc')
            .get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Get audit logs for a specific student
     * @param {string} studentId - Student ID
     * @param {Object} options - Query options
     * @param {string} options.entityType - Filter by entity type
     * @param {Date} options.startDate - Filter from this date
     * @param {Date} options.endDate - Filter to this date
     * @param {number} options.limit - Max number of results
     * @returns {Promise<Array>} Array of audit log entries
     */
    static async getByStudent(studentId, options = {}) {
        let query = db.collection('audit_logs')
            .where('studentId', '==', studentId);

        if (options.entityType) {
            query = query.where('entityType', '==', options.entityType);
        }

        if (options.startDate) {
            query = query.where('timestamp', '>=', options.startDate);
        }

        if (options.endDate) {
            query = query.where('timestamp', '<=', options.endDate);
        }

        query = query.orderBy('timestamp', 'desc');

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Get audit logs for a specific school
     * @param {string} schoolId - School ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of audit log entries
     */
    static async getBySchool(schoolId, options = {}) {
        let query = db.collection('audit_logs')
            .where('schoolId', '==', schoolId);

        if (options.entityType) {
            query = query.where('entityType', '==', options.entityType);
        }

        if (options.action) {
            query = query.where('action', '==', options.action);
        }

        if (options.userId) {
            query = query.where('userId', '==', options.userId);
        }

        if (options.startDate) {
            query = query.where('timestamp', '>=', options.startDate);
        }

        query = query.orderBy('timestamp', 'desc');

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Get audit logs by user (who made the changes)
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of audit log entries
     */
    static async getByUser(userId, options = {}) {
        let query = db.collection('audit_logs')
            .where('userId', '==', userId);

        if (options.entityType) {
            query = query.where('entityType', '==', options.entityType);
        }

        if (options.action) {
            query = query.where('action', '==', options.action);
        }

        query = query.orderBy('timestamp', 'desc');

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Get recent audit logs across the system
     * @param {number} limit - Maximum number of results
     * @param {Object} filters - Optional filters
     * @returns {Promise<Array>} Array of audit log entries
     */
    static async getRecent(limit = 50, filters = {}) {
        let query = db.collection('audit_logs');

        if (filters.schoolId) {
            query = query.where('schoolId', '==', filters.schoolId);
        }

        if (filters.entityType) {
            query = query.where('entityType', '==', filters.entityType);
        }

        if (filters.action) {
            query = query.where('action', '==', filters.action);
        }

        query = query.orderBy('timestamp', 'desc').limit(limit);

        const snapshot = await query.get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Get complete history for a specific grade or absence with diff
     * @param {string} entityType - 'GRADE' or 'ABSENCE'
     * @param {string} entityId - ID of the entity
     * @returns {Promise<Object>} History with changes timeline
     */
    static async getEntityHistory(entityType, entityId) {
        const logs = await this.getByEntity(entityType, entityId);

        if (logs.length === 0) {
            return {
                entityType,
                entityId,
                totalChanges: 0,
                history: []
            };
        }

        // Build a timeline with changes
        const timeline = logs.map((log, index) => {
            const changes = [];
            
            if (log.action === 'UPDATE' && log.oldData && log.newData) {
                // Calculate what changed
                const oldData = log.oldData;
                const newData = log.newData;
                
                for (const key in newData) {
                    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
                        changes.push({
                            field: key,
                            oldValue: oldData[key],
                            newValue: newData[key]
                        });
                    }
                }
            }

            return {
                ...log,
                changes,
                sequenceNumber: logs.length - index // Newest = 1
            };
        });

        return {
            entityType,
            entityId,
            totalChanges: logs.length,
            createdBy: logs[logs.length - 1]?.userName,
            createdAt: logs[logs.length - 1]?.timestamp,
            lastModifiedBy: logs[0]?.userName,
            lastModifiedAt: logs[0]?.timestamp,
            history: timeline
        };
    }

    /**
     * Verify audit log integrity
     * @param {string} auditLogId - Audit log entry ID
     * @returns {Promise<Object>} Verification result
     */
    static async verifyIntegrity(auditLogId) {
        const doc = await db.collection('audit_logs').doc(auditLogId).get();

        if (!doc.exists) {
            return {
                valid: false,
                error: 'Audit log not found'
            };
        }

        const data = doc.data();
        const storedChecksum = data.checksum;
        
        const calculatedChecksum = this._generateChecksum({
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            userId: data.userId,
            oldData: data.oldData,
            newData: data.newData,
            timestamp: data.timestampMs
        });

        return {
            valid: storedChecksum === calculatedChecksum,
            auditLogId,
            storedChecksum,
            calculatedChecksum,
            timestamp: data.timestamp
        };
    }

    /**
     * Generate a simple checksum for integrity verification
     * @private
     */
    static _generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get audit statistics for a school
     * @param {string} schoolId - School ID
     * @param {Date} startDate - Start date for stats
     * @param {Date} endDate - End date for stats
     * @returns {Promise<Object>} Statistics object
     */
    static async getStatistics(schoolId, startDate = null, endDate = null) {
        let query = db.collection('audit_logs')
            .where('schoolId', '==', schoolId);

        if (startDate) {
            query = query.where('timestamp', '>=', startDate);
        }

        if (endDate) {
            query = query.where('timestamp', '<=', endDate);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return {
                totalLogs: 0,
                byAction: {},
                byEntityType: {},
                byUser: {}
            };
        }

        const logs = snapshot.docs.map(doc => doc.data());

        const stats = {
            totalLogs: logs.length,
            byAction: {},
            byEntityType: {},
            byUser: {},
            byDate: {}
        };

        logs.forEach(log => {
            // Count by action
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

            // Count by entity type
            stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;

            // Count by user
            const userKey = `${log.userName} (${log.userId})`;
            stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;

            // Count by date
            const dateKey = log.timestamp.toDate().toISOString().split('T')[0];
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
        });

        return stats;
    }
}

module.exports = AuditLog;
