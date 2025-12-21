const {db, auth} = require('../config/firebase'); 
const bcrypt = require("bcryptjs"); 


class School {
    static async create ({name, email, password, schoolName, adress}){
        const hashedpassword = await bcrypt.hash(password, 10); 


        const userRecord = await auth.createUser({
            email,
            password, 
            displayName: name
        }); 


        const defaultSubjects = [
            "Mathematics",
            "English",
            "Science",
            "History",
            "Geography",
            "Physics",
            "Chemistry",
            "Biology",
            "Physical Education",
            "Art",
            "Music",
            "Computer Science",
            "Foreign Language"
        ];

        const schoolData = {
            name: schoolName, 
            adminName: name, 
            adminEmail: email, 
            adress: adress || '', 
            subjects: defaultSubjects,
            createdAt: new Date()
        }; 


        const schoolRef = await db.collection('schools').add(schoolData); 


        const adminData = {
            uid: userRecord.uid, 
            name,
            email, 
            password: hashedpassword, 
            role: 'school_admin', 
            schoolId: schoolRef.id, 
            createdAt: new Date()
        }; 

        await db.collection('users').doc(userRecord.uid).set(adminData); 

        return {school:{id: schoolRef.id, ...schoolData}, admin: adminData };
    }



    static async findById(schoolId){
        const doc = await db.collection('schools').doc(schoolId).get(); 
        if (!doc.exists) return null; 


        const schoolData = doc.data(); 


        if(!schoolData.subjects || schoolData.subjects.length === 0){

            const defaultSubjects = [
                "Mathematics",
                "English",
                "Science",
                "History",
                "Geography",
                "Physics",
                "Chemistry",
                "Biology",
                "Physical Education",
                "Art",
                "Music",
                "Computer Science",
                "Foreign Language"
            ];

            await db.collection('schools').doc(schoolId).update({ 
                subjects: defaultSubjects 
            });
            schoolData.subjects = defaultSubjects;
    }

        return {id: doc.id, ...doc.data()}; 
        
    }


    static async getSchoolUsers(schoolId, role = null){
        let query = db.collection("users").where('schoolId', "==", schoolId);
        if (role){
            query = query.where('role', '==', role);
        }

        const snapshot = await query.get(); 
        return snapshot.docs.map(doc => doc.data()); 
    }

    // Subject Management Methods
    static async addSubject(schoolId, subjectName) {
        const trimmedSubject = subjectName.trim();
        
        if (!trimmedSubject) {
            throw new Error('Subject name cannot be empty');
        }

        const schoolRef = db.collection('schools').doc(schoolId);
        const doc = await schoolRef.get();
        
        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const subjects = schoolData.subjects || [];
        
        // Check for duplicates (case-insensitive)
        if (subjects.some(s => s.toLowerCase() === trimmedSubject.toLowerCase())) {
            throw new Error('Subject already exists');
        }

        subjects.push(trimmedSubject);
        await schoolRef.update({ subjects });
        
        return { id: schoolId, ...schoolData, subjects };
    }

    static async removeSubject(schoolId, subjectName) {
        const schoolRef = db.collection('schools').doc(schoolId);
        const doc = await schoolRef.get();
        
        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const subjects = schoolData.subjects || [];
        
        const updatedSubjects = subjects.filter(s => s !== subjectName);
        await schoolRef.update({ subjects: updatedSubjects });
        
        return { id: schoolId, ...schoolData, subjects: updatedSubjects };
    }

    static async getSubjects(schoolId) {
        const doc = await db.collection('schools').doc(schoolId).get();
        if (!doc.exists) return [];
        
        const data = doc.data();
        return data.subjects || [];
    }

    static async isSubjectInUse(schoolId, subjectName) {
        const query = db.collection('users')
            .where('schoolId', '==', schoolId)
            .where('role', '==', 'teacher')
            .where('subject', '==', subjectName);
        
        const snapshot = await query.get();
        return {
            inUse: !snapshot.empty,
            count: snapshot.size,
            teachers: snapshot.docs.map(doc => ({
                name: doc.data().name,
                email: doc.data().email
            }))
        };
    }


    static async addSubjectToClassYear(schoolId, classYear, subjectName){
        const schoolRef = db.collection('schools').doc(schoolId); 
        const doc = await schoolRef.get();

        if(!doc.exists){
            throw new Error('School not found'); 
        }

        const schoolData = doc.data(); 
        const masterSubjects = schoolData.subjects || []; 
        
        // Validate subject exists in master list
        if (!masterSubjects.includes(subjectName)) {
            throw new Error('Subject does not exist in school master list');
        }

        const classYearSubjects = schoolData.classYearSubjects || {};
        const yearSubjects = classYearSubjects[classYear] || [];

        // Check for duplicates
        if (yearSubjects.includes(subjectName)){
            throw new Error('Subject already assigned to this class year');
        }

        yearSubjects.push(subjectName);
        classYearSubjects[classYear] = yearSubjects;

        await schoolRef.update({classYearSubjects}); 
        return classYearSubjects; 
    }

    static async removeSubjectFromClassYear(schoolId, classYear, subjectName){
        const schoolRef = db.collection('schools').doc(schoolId); 
        const doc = await schoolRef.get();

        if(!doc.exists){
            throw new Error('School not found'); 
        }

        const schoolData = doc.data(); 
        const classYearSubjects = schoolData.classYearSubjects || {};
        const yearSubjects = classYearSubjects[classYear] || [];

        classYearSubjects[classYear] = yearSubjects.filter(s => s !== subjectName);

        await schoolRef.update({classYearSubjects}); 
        return classYearSubjects; 
    }

    static async getClassYearSubjects(schoolId, classYear){
        const doc = await db.collection('schools').doc(schoolId).get(); 
        if (!doc.exists) return []; 

        const data = doc.data(); 
        const classYearSubjects = data.classYearSubjects || {}; 
        return classYearSubjects[classYear] || [];
    }


    // Teacher Assignment Methods - Simplified
    static async assignTeacherToClass(schoolId, classYear, teacherId) {
        const schoolRef = db.collection("schools").doc(schoolId);
        const doc = await schoolRef.get();

        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const classYearTeachers = schoolData.classYearTeachers || {};
        
        if (!classYearTeachers[classYear]) {
            classYearTeachers[classYear] = [];
        }
        
        // Check if teacher is already assigned to this class
        if (!classYearTeachers[classYear].includes(teacherId)) {
            classYearTeachers[classYear].push(teacherId);
        }
        
        await schoolRef.update({ classYearTeachers });
        return classYearTeachers;
    }

    static async removeTeacherFromClass(schoolId, classYear, teacherId) {
        const schoolRef = db.collection("schools").doc(schoolId);
        const doc = await schoolRef.get();

        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const classYearTeachers = schoolData.classYearTeachers || {};

        if (classYearTeachers[classYear]) {
            classYearTeachers[classYear] = classYearTeachers[classYear].filter(id => id !== teacherId);
        }

        await schoolRef.update({ classYearTeachers });
        return classYearTeachers;
    }

    static async getTeachersForClass(schoolId, classYear) {
        const doc = await db.collection('schools').doc(schoolId).get();
        if (!doc.exists) return [];
        
        const data = doc.data();
        const classYearTeachers = data.classYearTeachers || {};
        
        return classYearTeachers[classYear] || [];
    }
}


module.exports = School;