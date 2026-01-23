const {db, auth} = require('../config/firebase')
const bcrypt = require('bcryptjs');



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
        if(!student || !student.parentId){
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


    static async addGrade({studentId, studentName, grade, teacherId, teacherName, subject, date}){
        
        // If date is provided, use it; otherwise use current date
        let gradeDate = new Date();
        if (date) {
            // If date is a string, parse it
            if (typeof date === 'string') {
                gradeDate = new Date(date);
            } else if (date.toDate) {
                // If it's a Firestore timestamp, convert it
                gradeDate = date.toDate();
            } else {
                gradeDate = date;
            }
        }
        
        const gradeData = {
            studentId, 
            studentName, 
            grade: parseInt(grade), 
            teacherId, 
            teacherName, 
            subject: subject || 'General', 
            createdAt: gradeDate,
            timestamp: Date.now()
        }; 

        const gradeRef = await db.collection('grades').add(gradeData);

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

        // Sort by createdAt in JavaScript (descending - newest first)
        return grades.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
    }

    static async addAbsence({studentId, studentName, teacherId, teacherName, subject, date, type = 'unmotivated', reason = ''}){
        
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

        // Sort by date in descending order (newest first)
        return absences.sort((a, b) => {
            const dateA = a.date?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.date?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
    }


    static async updateGrade(gradeId, {grade ,subject, teacherId,teacherName}){

        const { db } = require('../config/firebase')

        const gradeRef = db.collection('grades').doc(gradeId); 
        const gradeDoc = await gradeRef.get(); 

        if(!gradeDoc.exists){
            throw new Error('Grade not found');
        }

        const gradeData = {
            grade: parseInt(grade),
            subject: subject || gradeDoc.data().subject,
            teacherId: teacherId || gradeDoc.data().teacherId,
            teacherName: teacherName || gradeDoc.data().teacherName,
            updatedAt: new Date()
        }; 

        await gradeRef.update(gradeData);
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
        // Handle clearing parent association
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

    static async deleteGrade(gradeId){
        const { db } = require('../config/firebase')


        const gradeRef = db.collection('grades').doc(gradeId); 
        const gradeDoc = await gradeRef.get(); 


        if(!gradeDoc.exists) {
            throw new Error('Grade not found');
        }


        await gradeRef.delete(); 
        return { id: gradeId, deleted: true };
    }

    static _incrementClassYear(classYear) {
        if (!classYear) return null;
        
        // Handle numeric: "5" -> "6"
        if (/^\d+$/.test(classYear)) {
            const num = parseInt(classYear);
            return (num + 1).toString();
        }
        
        // Handle class names: "9A" -> "10A", "10B" -> "11B"
        const match = classYear.match(/^(\d+)([A-Z])?$/);
        if (match) {
            const num = parseInt(match[1]);
            const letter = match[2] || '';
            return (num + 1).toString() + letter;
        }
        
        // Fallback: can't parse, return as is
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