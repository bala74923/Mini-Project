const mongoose  = require('mongoose')
var uniqueValidator = require('mongoose-unique-validator')

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
    // email:{
    //     type: String,
    //     required: true
    // }
    email: {
        type: String,
         index: {
              unique: true//,  dropDups: true
            }
        }
    ,
    college:{
        type: String,
        required: true
    },
    profType:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    }
})
studentSchema.plugin(uniqueValidator)
module.exports = mongoose.model('Student',studentSchema)