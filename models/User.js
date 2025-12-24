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
}

module.exports = User;