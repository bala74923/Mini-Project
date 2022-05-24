const mongoose  = require('mongoose')

pasteventinfoSchema =mongoose.Schema({
    /*
        main
        =====
        
        title
        description
        oragniser
        date
        time
        related field

        viewmore
        =========
            op
            ---
            eligiblity
            constraints / guidelines
            prices /credits
            reviews
            sponsors

            must
            ---
            link

    */
    //Before view more
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
        type: String,
        required: true
    },    
    linkToEvent:{
        type: String,
        required: true
    },

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
    }
    // organiser:{
    //     type: String,
    //     required: true
    // },
    // relatedFields:{
    //     type: String,
    //     required: true
    // },
    
    //optional in view more
    // eligibility:{
    //     type: String,
    //     required: false
    // },
    // constraints:{
    //     type: String,
    //     required: false
    // },
    // prizes:{
    //     type: String,
    //     required: false
    // },
    // reviews:{
    //     type: String,
    //     required: false
    // },
    // sponsers:{
    //     type: String,
    //     required: false
    // },

    //must in view more

})

module.exports = mongoose.model('PastEventinfo',pasteventinfoSchema)