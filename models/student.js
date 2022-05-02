const mongoose  = require('mongoose')

studentSchema = mongoose.Schema({
    // id : Date.now().toString(),
    //         name : req.body.name,
    //         email : req.body.email,
    //         password : hashedPassword
    id:{
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    }
})

module.exports = mongoose.model('Student',studentSchema)