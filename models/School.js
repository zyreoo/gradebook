const {db, auth} = require('../config/firebase'); 
const bcrypt = require("bcryptjs"); 


class School {
    static async create ({name, email, password, schoolName, adress}){
        const hashedpassword = await bcrypt.hash(password, 10); 

        // Capitalize each word of the school name
        const formattedSchoolName = schoolName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

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
            name: formattedSchoolName, 
            adminName: name, 
            adminEmail: email, 
            adress: adress || '', 
            subjects: defaultSubjects,
            classes: [], 
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

        // Capitalize first letter of each word (e.g., "mathematics" -> "Mathematics", "physical education" -> "Physical Education")
        const capitalized = trimmedSubject
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');

        const schoolRef = db.collection('schools').doc(schoolId);
        const doc = await schoolRef.get();
        
        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const subjects = schoolData.subjects || [];
        
        // Check for duplicates (case-insensitive)
        if (subjects.some(s => s.toLowerCase() === capitalized.toLowerCase())) {
            throw new Error('Subject already exists');
        }

        subjects.push(capitalized);
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


    // Teacher Assignment Methods with Subject Support
    static async assignTeacherToClass(schoolId, classYear, teacherId, subjects = []) {
        const schoolRef = db.collection("schools").doc(schoolId);
        const doc = await schoolRef.get();

        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const classYearTeachers = schoolData.classYearTeachers || {};
        const teacherAssignments = schoolData.teacherAssignments || {};
        
        // Initialize class year arrays if they don't exist
        if (!classYearTeachers[classYear]) {
            classYearTeachers[classYear] = [];
        }
        if (!teacherAssignments[classYear]) {
            teacherAssignments[classYear] = {};
        }
        
        // Check if teacher is already assigned to this class
        if (!classYearTeachers[classYear].includes(teacherId)) {
            classYearTeachers[classYear].push(teacherId);
        }
        
        // Store subject-specific assignment
        teacherAssignments[classYear][teacherId] = {
            subjects: subjects || []
        };
        
        await schoolRef.update({ 
            classYearTeachers,
            teacherAssignments
        });
        
        return { classYearTeachers, teacherAssignments };
    }

    static async removeTeacherFromClass(schoolId, classYear, teacherId) {
        const schoolRef = db.collection("schools").doc(schoolId);
        const doc = await schoolRef.get();

        if (!doc.exists) {
            throw new Error('School not found');
        }

        const schoolData = doc.data();
        const classYearTeachers = schoolData.classYearTeachers || {};
        const teacherAssignments = schoolData.teacherAssignments || {};

        // Remove from classYearTeachers array
        if (classYearTeachers[classYear]) {
            classYearTeachers[classYear] = classYearTeachers[classYear].filter(id => id !== teacherId);
        }

        // Remove from teacherAssignments
        if (teacherAssignments[classYear]?.[teacherId]) {
            delete teacherAssignments[classYear][teacherId];
        }

        await schoolRef.update({ 
            classYearTeachers,
            teacherAssignments
        });
        
        return { classYearTeachers, teacherAssignments };
    }

    static async getTeachersForClass(schoolId, classYear) {
        const doc = await db.collection('schools').doc(schoolId).get();
        if (!doc.exists) return [];
        
        const data = doc.data();
        const classYearTeachers = data.classYearTeachers || {};
        
        return classYearTeachers[classYear] || [];
    }

    static async getTeacherAssignmentSubjects(schoolId, classYear, teacherId) {
        const doc = await db.collection('schools').doc(schoolId).get();
        if (!doc.exists) return [];
        
        const data = doc.data();
        const teacherAssignments = data.teacherAssignments || {};
        
        if (teacherAssignments[classYear]?.[teacherId]) {
            return teacherAssignments[classYear][teacherId].subjects || [];
        }
        
        return [];
    }


    static async addClass(schoolId, className){
        const trimmed = (className || '').trim(); 
        if (!trimmed) throw new Error('Class name cannot be empty');

        // Capitalize the class name (e.g., "9a" -> "9A", "10b" -> "10B")
        const capitalized = trimmed.toUpperCase();

        const schoolRef = db.collection('schools').doc(schoolId); 
        const doc = await schoolRef.get(); 

        if(!doc.exists) throw new Error('School not found');

        const data = doc.data();
        const classes = data.classes || []; 

        // Check if class already exists in explicit classes
        // If it only exists as implicit (auto-created through teacher assignments),
        // we'll add it to explicit classes to convert it to explicit
        if(classes.some(c => c.toLowerCase() === capitalized.toLowerCase())){
            throw new Error('Class already exists');
        }

        classes.push(capitalized);
        await schoolRef.update({ classes });

    return classes;
    }



    static async removeClass(schoolId, className){
        const schoolRef = db.collection('schools').doc(schoolId); 
        const doc = await schoolRef.get();

        if (!doc.exists) throw new Error('School not found');

        const data = doc.data(); 
        const classes = data.classes || [];
        const classYearTeachers = data.classYearTeachers || {};
        const teacherAssignments = data.teacherAssignments || {};
        const classMasters = data.classMasters || {};
        
        // Normalize class name for comparison (uppercase)
        const normalizedClassName = (className || '').trim().toUpperCase();
        
        // Find the actual class name key (might be different case)
        const actualClassName = Object.keys(classYearTeachers).find(
            key => key.toUpperCase() === normalizedClassName
        ) || normalizedClassName;
        
        // Remove from explicit classes array
        const updated = classes.filter(c => c !== className && c !== actualClassName);
        
        // Prepare update object
        const updateData = { classes: updated };
        
        // Remove from classYearTeachers if it exists
        if (classYearTeachers[actualClassName]) {
            delete classYearTeachers[actualClassName];
            updateData.classYearTeachers = classYearTeachers;
        }
        
        // Remove from teacherAssignments if it exists
        if (teacherAssignments[actualClassName]) {
            delete teacherAssignments[actualClassName];
            updateData.teacherAssignments = teacherAssignments;
        }
        
        // Remove from classMasters if it exists (check both exact and uppercase)
        const classMasterKeys = Object.keys(classMasters);
        const classMasterKey = classMasterKeys.find(
            key => key.toUpperCase() === normalizedClassName
        );
        if (classMasterKey) {
            delete classMasters[classMasterKey];
            updateData.classMasters = classMasters;
        }

        await schoolRef.update(updateData);
        
        // Update all students who have this classYear - set it to null
        const User = require('./User');
        const allStudents = await User.getUserByRoleAndSchool('student', schoolId);
        const studentsToUpdate = allStudents.filter(student => {
            const studentClassYear = (student.classYear || '').trim().toUpperCase();
            return studentClassYear === normalizedClassName || 
                   studentClassYear === actualClassName.toUpperCase() ||
                   studentClassYear === className.toUpperCase();
        });
        
        if (studentsToUpdate.length > 0) {
            const userBatch = db.batch();
            studentsToUpdate.forEach(student => {
                const studentRef = db.collection('users').doc(student.uid);
                userBatch.update(studentRef, {
                    classYear: null,
                    updatedAt: new Date()
                });
            });
            await userBatch.commit();
        }
        
        return updated; 
    }


    static async getClasses(schoolId){
        const doc = await db.collection('schools').doc(schoolId).get(); 
        if(!doc.exists) return []; 
        const data = doc.data(); 
        return data.classes || []; 
    }

    static async assignClassmaster(schoolId, className, teacherId){
        const schoolRef = db.collection('schools').doc(schoolId); 
        const doc = await schoolRef.get();

        if(!doc.exists){
            throw new Error('School not found');
        }

        const schoolData = doc.data(); 
        const classMasters = schoolData.classMasters || {}; 

        classMasters[className] = teacherId; 
        await schoolRef.update({classMasters}); 
        
        return classMasters; 
    }

    static async removeClassmaster(schoolId, className){
        const schoolRef = db.collection('schools').doc(schoolId); 
        const doc = await schoolRef.get(); 


        if(!doc.exists){
            throw new Error('School not found');
        }


        const schoolData = doc.data(); 
        const classMasters = schoolData.classMasters || {}; 

        delete classMasters[className]; 
        await schoolRef.update({classMasters}); 
        
        return classMasters; 
    }


    static async getClassmaster(schoolId, className){
        const doc = await db.collection('schools').doc(schoolId).get(); 

        if(!doc.exists) return null; 

        const data = doc.data(); 
        const classMasters = data.classMasters || {}; 
        return classMasters[className] || null ; 
    }


    static async getClassesByClassmaster(schoolId, teacherId){
        const doc = await db.collection('schools').doc(schoolId).get(); 

        if (!doc.exists) return []; 


        const data = doc.data(); 
        const classMasters = data.classMasters || {}; 
        const classes = []; 

        for (const [className, masterId] of Object.entries(classMasters)){
            if(masterId === teacherId){
                classes.push(className); 
            }
        }

        return classes; 
    }
}


module.exports = School;