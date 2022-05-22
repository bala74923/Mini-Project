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
    email: {
        type: String,
         index: {
              unique: true//,  dropDups: true
            },
            required: true
        }
    ,
    college:{
        type: String
    },
    profType:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },domain:{
        type: String,

    },workplace:{
        type:String
    },phone:{
        type: String
    },address:{
        type: String
    },link: {
        type: String
    }
})
studentSchema.plugin(uniqueValidator)
module.exports = mongoose.model('Student',studentSchema)