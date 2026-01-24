const {db, auth} = require('../config/firebase')
const bcrypt = require('bcryptjs');
const AuditLog = require('./AuditLog');



class User {

    static async create({name, email, password, role = "student", subject, subjects, schoolId, classYear, parentEmail, parentPassword}){


        const hashedpassword = await bcrypt.hash(password, 10); 

        const userRecord = await auth.createUser({
            email, password, displayName: name
        });

        let subjectArray = null;
        if (role === 'teacher') {
            if (subjects && Array.isArray(subjects)) {
                subjectArray = subjects;
            } else if (subject) {
                subjectArray = [subject]; // Convert single subject to array
            } else {
                subjectArray = [];
            }
        }

        const userData = {
            uid: userRecord.uid, 
            name, 
            email, 
            password: hashedpassword, 
            role,
            schoolId: schoolId || null, 
            classYear: role === 'student'? (classYear || null) : null,
            subjects: role === 'teacher'? subjectArray : null, // Changed to array
            createdAt: new Date(),
            updatedAt: new Date()
        };


        let parentId = null; 
        if(role === 'student' && parentEmail && parentPassword){
            const parentHashedPassword = await bcrypt.hash(parentPassword, 10); 
            const parentRecord = await auth.createUser({
                email: parentEmail, 
                password: parentPassword, 
                displayName:`${name}'s Parent`
            }); 

            const parentData = {
                uid: parentRecord.uid, 
                name: `${name}'s Parent`, 
                email:parentEmail, 
                password: parentHashedPassword, 
                role: 'parent', 
                schoolId: schoolId || null, 
                createdAt: new Date(), 
                updatedAt: new Date()
            }; 

            await db.collection('users').doc(parentRecord.uid).set(parentData); 
            parentId = parentRecord.uid; 

            userData.parentId = parentId; 
            userData.parentEmail = parentEmail; 


         }; 

        await db.collection('users').doc(userRecord.uid).set(userData); 

        return userData
    }
    
    static async getStudentByParentId(parentId){
        const snapshot = await db.collection('users')
        .where('parentId', '==', parentId)
        .get(); 


        if (snapshot.empty){
            return []; 
        }


        return snapshot.docs.map(doc => doc.data()); 
    }


    static async getParentByStudentId(studentId){
        const student  = await this.findbyId(studentId); 
        if(!student?.parentId){
            return null; 
        }
        return await this.findbyId(student.parentId); 
    }


    static async findbyEmail(email){
        const snapshot = await db.collection('users')
            .where('email', "==", email)
            .limit(1)
            .get();

        if (snapshot.empty){
            return null
        }
        return snapshot.docs[0].data();
    }

    static async findbyId(uid){
        const doc = await db.collection('users').doc(uid).get();

        if (!doc.exists){
            return null;
        }

        return doc.data();
    }


    static async comparepassword(candidatePassword, hashedpassword){

        return await bcrypt.compare(candidatePassword, hashedpassword);
    }



    static async getUserByRole(role){
        const snapshot = await db.collection('users')
        .where('role', "==", role)
        .get()

        if (snapshot.empty){
            return [];
        }

        return snapshot.docs.map(doc => doc.data()); 
    }

    static async getUserByRoleAndSchool(role, schoolId){
        const snapshot = await db.collection('users')
        .where('role', "==", role)
        .where('schoolId', "==", schoolId)
        .get()

        if (snapshot.empty){
            return [];
        }

        return snapshot.docs.map(doc => doc.data()); 
    }


    static async addGrade({studentId, studentName, grade, teacherId, teacherName, subject, date, reason = '', teacherRole = 'teacher', ipAddress = null}){

        let gradeDate = new Date();
        if (date) {
            if (typeof date === 'string') {
                gradeDate = new Date(date);
            } else if (date.toDate) {
                gradeDate = date.toDate();
            } else {
                gradeDate = date;
            }
        }
        
        const gradeData = {
            studentId, 
            studentName, 
            grade: Number.parseInt(grade), 
            teacherId, 
            teacherName, 
            subject: subject || 'General', 
            createdAt: gradeDate,
            timestamp: Date.now()
        }; 

        const gradeRef = await db.collection('grades').add(gradeData);

        const student = await this.findbyId(studentId);
        const schoolId = student?.schoolId || null;

        try {
            await AuditLog.create({
                action: 'CREATE',
                entityType: 'GRADE',
                entityId: gradeRef.id,
                userId: teacherId,
                userName: teacherName,
                userRole: teacherRole,
                oldData: null,
                newData: gradeData,
                reason: reason || `Grade ${grade} added for ${subject}`,
                schoolId: schoolId,
                studentId: studentId,
                ipAddress: ipAddress
            });
        } catch (auditError) {
            console.error('Failed to create audit log for grade creation:', auditError);
        }

        return { id: gradeRef.id, ...gradeData}
    }

    static async getStudentGrades(studentId){
        const snapshot = await db.collection('grades')
            .where('studentId', "==", studentId)
            .get()

        if(snapshot.empty){
            return [];
        }

        const grades = snapshot.docs.map(doc => ({
            id: doc.id, 
            ...doc.data()
        }));

        return grades.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
    }

    static async addAbsence({studentId, studentName, teacherId, teacherName, subject, date, type = 'unmotivated', reason = '', teacherRole = 'teacher', ipAddress = null}){
        
        const absenceData = {
            studentId, 
            studentName, 
            teacherId, 
            teacherName, 
            subject: subject || 'General', 
            date: date || new Date(), // Date of absence
            type: type, 
            reason: reason || '',
            createdAt: new Date(),
            timestamp: Date.now()
        }; 

        const absenceRef = await db.collection('absences').add(absenceData);

        const student = await this.findbyId(studentId);
        const schoolId = student?.schoolId || null;

        try {
            await AuditLog.create({
                action: 'CREATE',
                entityType: 'ABSENCE',
                entityId: absenceRef.id,
                userId: teacherId,
                userName: teacherName,
                userRole: teacherRole,
                oldData: null,
                newData: absenceData,
                reason: reason || `Absence marked as ${type}`,
                schoolId: schoolId,
                studentId: studentId,
                ipAddress: ipAddress
            });
        } catch (auditError) {
            console.error('Failed to create audit log for absence creation:', auditError);
        }

        return { id: absenceRef.id, ...absenceData}
    }

    static async getStudentAbsences(studentId){
        const snapshot = await db.collection('absences')
            .where('studentId', "==", studentId)
            .get()

        if(snapshot.empty){
            return [];
        }

        const absences = snapshot.docs.map(doc => ({
            id: doc.id, 
            ...doc.data()
        }));

        return absences.sort((a, b) => {
            const dateA = a.date?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.date?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
    }

    static async updateAbsence(absenceId, {type, reason, teacherId, teacherName, subject, date, userId = null, userName = null, userRole = 'teacher', updateReason = '', ipAddress = null}){
        const { db } = require('../config/firebase')

        const absenceRef = db.collection('absences').doc(absenceId); 
        const absenceDoc = await absenceRef.get(); 

        if(!absenceDoc.exists){
            throw new Error('Absence not found');
        }

        const oldData = { ...absenceDoc.data() };

        const absenceData = {
            type: type || oldData.type,
            reason: reason !== undefined ? reason : oldData.reason,
            teacherId: teacherId || oldData.teacherId,
            teacherName: teacherName || oldData.teacherName,
            subject: subject || oldData.subject,
            date: date || oldData.date,
            updatedAt: new Date()
        }; 

        await absenceRef.update(absenceData);

        const newData = { ...oldData, ...absenceData };

        const studentId = oldData.studentId;
        const student = await this.findbyId(studentId);
        const schoolId = student?.schoolId || null;

        try {
            await AuditLog.create({
                action: 'UPDATE',
                entityType: 'ABSENCE',
                entityId: absenceId,
                userId: userId || teacherId || oldData.teacherId,
                userName: userName || teacherName || oldData.teacherName,
                userRole: userRole,
                oldData: oldData,
                newData: newData,
                reason: updateReason || `Absence updated: type changed from ${oldData.type} to ${type || oldData.type}`,
                schoolId: schoolId,
                studentId: studentId,
                ipAddress: ipAddress
            });
        } catch (auditError) {
            console.error('Failed to create audit log for absence update:', auditError);
        }

        return { id: absenceId, ...oldData, ...absenceData };
    }

    static async deleteAbsence(absenceId, {userId = null, userName = null, userRole = 'teacher', reason = '', ipAddress = null} = {}){
        const { db } = require('../config/firebase')

        const absenceRef = db.collection('absences').doc(absenceId); 
        const absenceDoc = await absenceRef.get(); 

        if(!absenceDoc.exists) {
            throw new Error('Absence not found');
        }

        const oldData = { ...absenceDoc.data() };
        const studentId = oldData.studentId;

        const student = await this.findbyId(studentId);
        const schoolId = student?.schoolId || null;

        await absenceRef.delete();

        try {
            await AuditLog.create({
                action: 'DELETE',
                entityType: 'ABSENCE',
                entityId: absenceId,
                userId: userId || oldData.teacherId,
                userName: userName || oldData.teacherName,
                userRole: userRole,
                oldData: oldData,
                newData: null,
                reason: reason || `Absence deleted`,
                schoolId: schoolId,
                studentId: studentId,
                ipAddress: ipAddress
            });
        } catch (auditError) {
            console.error('Failed to create audit log for absence deletion:', auditError);
        }

        return { id: absenceId, deleted: true };
    }


    static async updateGrade(gradeId, {grade ,subject, teacherId, teacherName, reason = '', teacherRole = 'teacher', ipAddress = null}){

        const { db } = require('../config/firebase')

        const gradeRef = db.collection('grades').doc(gradeId); 
        const gradeDoc = await gradeRef.get(); 

        if(!gradeDoc.exists){
            throw new Error('Grade not found');
        }

        const oldData = { ...gradeDoc.data() };

        const gradeData = {
            grade: Number.parseInt(grade),
            subject: subject || gradeDoc.data().subject,
            teacherId: teacherId || gradeDoc.data().teacherId,
            teacherName: teacherName || gradeDoc.data().teacherName,
            updatedAt: new Date()
        }; 

        await gradeRef.update(gradeData);

        const newData = { ...oldData, ...gradeData };

        const studentId = oldData.studentId;
        const student = await this.findbyId(studentId);
        const schoolId = student?.schoolId || null;

        try {
            await AuditLog.create({
                action: 'UPDATE',
                entityType: 'GRADE',
                entityId: gradeId,
                userId: teacherId || oldData.teacherId,
                userName: teacherName || oldData.teacherName,
                userRole: teacherRole,
                oldData: oldData,
                newData: newData,
                reason: reason || `Grade updated from ${oldData.grade} to ${grade}`,
                schoolId: schoolId,
                studentId: studentId,
                ipAddress: ipAddress
            });
        } catch (auditError) {
            console.error('Failed to create audit log for grade update:', auditError);
        }

        return { id: gradeId, ...gradeDoc.data(), ...gradeData };
    }


    static async _updateAuthEmail(uid, email) {
        await auth.updateUser(uid, { email });
    }

    static async _updateAuthName(uid, name) {
        await auth.updateUser(uid, { displayName: name });
    }

    static async _createParentAccount(parentEmail, parentPassword, studentName, schoolId) {
        const parentHashedPassword = await bcrypt.hash(parentPassword, 10);
        
        const parentRecord = await auth.createUser({
            email: parentEmail,
            password: parentPassword,
            displayName: `${studentName}'s Parent`
        });

        const parentData = {
            uid: parentRecord.uid,
            name: `${studentName}'s Parent`,
            email: parentEmail,
            password: parentHashedPassword,
            role: 'parent',
            schoolId: schoolId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('users').doc(parentRecord.uid).set(parentData);
        return parentRecord.uid;
    }

    static async _updateParentPassword(parentId, newPassword) {
        const parentRef = db.collection('users').doc(parentId);
        const parentDoc = await parentRef.get();
        
        if (!parentDoc.exists) {
            return;
        }

        const parentHashedPassword = await bcrypt.hash(newPassword, 10);
        await auth.updateUser(parentId, { password: newPassword });
        await parentRef.update({
            password: parentHashedPassword,
            updatedAt: new Date()
        });
    }

    static async _handleParentEmailUpdate(updates, currentUser, updateData) {
        if (!updates.parentEmail || updates.parentEmail.trim() === '') {
            updateData.parentId = null;
            updateData.parentEmail = null;
            return null;
        }

        const needsNewParent = !currentUser.parentId || currentUser.parentEmail !== updates.parentEmail;
        
        if (!needsNewParent) {
            return currentUser.parentId;
        }

        const existingParent = await this.findbyEmail(updates.parentEmail);
        
        if (existingParent) {
            updateData.parentId = existingParent.uid;
            updateData.parentEmail = updates.parentEmail;
            return existingParent.uid;
        }

        const parentPassword = updates.parentPassword || Math.random().toString(36).slice(-12);
        const studentName = updates.name || currentUser.name;
        const parentId = await this._createParentAccount(
            updates.parentEmail,
            parentPassword,
            studentName,
            currentUser.schoolId
        );

        updateData.parentId = parentId;
        updateData.parentEmail = updates.parentEmail;
        return parentId;
    }

    static async _handleParentUpdates(updates, currentUser, updateData) {
        const hasParentEmail = updates.hasOwnProperty('parentEmail');
        const hasParentPassword = updates.hasOwnProperty('parentPassword');
        
        if (!hasParentEmail && !hasParentPassword) {
            return;
        }

        let parentId = currentUser.parentId;

        if (hasParentEmail) {
            parentId = await this._handleParentEmailUpdate(updates, currentUser, updateData);
        }

        if (hasParentPassword && parentId) {
            await this._updateParentPassword(parentId, updates.parentPassword);
        }
    }

    static async update(uid, updates) {
        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();
        
        if (!doc.exists) {
            throw new Error('User not found');
        }

        const updateData = {
            ...updates,
            updatedAt: new Date()
        };

        if (updates.email) {
            await this._updateAuthEmail(uid, updates.email);
        }

        if (updates.name) {
            await this._updateAuthName(uid, updates.name);
        }

        const currentUser = doc.data();
        await this._handleParentUpdates(updates, currentUser, updateData);

        await userRef.update(updateData);
        const updatedDoc = await userRef.get();
        return updatedDoc.data();
    }

    static async deleteGrade(gradeId, {userId = null, userName = null, userRole = 'teacher', reason = '', ipAddress = null} = {}){
        const { db } = require('../config/firebase')


        const gradeRef = db.collection('grades').doc(gradeId); 
        const gradeDoc = await gradeRef.get(); 


        if(!gradeDoc.exists) {
            throw new Error('Grade not found');
        }

        const oldData = { ...gradeDoc.data() };
        const studentId = oldData.studentId;

        const student = await this.findbyId(studentId);
        const schoolId = student?.schoolId || null;

        await gradeRef.delete();

        try {
            await AuditLog.create({
                action: 'DELETE',
                entityType: 'GRADE',
                entityId: gradeId,
                userId: userId || oldData.teacherId,
                userName: userName || oldData.teacherName,
                userRole: userRole,
                oldData: oldData,
                newData: null,
                reason: reason || `Grade ${oldData.grade} deleted`,
                schoolId: schoolId,
                studentId: studentId,
                ipAddress: ipAddress
            });
        } catch (auditError) {
            console.error('Failed to create audit log for grade deletion:', auditError);
        }

        return { id: gradeId, deleted: true };
    }

    static _incrementClassYear(classYear) {
        if (!classYear) return null;

        if (/^\d+$/.test(classYear)) {
            const num = Number.parseInt(classYear);
            return (num + 1).toString();
        }

        const match = classYear.match(/^(\d+)([A-Z])?$/);
        if (match) {
            const num = Number.parseInt(match[1]);
            const letter = match[2] || '';
            return (num + 1).toString() + letter;
        }

        return classYear;
    }

    static async _updateStudentClassYears(students) {
        const batch = db.batch();
        let updateCount = 0;
        
        for (const student of students) {
            if (student.classYear) {
                const newClassYear = this._incrementClassYear(student.classYear);
                const studentRef = db.collection('users').doc(student.uid);
                batch.update(studentRef, {
                    classYear: newClassYear,
                    updatedAt: new Date()
                });
                updateCount++;
            }
        }
        
        if (updateCount > 0) {
            await batch.commit();
        }
        
        return updateCount;
    }

    static async _deleteCollectionBatch(collectionName, studentIds, batchSize = 10) {
        let totalDeleted = 0;
        
        for (let i = 0; i < studentIds.length; i += batchSize) {
            const batchIds = studentIds.slice(i, i + batchSize);
            const snapshot = await db.collection(collectionName)
                .where('studentId', 'in', batchIds)
                .get();
            
            if (!snapshot.empty) {
                const deleteBatch = db.batch();
                snapshot.docs.forEach(doc => {
                    deleteBatch.delete(doc.ref);
                });
                await deleteBatch.commit();
                totalDeleted += snapshot.size;
            }
        }
        
        return totalDeleted;
    }

    static async _deleteStudentGradesAndAbsences(studentIds) {
        const [gradesDeleted, absencesDeleted] = await Promise.all([
            this._deleteCollectionBatch('grades', studentIds),
            this._deleteCollectionBatch('absences', studentIds)
        ]);
        
        return { gradesDeleted, absencesDeleted };
    }

    static _updateObjectKeys(obj, incrementFn) {
        const updated = {};
        Object.keys(obj).forEach(oldKey => {
            const newKey = incrementFn(oldKey);
            updated[newKey] = obj[oldKey];
        });
        return updated;
    }

    static async _updateSchoolData(schoolId, incrementFn) {
        const schoolRef = db.collection('schools').doc(schoolId);
        const schoolDoc = await schoolRef.get();
        
        if (!schoolDoc.exists) {
            return;
        }

        const schoolData = schoolDoc.data();
        const updateData = {};
        
        if (schoolData.classes && Array.isArray(schoolData.classes)) {
            updateData.classes = schoolData.classes.map(cls => incrementFn(cls));
        }
        
        if (schoolData.classYearTeachers) {
            updateData.classYearTeachers = this._updateObjectKeys(
                schoolData.classYearTeachers,
                incrementFn
            );
        }
        
        if (schoolData.teacherAssignments) {
            updateData.teacherAssignments = this._updateObjectKeys(
                schoolData.teacherAssignments,
                incrementFn
            );
        }
        
        if (schoolData.classMasters) {
            updateData.classMasters = this._updateObjectKeys(
                schoolData.classMasters,
                incrementFn
            );
        }
        
        if (Object.keys(updateData).length > 0) {
            await schoolRef.update(updateData);
        }
    }

    static async advanceAcademicYear(schoolId) {
        const students = await this.getUserByRoleAndSchool('student', schoolId);
        
        if (students.length === 0) {
            return {
                studentsUpdated: 0,
                gradesDeleted: 0,
                absencesDeleted: 0
            };
        }
        
        const updateCount = await this._updateStudentClassYears(students);
        
        const studentIds = students.map(s => s.uid);
        const { gradesDeleted, absencesDeleted } = await this._deleteStudentGradesAndAbsences(studentIds);
        
        await this._updateSchoolData(schoolId, (classYear) => this._incrementClassYear(classYear));
        
        return {
            studentsUpdated: updateCount,
            gradesDeleted,
            absencesDeleted
        };
    }
}

module.exports = User;