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


        const schoolData = {
            name: schoolName, 
            adminName: name, 
            adminEmail: email, 
            adress: adress || '', 
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
}


module.exports = School;