const { collectMeta } = require('next/dist/build/utils');
const {db, auth} = require('../config/firebase')
const bcrypt = require('bcryptjs');



class User {


    static async create({name, email, password, role =  "student "}){


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
}

module.exports = User;