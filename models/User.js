const {db, auth} = require('../config/firebase')
const bcrypt = require('bcryptjs');



class User {

    static async create({name, email, password, role = "student",subject, schoolId, classYear}){


        const hashedpassword = await bcrypt.hash(password, 10); 

        const userRecord = await auth.createUser({
            email, password, displayName: name
        });


        const userData = {
            uid: userRecord.uid, 
            name, 
            email, 
            password: hashedpassword, 
            role,
            schoolId: schoolId || null, 
            classYear: role === 'student'? (classYear || null) : null,
            subject: role === 'teacher'? (subject || null): null, 
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await db.collection('users').doc(userRecord.uid).set(userData); 

        return userData
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
            .orderBy('createdAt', 'desc')
            .get()

        if(snapshot.empty){
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id, 
            ...doc.data()
        })); 


        
    }
}

module.exports = User;