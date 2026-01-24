const { db } = require('../config/firebase');

class AuditLog {
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
        if (!action || !entityType || !entityId || !userId || !userName) {
            throw new Error('Missing required audit log fields');
        }

        const validActions = ['CREATE', 'UPDATE', 'DELETE'];
        if (!validActions.includes(action)) {
            throw new Error(`Invalid action type: ${action}`);
        }

        const validEntityTypes = ['GRADE', 'ABSENCE'];
        if (!validEntityTypes.includes(entityType)) {
            throw new Error(`Invalid entity type: ${entityType}`);
        }

        const auditData = {
            action,
            entityType,
            entityId,
            userId,
            userName,
            userRole,
            oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
            newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
            reason: reason || '',
            schoolId,
            studentId,
            ipAddress,
            timestamp: new Date(),
            timestampMs: Date.now(),
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

        const timeline = logs.map((log, index) => {
            const changes = [];

            if (log.action === 'UPDATE' && log.oldData && log.newData) {
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
                sequenceNumber: logs.length - index
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

    static _generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

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
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
            stats.byEntityType[log.entityType] = (stats.byEntityType[log.entityType] || 0) + 1;
            const userKey = `${log.userName} (${log.userId})`;
            stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;
            const dateKey = log.timestamp.toDate().toISOString().split('T')[0];
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
        });

        return stats;
    }
}

module.exports = AuditLog;
