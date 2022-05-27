const mongoose  = require('mongoose')

ongoingeventinfoSchema = mongoose.Schema({

    id:{
        type: String,
        required: true
    },
    title:{
        type: String,
        required: true
    },
    date:{
        type: String,
        required: true
    },
    time:{
        type: String ,
        required: true
    },   
    endDate:{
        type: String,
        required: true
    },
    endTime:{
        type: String,
        required: true
    },   
    eventType:{
        type: String,
        required: true
    },
    linkToEvent:{
        type: String,
        required: true
    },
    duration:[{
        type: Number
    }],
    description:{
        type: String,
        required: true
    },organisation:{
        type:String,
        required: true
    },eventJoinType:{
        type: String,
        required: true
    },organisationDomain:{
        type: String
    },fields:{
        type: String,
        required: true
    },eligiblity:{
        type: String
    },constraints:{
        type: String
    },prizes:{
        type: String 
    },takeaways:{
        type: String 
    },sponsers:{
        type: String 
    },mode:{
        type: String,
        required: true
    }, venue:{
        type: String
    }


})

module.exports = mongoose.model('OngoingEventinfo',ongoingeventinfoSchema)