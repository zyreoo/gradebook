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


    static async addGrade({studentId, studentName, grade, teacherId, teacherName, subject}){
        
        const gradeData = {
            studentId, 
            studentName, 
            grade: parseInt(grade), 
            teacherId, 
            teacherName, 
            subject: subject || 'General', 
            createdAt: new Date(),
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

        // If email is being updated, also update in Firebase Auth
        if (updates.email) {
            await auth.updateUser(uid, {
                email: updates.email
            });
        }

        // If name is being updated, also update displayName in Firebase Auth
        if (updates.name) {
            await auth.updateUser(uid, {
                displayName: updates.name
            });
        }

        // If updating parent email/password, handle parent account
        if (updates.parentEmail || updates.parentPassword) {
            const currentUser = doc.data();
            let parentId = currentUser.parentId;

            if (updates.parentEmail) {
                // Check if parent email changed or parent doesn't exist
                if (!parentId || currentUser.parentEmail !== updates.parentEmail) {
                    // Check if parent already exists with this email
                    const existingParent = await this.findbyEmail(updates.parentEmail);
                    
                    if (existingParent) {
                        // Use existing parent
                        parentId = existingParent.uid;
                    } else {
                        // Create new parent account
                        const parentPassword = updates.parentPassword || Math.random().toString(36).slice(-12);
                        const parentHashedPassword = await bcrypt.hash(parentPassword, 10);
                        
                        const parentRecord = await auth.createUser({
                            email: updates.parentEmail,
                            password: parentPassword,
                            displayName: `${updates.name || currentUser.name}'s Parent`
                        });

                        const parentData = {
                            uid: parentRecord.uid,
                            name: `${updates.name || currentUser.name}'s Parent`,
                            email: updates.parentEmail,
                            password: parentHashedPassword,
                            role: 'parent',
                            schoolId: currentUser.schoolId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };

                        await db.collection('users').doc(parentRecord.uid).set(parentData);
                        parentId = parentRecord.uid;
                    }
                    
                    updateData.parentId = parentId;
                    updateData.parentEmail = updates.parentEmail;
                }
            }

            // If updating parent password and parent exists
            if (updates.parentPassword && parentId) {
                const parentRef = db.collection('users').doc(parentId);
                const parentDoc = await parentRef.get();
                
                if (parentDoc.exists) {
                    const parentHashedPassword = await bcrypt.hash(updates.parentPassword, 10);
                    await auth.updateUser(parentId, {
                        password: updates.parentPassword
                    });
                    await parentRef.update({
                        password: parentHashedPassword,
                        updatedAt: new Date()
                    });
                }
            }
        }

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

    static async advanceAcademicYear(schoolId) {
        // Get all students for this school
        const students = await this.getUserByRoleAndSchool('student', schoolId);
        
        if (students.length === 0) {
            return {
                studentsUpdated: 0,
                gradesDeleted: 0,
                absencesDeleted: 0
            };
        }
        
        // Function to increment class year (handles both "5" and "10A" formats)
        function incrementClassYear(classYear) {
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
        
        // Update all students
        const batch = db.batch();
        let updateCount = 0;
        
        for (const student of students) {
            if (student.classYear) {
                const newClassYear = incrementClassYear(student.classYear);
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
        
        // Delete all grades and absences for students in this school
        // Firestore 'in' query has a limit of 10 items, so we need to batch
        const studentIds = students.map(s => s.uid);
        let totalGradesDeleted = 0;
        let totalAbsencesDeleted = 0;
        
        // Process in batches of 10
        for (let i = 0; i < studentIds.length; i += 10) {
            const batchIds = studentIds.slice(i, i + 10);
            
            // Delete grades
            const gradeSnapshot = await db.collection('grades')
                .where('studentId', 'in', batchIds)
                .get();
            
            if (!gradeSnapshot.empty) {
                const gradeBatch = db.batch();
                gradeSnapshot.docs.forEach(doc => {
                    gradeBatch.delete(doc.ref);
                });
                await gradeBatch.commit();
                totalGradesDeleted += gradeSnapshot.size;
            }
            
            // Delete absences
            const absenceSnapshot = await db.collection('absences')
                .where('studentId', 'in', batchIds)
                .get();
            
            if (!absenceSnapshot.empty) {
                const absenceBatch = db.batch();
                absenceSnapshot.docs.forEach(doc => {
                    absenceBatch.delete(doc.ref);
                });
                await absenceBatch.commit();
                totalAbsencesDeleted += absenceSnapshot.size;
            }
        }
        
        // Update School classes and teacher assignments
        const schoolRef = db.collection('schools').doc(schoolId);
        const schoolDoc = await schoolRef.get();
        
        if (schoolDoc.exists) {
            const schoolData = schoolDoc.data();
            const updateData = {};
            
            // Update explicit classes array
            if (schoolData.classes && Array.isArray(schoolData.classes)) {
                const updatedClasses = schoolData.classes.map(cls => incrementClassYear(cls));
                updateData.classes = updatedClasses;
            }
            
            // Update classYearTeachers object (keys are class names)
            if (schoolData.classYearTeachers) {
                const updatedClassYearTeachers = {};
                Object.keys(schoolData.classYearTeachers).forEach(oldClass => {
                    const newClass = incrementClassYear(oldClass);
                    updatedClassYearTeachers[newClass] = schoolData.classYearTeachers[oldClass];
                });
                updateData.classYearTeachers = updatedClassYearTeachers;
            }
            
            // Update teacherAssignments object (keys are class names)
            if (schoolData.teacherAssignments) {
                const updatedTeacherAssignments = {};
                Object.keys(schoolData.teacherAssignments).forEach(oldClass => {
                    const newClass = incrementClassYear(oldClass);
                    updatedTeacherAssignments[newClass] = schoolData.teacherAssignments[oldClass];
                });
                updateData.teacherAssignments = updatedTeacherAssignments;
            }
            
            // Update classMasters object (keys are class names)
            if (schoolData.classMasters) {
                const updatedClassMasters = {};
                Object.keys(schoolData.classMasters).forEach(oldClass => {
                    const newClass = incrementClassYear(oldClass);
                    updatedClassMasters[newClass] = schoolData.classMasters[oldClass];
                });
                updateData.classMasters = updatedClassMasters;
            }
            
            // Apply all school updates if any
            if (Object.keys(updateData).length > 0) {
                await schoolRef.update(updateData);
            }
        }
        
        return {
            studentsUpdated: updateCount,
            gradesDeleted: totalGradesDeleted,
            absencesDeleted: totalAbsencesDeleted
        };
    }
}

module.exports = User;