
/*
to kill port already in use
sudo lsof -i :5000
sudo kill {pid}

sudo -s
date --set 2022-05-20
date --set hrs:min

*/
//
//

if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
 
// create Student model
const Student = require('./models/student')

// create eventinfo db
const Eventinfo = require('./models/eventinfo')
// create pasteventinfo db
const PastEventinfo = require('./models/pasteventinfo')
// create ongoingeventinfo db
const OngoingEventinfo = require('./models/ongoingeventinfo')
//
const UserOTPVerification = require('./models/UserOTPVerification')

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { redirect, append } = require('express/lib/response');
const flash = require('express-flash')
const session = require('express-session')
const schedule = require('node-schedule')
const uniqueValidator = require('mongoose-unique-validator')
const nodemailer = require("nodemailer");

// const MongoClient = require('mongodb').MongoClient;
// const url = "mongodb://localhost:27017/";
const mongoose =  require('mongoose');
// const url = "mongodb://localhost:27017/actrack"; //db name-  actrack
const url = "mongodb://0.0.0.0:27017/actrak" 

mongoose.connect(url, { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', error => console.error(error))
db.once('open', () => console.log('Connected to Mongoose')) //open to openUri


const users=[]
app.set('view-engine', 'ejs')

// edited
app.set('views',__dirname+'/views')
//app.set('layout', 'layouts/layout')
//app.use(expressLayouts) ->not using this one
app.use(express.static('public'))
//

app.use(express.urlencoded({extended : false}))
app.use(flash())
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : false

}))
let currUser ;

let currentlyRegisteredUser;


const initializePassport = require('./passport-config');
const res = require('express/lib/response');
const student = require('./models/student')
const { findOneAndDelete } = require('./models/student')
initializePassport(
    passport,
     //email => users.find(user => user.email === email),
    async function(email){
        // const mail = await Student.findOne({email:email});
        currUser = await Student.findOne({email:email});
        //console.log(mail+" is using email");
       return currUser;
    },
    //id => users.find(user => user.id ===id )
    async function(id){
        //console.log(id);
        
        const tval = await Student.findOne({id:id});
        //currUser = await Student.findOne({id:id});
       //console.log(currUser+" is using id");
       //currUser = tval;
        return tval;
    }
)


app.use(passport.initialize())
app.use(passport.session())

app.get('/', checkAuthenticated,(req, res)=>{
    res.render('index.ejs',{user : currUser} )

})

app.get('/login', checkNotAuthenticated,(req, res)=>{
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated,passport.authenticate('local',
    {
        successRedirect :  '/',
        failureRedirect : '/login',
        failureFlash : true
    }
))


app.get('/register', checkNotAuthenticated,(req, res)=>{
    res.render('register.ejs',{isDuplicateEmail:false})
})

app.post('/register',checkNotAuthenticated, async (req, res)=>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        var myobj = {
            id : Date.now().toString(),
            name : req.body.name,
            email : req.body.email,
            domain : getDomainFromEmail(req.body.email),
            //college : req.body.college,
            profType : "Student",//req.body.profType,
            password : hashedPassword
        };
        users.push(myobj)
        console.log(myobj)
        currentlyRegisteredUser = myobj;
        const student = new Student(myobj)
        //await student.save();
        if( await Student.findOne({email:myobj.email})){
            throw err;
        }
        currentlyRegisteredUser = myobj;
        sendOTPVerificationEmail(currentlyRegisteredUser)
        res.render('verifyMail.ejs',{isfalse:false})
        //res.redirect('/login')
    }catch(err){
        console.log(err)
        res.render('register.ejs',{isDuplicateEmail:true})
    }
    //console.log(users)
})
function checkAuthenticated(req, res,next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
    return next()
}

app.get('/test',(req,res)=>{
    res.render('test.ejs');
})
app.post('/test',(req,res)=>{
    res.render('test.ejs')
})

app.get('/getUserDomain',(req,res)=>{
    res.send(getDomainFromEmail(currUser.email));
})



app.get('/getDomain',async (req,res)=>{
    try{
        console.log("org name="+req.query.orgName)
        let dom = await Student.find({name:req.query.orgName});
        console.log(dom);
        if(dom.length>0){
            console.log(dom[0].domain);
            if(dom[0].domain==getDomainFromEmail(currUser.email)){
                res.send('true')
            }
            else res.send('false')
        }
       res.send('false')
    }catch(err){
        console.log(err);
    }

})



app.get('/eventlist', checkAuthenticated, async function(req, res) {
    // User.find({}, function(err, users) {
    //    res.render('/usersList', {users: users});
    // });
    let eventList = await Eventinfo.find({});
    console.log(eventList)
    let eventdetails = []
    eventList.forEach((event,ind,arr)=>{
        if(event.eventJoinType=='outside' || event.organisationDomain==getDomainFromEmail(currUser.email)) {
            eventdetails.push(event)
        }
    })
    // let  currUserDom = getDomainFromEmail(currUser.email)
    //     if(currUser.profType=='Organisation'){
    //         currUserDom = currUser.domain;
    //     }
        res.render('eventlist.ejs', {eventdetails:eventdetails});
});

function compareDateAndTime(date1,time1,date2,time2){
    
    split_dates(time1,":");
    return getDateByPassingDateAndTime(split_dates(date1,"-"),split_dates(time1,":")).getTime()-getDateByPassingDateAndTime(split_dates(date2,"-"),split_dates(time2,":")).getTime();
}
function compareDuration(e1,e2) {
    for(let i=0;i<3;i++){
        if(e1[i]!=e2[i]){
            return e1[i]-e2[i];
        }
    }
    return 0;
}

app.post('/eventlist',async (req,res)=>{
    try{
        let needObj = {
            organisation : req.body.organisation,
            fields: req.body.fields,
            type: req.body.type,
            sortBy: req.body.sortBy,
            eventId: req.body.eventId
        }
        let eventlist = await Eventinfo.find({});
        let eventdetails = []
        eventlist.forEach((event,ind,arr)=>{
            if((needObj.eventId=='none'||needObj.eventId==event.id)&&
                (needObj.organisation=='none'||needObj.organisation==event.organisation)
                &&(needObj.fields=='none'||needObj.fields==event.fields) && 
                (needObj.type=='none'||needObj.type==event.eventType))
            {
                if(event.eventJoinType=='outside' || event.organisationDomain==getDomainFromEmail(currUser.email)) {
                    eventdetails.push(event)
                }
            }
        });
        console.log(needObj);
        if(needObj.sortBy!='none'){
            console.log(eventdetails+"will be sorted")
            eventdetails.sort((event1,event2)=>{
                if(needObj.sortBy=='Date(Ascending)') {
                    console.log('ascending')
                    return compareDateAndTime(event1.date,event1.time,event2.date,event2.time);
                }
                else if(needObj.sortBy=='Date(Descending)') {
                    console.log('descending')
                    return compareDateAndTime(event2.date,event2.time,event1.date,event1.time);
                }
                else if(needObj.sortBy=='Duration(Ascending)') {
                    console.log('Duration ascending')
                    return compareDuration(event1.duration,event2.duration);
                }
                console.log('Duration Descending')
                return compareDuration(event2.duration,event1.duration);
            })
        }
    
        res.render('eventlist.ejs', {eventdetails:eventdetails});
    }catch(err){
        console.log(err)
        res.redirect('/')
    }
})


app.get('/pasteventlist',checkAuthenticated, async function(req, res) {
    
    // PastEventinfo.find({}, function(err, pasteventdetails) {
    //     res.render('pasteventlist.ejs', {pasteventdetails:pasteventdetails});
    //  });

     let eventList = await PastEventinfo.find({});
     console.log(eventList)
     let pasteventdetails = []
     eventList.forEach((event,ind,arr)=>{
         if(event.eventJoinType=='outside' || event.organisationDomain==getDomainFromEmail(currUser.email)) {
            pasteventdetails.push(event)
         } 
         
     })
     res.render('pasteventlist.ejs', {pasteventdetails:pasteventdetails});
});

app.post('/pasteventlist',checkAuthenticated,async (req,res)=>{
    try{
        let needObj = {
            organisation : req.body.organisation,
            fields: req.body.fields,
            type: req.body.type,
            sortBy: req.body.sortBy,
            eventId: req.body.eventId
        }
        let eventlist = await PastEventinfo.find({});
        let pasteventdetails = []
        eventlist.forEach((event,ind,arr)=>{
            if((needObj.eventId=='none'||needObj.eventId==event.id)&&
                (needObj.organisation=='none'||needObj.organisation==event.organisation)
                &&(needObj.fields=='none'||needObj.fields==event.fields) && 
                (needObj.type=='none'||needObj.type==event.eventType))
            {
                if(event.eventJoinType=='outside' || event.organisationDomain==getDomainFromEmail(currUser.email)) {
                    pasteventdetails.push(event)
                }
            }
        });
        console.log(needObj);
        if(needObj.sortBy!='none'){
            console.log(pasteventdetails+"will be sorted")
            pasteventdetails.sort((event1,event2)=>{
                if(needObj.sortBy=='Date(Ascending)') {
                    console.log('ascending')
                    return compareDateAndTime(event1.date,event1.time,event2.date,event2.time);
                }
                else if(needObj.sortBy=='Date(Descending)') {
                    console.log('descending')
                    return compareDateAndTime(event2.date,event2.time,event1.date,event1.time);
                }
                else if(needObj.sortBy=='Duration(Ascending)') {
                    console.log('Duration ascending')
                    return compareDuration(event1.duration,event2.duration);
                }
                console.log('Duration Descending')
                return compareDuration(event2.duration,event1.duration);
            })
        }
    
        res.render('pasteventlist.ejs', {pasteventdetails:pasteventdetails});
    }catch(err){
        console.log(err)
        res.redirect('/')
    }
})


app.get('/ongoingeventlist', checkAuthenticated,async function(req, res) {
    
    // OngoingEventinfo.find({}, function(err, ongoingeventdetails) {
    //     res.render('ongoingeventlist.ejs', {ongoingeventdetails:ongoingeventdetails});
    //  }); 
     let eventList = await OngoingEventinfo.find({});
    console.log(eventList)
    let ongoingeventdetails = []
    eventList.forEach((event,ind,arr)=>{
        if(event.eventJoinType=='outside' || event.organisationDomain==getDomainFromEmail(currUser.email)) {
            ongoingeventdetails.push(event)
        } 
        
    })
    res.render('ongoingeventlist.ejs', {ongoingeventdetails:ongoingeventdetails});

});
app.post('/ongoingeventlist',checkAuthenticated,async (req,res)=>{
    try{
        let needObj = {
            organisation : req.body.organisation,
            fields: req.body.fields,
            type: req.body.type,
            sortBy: req.body.sortBy,
            eventId: req.body.eventId
        }
        let eventlist = await OngoingEventinfo.find({});
        let ongoingeventdetails = []
        eventlist.forEach((event,ind,arr)=>{
            if((needObj.eventId=='none'||needObj.eventId==event.id)&&
                (needObj.organisation=='none'||needObj.organisation==event.organisation)
                &&(needObj.fields=='none'||needObj.fields==event.fields) && 
                (needObj.type=='none'||needObj.type==event.eventType))
            {
                if(event.eventJoinType=='outside' || event.organisationDomain==getDomainFromEmail(currUser.email)) {
                    ongoingeventdetails.push(event)
                }
            }
        });
        console.log(needObj);
        if(needObj.sortBy!='none'){
            console.log(ongoingeventdetails+"will be sorted")
            ongoingeventdetails.sort((event1,event2)=>{
                if(needObj.sortBy=='Date(Ascending)') {
                    console.log('ascending')
                    return compareDateAndTime(event1.date,event1.time,event2.date,event2.time);
                }
                else if(needObj.sortBy=='Date(Descending)') {
                    console.log('descending')
                    return compareDateAndTime(event2.date,event2.time,event1.date,event1.time);
                }
                else if(needObj.sortBy=='Duration(Ascending)') {
                    console.log('Duration ascending')
                    return compareDuration(event1.duration,event2.duration);
                }
                console.log('Duration Descending')
                return compareDuration(event2.duration,event1.duration);
            })
        }
    
        res.render('ongoingeventlist.ejs', {ongoingeventdetails:ongoingeventdetails});
    }catch(err){
        console.log(err)
        res.redirect('/')
    }
})

// app.get('/verifyMail',(req,res)=>{
//     res.render('verifyMail.ejs')
// })

app.post('/verifyMail',async (req,res)=>{

    try {
        let gotOtp = req.body.otp; //need form
        console.log(gotOtp+" this is user giving otp");
        //let userId = currentlyRegisteredUser.id;
        console.log(currentlyRegisteredUser.id+" is the currently reigistered user id")
        const UserOTPVerificationRecords = await UserOTPVerification.find({userId:currentlyRegisteredUser.id})//find({id:userId});
        console.log("records found are")
        console.log(UserOTPVerificationRecords);
            if(UserOTPVerificationRecords.length<=0) {
                throw new Error(
                    "Account record doesn't exist or has been verified already.Please sign up or log in"
                );      
            }else{
                const {expiresAt} = UserOTPVerificationRecords[0];
                const hashedOTP = UserOTPVerificationRecords[0].otp;
                if(expiresAt < Date.now()){
                    await UserOTPVerification.deleteMany({userId:currentlyRegisteredUser.id});
                    // erase registered mail from db
                    console.log("expired");
                    throw "link expired";
                    //Student.find({ id:currentlyRegisteredUser.id }).remove().exec();
                } else {
                        const validOTP = await bcrypt.compare(gotOtp,hashedOTP);
                        if(!validOTP) {
                            //throw new Error("Invalid code");
                            // erase registered email
                            console.log("not valid so removed");
                            res.render('verifyMail.ejs',{isfalse:true})
                            // Student.find({ id:currentlyRegisteredUser.id }).remove().exec();

                        } else {
                            //await User.updateOne({_id:userId},{verified: true});
                            await UserOTPVerification.deleteMany({userId:currentlyRegisteredUser.id});
                            // res.json({
                            //     status:"VERIFIED"
                            //     message:"User email verified"
                            // });
                            await new Student(currentlyRegisteredUser).save();
                            console.log("email verified successfully");
                            res.redirect('/login')
                        }
                }

            }
    } catch(error) {
        // res.json({
        //     status:"FAILED"
        //     message:error message,
        // });
        currentlyRegisteredUser = null
        res.render('register.ejs',{isDuplicateEmail:false})
        console.log(error)
        console.log("failed due to some error");

    }

})

// event info added
app.get('/events', checkAuthenticated,(req, res)=>{
    res.render('events.ejs')
})

// app.post('/events',checkNotAuthenticated,async (req, res)=>{
//     try{
//         var myobj2 = {
//             id : Date.now().toString(),
//             title : req.body.title,
//             date : req.body.date,
//             time : req.body.time,
//             description : req.body.description,
//             organiser : req.body.organizer,
//             relatedFields: req.body.fields.value,
//             eligibility: req.body.eligiblity,
//             constraints: req.body.constraints,
//             prizes: req.body.prizes,
//             reviews: req.body.takeaways,
//             sponsers: req.body.sponsers,
//             linkToEvent: req.body.event-link
//         };
//         //users.push(myobj)
//         console.log(myobj2)
//         const nevent = new Eventinfo(myobj2)
//         const newEvent = await nevent.save();
//         console.log(newEvent)
//         res.redirect('/login')
//     }catch{
//         res.redirect('/register')
//     }
//     //console.log(users)
// })
function isNotVerifiedFromSameOrganisation(admin,orgObj){
    let adminDom = admin.email.split('@');
    if(admin.profType=='Organisation' && admin.domain==orgObj.domain){
        return false;
    }
    return adminDom[1]!=orgObj.domain;
}

async function sendMailToGivenArray(users,event){
    users.forEach((user,index,arr)=>{
        console.log(user.email)
        const mailOptions = {
            from : 'actrak ' + process.env.AUTH_EMAIL,
            to: user.email, 
            subject: "This Event is Suggested for You by your Organisation",
            //html: `<p>Enter<b>${otpstring}</b> in the app to verfiy your email address and complete the signup</p><p> This code <b>expires in 10 minutes</b>.</p>`,
            html: `<!DOCTYPE html>
            <html lang="en" style="background-color: transparent;">
            
            <head style="background-color: transparent;">
                <meta charset="UTF-8" style="background-color: transparent;">
                <meta http-equiv="X-UA-Compatible" content="IE=edge" style="background-color: transparent;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0" style="background-color: transparent;">
                
                <link rel="shortcut icon" type="image/x-icon" href="/image" style="height: 10px;width: 10px;background-color: transparent;">
                
                
            </head>
            <body class="mainBody" style="background-color: transparent;">
            
                <!-- Filter Box End -->
                <div class="eventListOuterBox" style="background-color: transparent;">
                        <div class="eventListInnerBox" style="background-color: rgb(230, 236, 237);margin: 1rem;border-radius: 0.5rem;box-shadow: 0 0 3px 3px var(--shadow-color1);font-weight: 500;font-family: Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;width:50rem;">
                            <div class="orgName" style="background-color: transparent;color: var(--font-col1);display: flex;flex-direction: row;column-gap: 5%;padding-top: 1rem;margin: 0.5rem;margin-top: auto;">
                                <h2 style="background-color: transparent;font-size: 1.2rem;"><i class="bi bi-building" style="background-color: transparent;"></i>${event.organisation}</h2>
                                <h6 style="background-color: transparent;color: rgba(0, 0, 0, 0.477);margin-top: auto;">Event Id : <span style="background-color: transparent;">${event.id}</span></h6>
                            </div>
                            <div class="titleBox" style="background-color: transparent;text-align: center;font-family: 'Courier New', Courier, monospace;text-transform: capitalize;padding: 1rem;color: #6682ff;">
                                <h1 style="background-color: transparent;">${event.title}</h1>
                            </div>
                            <div class="descriptionBox" style="background-color: transparent;font-family: 'Comic Neue', cursive;color: black;">
                                
                                <p style="background-color: transparent;">${event.description}</p>
                            </div>
                            <div class="tableBox" style="width: 50rem;background-color: transparent;row-gap: 0.5rem;padding: 1rem;align-items: flex-start;font-size: 1rem;">
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                     
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Type : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.eventType}</h5>
            
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                     
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Join Type :</h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.eventJoinType}</h5>
            
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                    
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Field : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.fields}</h5>
            
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                    
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Eligiblity : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.eligiblity}</h5>
            
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                     
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Constraints : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.constraints}</h5>
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                    
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Prizes : </h4> 
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.prizes}</h5>
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                    
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">OutComes : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.takeaways}</h5>
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                     
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Sponsers : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.sponsers}</h5>
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                    
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Mode : </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.mode}</h5>
                                </div>
                                <div class="tableCol" style="background-color: transparent;width:50rem;display: flex;flex-direction: row;column-gap: auto;margin: 0.3rem;">
                                    <h4 style="background-color: transparent;font-weight: 700;width: 5rem;">Location / Platform: </h4>
                                    <h5 style="background-color: transparent;color: rgba(18, 121, 231, 0.73);font-weight: bold;margin-top: auto;">${event.venue}</h5>
                                </div>
                            </div>
                            <div class="times" style="background-color: transparent;padding: 1rem;width:50rem;display: flex;flex-direction: row;column-gap: 1rem;">
                                <div class="timeBox" style="background-color: transparent;">   
                                    <h4 style="background-color: transparent;padding: 0.2rem;">Start Date & Time</h4>
                                    <h4 style="background-color: transparent;padding: 0.2rem;color: var(--font-col2);font-weight: 400;"><i class="bi bi-clock" style="background-color: transparent;"></i>${event.date} ${event.time}</h4>
                                </div>
                                <div class="timeBox" style="background-color: transparent;">
                                    <h4 style="background-color: transparent;padding: 0.2rem;">End Date & Time</h4>
                                    <h4 style="background-color: transparent;padding: 0.2rem;color: var(--font-col2);font-weight: 400;"><i class="bi bi-clock" style="background-color: transparent;"></i>${event.endDate}  ${event.endTime} </h4>
                                </div>
                                <div class="timeBox" style="background-color: transparent;">
                                    <h4 style="background-color: transparent;padding: 0.2rem;">Duration</h4>
                                    <h4 style="background-color: transparent;padding: 0.2rem;color: var(--font-col2);font-weight: 400;"><i class="bi bi-hourglass-split" style="background-color: transparent;"></i>${event.duration[0]} Days ${event.duration[1]} Hrs ${event.duration[2]} Mins</h4>  
                                </div>
                            </div>
                        </div>
                </div>            
            </body>
            </html>`,
        }
        transporter.sendMail(mailOptions, async function(error, info){
            if (error) {
                try{
                // await Student.findOneAndDelete({id:student.id}); 
                    console.log(student.name+" is deleted successfully");
                    
                    
                }catch(err){
                    console.log("cannot delete"+student.name);
                    console.log(err);
                }
                currentlyRegisteredUser = null;
                
                console.log(error +" is while transporting");
                res.render('register.ejs',{isDuplicateEmail:false})
            } else {
                console.log('Email sent: ' + info.response);
                flag = true;
            }
        });
    })

}
app.get('/notifyEventToAll',checkAuthenticated,(req,res)=>{
    res.render('notifyEventToAll.ejs',{isfalse:false,pass:true});
})
app.post('/notifyEventToAll',checkAuthenticated,async (req,res)=>{
    try{
            let valid = await bcrypt.compareSync(req.body.password,currUser.password);
            if(valid){
                    try{
                        let users = await Student.find({domain:currUser.domain})
                        let event = await Eventinfo.findOne({id:req.body.eventId});
                        await sendMailToGivenArray(users,event);
                        return res.render('index.ejs',{user : currUser});
                    }catch(err){
                        console.log(err);
                        return res.render('notifyEventToAll.ejs',{isfalse:true,pass:true});
                    }
            }else{
                return res.render('notifyEventToAll.ejs',{isfalse:false,pass:false});
            }
        
        //await sendMailToGivenArray(users,req.body.event);
    }catch(err){
        console.log(err);
        return res.render('index.ejs',{user : currUser});
    }
})

app.post('/events', checkAuthenticated, async(req, res)=>{
    try{
        // let givenOrg = await Student.findOne({name:req.body.orgName,profType:"Organisation"});
        // if(isNotVerifiedFromSameOrganisation(currUser,givenOrg)){
        //     throw "not from same orgainsation";
        // }   
        //let orgDom = givenOrg.domain;
        let currOrg = await Student.findOne({profType:"Organisation",domain:getDomainFromEmail(currUser.email)})

        let p1 = split_dates(req.body.date,"-");//split_dates(req.body.edate,"-");
        let p2 = split_dates(req.body.time,":");//split_dates(req.body.etime,":");
        const when = getDateByPassingDateAndTime(p1,p2);
        let ep1 = split_dates(req.body.edate,"-");
        let ep2 = split_dates(req.body.etime,":");
        const pastwhen = getDateByPassingDateAndTime(ep1,ep2);

     
        const eventObj = {
            id : Date.now().toString(),
            organisation:currOrg.name,
            eventJoinType: req.body.eventJoinType,
            title : req.body.title,
            date  : req.body.date,
            time : req.body.time,
            endDate:req.body.edate,
            endTime:req.body.etime,
            linkToEvent : req.body.eventlink,
            description: req.body.description,
            fields : req.body.fields,
            eligiblity : req.body.eligiblity,
            constraints : req.body.constraints,
            prizes : req.body.prizes,
            takeaways : req.body.takeaways,
            mode : req.body.mode,
            sponsers : req.body.sponsers,
            eventType: req.body.eventType,
            duration: getDuration(when.getTime(),pastwhen.getTime())
        }
        if(eventObj.eventJoinType=="inside"){
            eventObj.organisationDomain = currOrg.domain;
        }if(eventObj.mode=="offline"){
            eventObj.venue = req.body.venue;
        }
        console.log(eventObj)
        //new Eventinfo(eventObj).save();
        

        Eventinfo.create(eventObj, function(err, doc) {
            if (err) return console.error(err); // Handle the error
            // // var when = new Date(now).setHours(now.getHours() + 1);
            // schedule.scheduleJob(when, function() {
            //     // This callback will fire in one hour
            //     Eventinfo.find({ id:eventObj.id }).remove().exec();
            // });
            
            console.log(when+" is the time the post will be go to ongoing")
            schedule.scheduleJob(when, ()=> {
                // This callback will fire in one hour
                Eventinfo.find({ id:eventObj.id }).remove().exec();
            });
        })
        let flag1= true;
        schedule.scheduleJob(when,()=>{
            //deleted post will save to ongoingeventinfo db
            if(flag1){
                OngoingEventinfo.create(eventObj, function(err, doc) {
                    if (err) return console.error(err); // Handle the error
                    
                    console.log(pastwhen+" is the time the post will be go to past event")
                    schedule.scheduleJob(pastwhen, ()=> {  
                        // This callback will fire in one hour
                        OngoingEventinfo.find({ id:eventObj.id }).remove().exec();
                    });
                    })
                    flag1 = false;
            }
        })
        let flag2 = true;
        schedule.scheduleJob(pastwhen,()=>{
            //deleted post will save to pasteventinfo db
            if(flag2){
                new PastEventinfo(eventObj).save();  //past events also should be delete after 6 months
                flag2 = false;
            }
        })
    }catch(err){
        console.log(err);
        return res.redirect('/events')
    }
    return res.redirect('/')
})
function split_dates(obj,p) {
    let parts = obj.toString().split(p)
    console.log(parts+"=>"+p)
    for(let i=0;i<parts.length;i++){
        parts[i] = parseInt(parts[i])
    }
    return parts
}
function getDomainFromEmail(email){
    let sobj = email.split("@")
    return sobj[1];
}
function getDuration(d1,d2){
    let diff = Math.abs(d1-d2)
    let val = []
    val.push(float2int((diff/(1000 * 3600 * 24))))
    val.push(float2int((diff/36e5)%24))
    val.push(float2int((diff/60000)%60))
    return val
  }
function float2int (value) {
      return value | 0;
}
function getDateByPassingDateAndTime(date,time){
    return new Date(date[0],date[1]-1,date[2],time[0],time[1],0,0);
}


// node mailer transporter creation
let transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }

});



// sending otp
const sendOTPVerificationEmail = async(student,res)=>{
    try{
        var digits = '0123456789';
        var OTP = '';
        for (let i = 0; i < 6; i++ ) {
             OTP += digits[Math.floor(Math.random() * 10)];
        }
        const otp = OTP;
        const otpstring = " "+OTP+" "
        const email = student.name+" "+student.email
        const mailOptions = {
            from : 'actrak ' + process.env.AUTH_EMAIL,
            to: email, 
            subject: "Verify Your Email",
            html: `<p>Enter<b>${otpstring}</b> in the app to verfiy your email address and complete the signup</p><p> This code <b>expires in 10 minutes</b>.</p>`,
        }


        const saltRounds = 10;
        const hashedOTP =  await bcrypt.hash(otp,saltRounds);
        
        const newOTPVerification = await new UserOTPVerification(
            { 
                userId: student.id,
                otp: hashedOTP,
                createdAt : Date.now(),
                expiresAt : Date.now() + 600000,
            }
        );

        console.log(otp);

        await newOTPVerification.save();
        //await transporter.sendMail(mailOptions);
        // while(sendMailUntilSuccess(mailOptions)==false){
        //     console.log("worked multiple times to send mail");
        // }
        transporter.sendMail(mailOptions, async function(error, info){
            if (error) {
                try{
                // await Student.findOneAndDelete({id:student.id}); 
                    console.log(student.name+" is deleted successfully");
                    
                    
                }catch(err){
                    console.log("cannot delete"+student.name);
                    console.log(err);
                }
                currentlyRegisteredUser = null;
                
                console.log(error +" is while transporting");
                res.render('register.ejs',{isDuplicateEmail:false})
            } else {
                console.log('Email sent: ' + info.response);
                flag = true;
            }
        });
    }catch(error){
        console.log(error);
        //Student.deleteOne({id:student.id});
        console.log("some error otp cannot send")   
        console.log(error +" is while transporting"); 
        return res.render('register.ejs',{isDuplicateEmail:false})
        
    }
}


//resend
app.get("/resendOTPVerificationCode", async(req,res)=> {
    try {
        let reuserid = currentlyRegisteredUser.id;
            await UserOTPVerification.deleteMany({userid:reuserid});
            res.render('verifyMail.ejs',{isfalse:false})
        }catch(error) {
        // res.json({
        //     status:"FAILED",
        // });
        //console.log("failed due to some error");
        res.render('register.ejs',{isDuplicateEmail:false});
    }
})

//add admin
app.get('/addAdmin',checkAuthenticated,(req, res)=>{
    res.render('addAdmin.ejs');
})

app.post('/addAdmin',checkAuthenticated,async (req,res)=>{
    try{
        let mail=req.body.email;
        await Student.findOneAndUpdate({email:mail},{profType:"Admin"});
        
    } catch(err) {
        console.log("cannot update")
        console.log(err+" is the error")
    }
    res.render('manageAdmin.ejs');
})

//remove admin
app.get('/removeAdmin',checkAuthenticated,(req, res)=>{
    res.render('removeAdmin.ejs')
})



app.post('/removeAdmin',checkAuthenticated,async (req,res)=>{
    try{
        let mail=req.body.email;
        await Student.findOneAndUpdate({email:mail},{profType:"Student"});
        
    } catch(err) {
        console.log("cannot update");
        console.log(err+" is the error");
    }
    return res.render('manageAdmin.ejs');
})

app.get('/showAdmin',checkAuthenticated,async(req,res)=>{
    try{
        Student.find({profType:"Admin",domain:currUser.domain}, function(err, adminDetails) {
            res.render('adminList.ejs', {adminDetails:adminDetails});
         });
    }catch(err){
        console.log("some error while showing admins");
        console.log(err);
        res.render('manageAdmin.ejs');
    }
})

app.get('/changeName',checkAuthenticated,(req,res)=>{
    res.render('changeName.ejs')
})

app.post('/changeName',checkAuthenticated,async(req,res)=>{
    try{
        let newName = req.body.name;
        let bodyEmail = req.body.email;
        await Student.findOneAndUpdate({email:bodyEmail},{name:newName});
        currUser.name = newName
        res.render('profile.ejs',{user :currUser})
    }catch(err){
        console.log("cannot update to new name")
        console.log(err)
        res.render('changeName.ejs')
    }
})
app.get('/deleteAccount',checkAuthenticated,(req,res)=>{
    res.render('deleteAccount.ejs',{isfalse:false});
})
app.post('/deleteAccount',checkAuthenticated,async (req,res)=>{
   try{
        try{
            let p1 = req.body.password;
            console.log(currUser.password);
            console.log(p1)
            let hp = await bcrypt.hash(p1, 10);
            console.log(hp)
            let valid = await bcrypt.compareSync(p1,currUser.password);
            if(valid){
                console.log("deleted succesfully")
                await Student.findOneAndDelete({email:currUser.email});
                currUser = null;
                return res.redirect('/logout');
            }else{
                res.render('deleteAccount.ejs',{isfalse:true});
            }
                
        }catch(err){
            console.log(err)
            return res.redirect('/profile');
        }
   }catch(err){
       console.log(err);
       res.redirect('/');
   }
})

//SHOW USERS
app.get('/showUsers',checkAuthenticated,async (req,res)=>{
    try{
    //    console.log("in progress")
        let users = await Student.find({domain:currUser.domain,profType:{$ne: "Organisation"}});
        res.render('showUsers.ejs',{users:users});
    }catch(err){
        res.render('manageAdmin.ejs')
    }
})

//---------------------------------------------
//  FORGOT PASSWORD START
//---------------------------------------------


let currGivenEmail;
app.get('/forgotPassword',(req, res) => {
    res.render('forgotPassword.ejs')
})

app.post('/forgotPassword',async (req, res) => {
    try {
        let email = req.body.email
        currGivenEmail = email;
        OTPEnteredUser = await Student.findOne({ email: email })
        sendOTPVerificationEmail(OTPEnteredUser)
        res.render('verifyMailForReset.ejs', { isfalse: false })
    } catch (err) {
        console.log(err + " is the error in forgetPassword")
        res.redirect('/')
    }
})


app.post('/verifyMailForReset',async (req, res) => {
    try {
        let gotOtp = req.body.otp; //need form
        console.log(gotOtp + " this is user giving otp");
        //let userId = currentlyRegisteredUser.id;
        console.log(OTPEnteredUser.id + " is the currently reigistered user id")
        const UserOTPVerificationRecords = await UserOTPVerification.find({ userId: OTPEnteredUser.id })//find({id:userId});
        console.log("records found are")
        //        console.log(UserOTPVerificationRecords);
        if (UserOTPVerificationRecords.length <= 0) {
            throw new Error(
                "Account record doesn't exist or has been verified already.Please sign up or log in"
            );
        } else {
            const { expiresAt } = UserOTPVerificationRecords[0];
            const hashedOTP = UserOTPVerificationRecords[0].otp;
            if (expiresAt < Date.now()) {
                await UserOTPVerification.deleteMany({ userId: OTPEnteredUser.id });
                // erase registered mail from db
                console.log("expired");
                //Student.find({ id:currentlyRegisteredUser.id }).remove().exec();
            } else {
                //console.log(UserOTPVerification)
                const validOTP = await bcrypt.compare(gotOtp, hashedOTP);
                if (!validOTP) {
                    //throw new Error("Invalid code");
                    // erase registered email
                    console.log("not valid so removed");
                    res.render('verifyMailForReset.ejs', { isfalse: true })
                    // Student.find({ id:currentlyRegisteredUser.id }).remove().exec();
                } else {
                    //await User.updateOne({_id:userId},{verified: true});
                    await UserOTPVerification.deleteMany({ userId: OTPEnteredUser.id });
                    // res.json({
                    //     status:"VERIFIED"
                    //     message:"User email verified"
                    // });
                    //await new Student(OTPEnteredUser).save();
                    console.log("email verified successfully");
                    res.redirect('/resetPassword')
                }
            }
        }
    } catch (error) {
        // res.json({
        //     status:"FAILED"
        //     message:error message,
        // });
        OTPEnteredUser = null
        res.render('forgotPassword.ejs', { isDuplicateEmail: false })
        console.log(error)
        console.log("failed due to some error");
    }

})


//reset password
app.get('/resetPassword',(req, res, next) => {
    res.render('resetPassword.ejs', { entered: 0 })
})

app.post('/resetPassword',async (req, res) => {
    let p1 = req.body.password
    let p2 = req.body.password2
    if (p1.length <= 0 || p2.length <= 0) {
        res.render('resetPassword.ejs', { entered: 1 })
    }
    if (p1 != p2) {
        res.render('resetPassword.ejs', { entered: 2 })
    }
    if (p1 == p2) {
        console.log("set success")
        res.render('setSuccess.ejs', { entered: true })
    }
    // let email=UserOTPVerification[0]
    console.log(currGivenEmail)
    const newHashedPassword = await bcrypt.hash(p1, 10);
    await Student.findOneAndUpdate({email:currGivenEmail},{password:newHashedPassword});
    currGivenEmail = null
})


//---------------------------------------------
//  FORGOT PASSWORD END
//---------------------------------------------

app.get("/main", (req, res)=>{
    res.render("main.ejs")
})

app.get("/style", (req, res)=>{
    res.sendFile(__dirname+"/views/index.css")
})

app.get("/postStyle", (req, res)=>{
    res.sendFile(__dirname+"/views/postStyle.css")
})

app.get("/profile", (req, res)=>{
    res.render("profile.ejs", {user :currUser})
})

app.get('/logout', function (req, res){
    currUser = null;
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.get("/collab", (req, res)=>{
    res.render("collab.ejs");
})


app.get('/orgRegister', (req, res)=>{
    res.render('orgRegister.ejs', {isDuplicateEmail : false})
})
app.post('/orgRegister',checkNotAuthenticated, async (req, res)=>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.orgPassword, 10);
        var orgObj = {
            id : Date.now().toString(),
            name : req.body.orgName,
            email : req.body.orgEmail,
            domain : req.body.orgDomain,
            workplace : req.body.workPlace,
            link : req.body.orgLink,
            phone : req.body.orgPhone,
            address : req.body.orgAddress,
            profType : "Organisation",
            password : hashedPassword
        };
        //users.push(myobj)
        console.log(orgObj);
        //currentlyRegisteredUser = orgObj;
        const student = new Student(orgObj);
        await student.save();
        //currentlyRegisteredUser = orgObj;
        //sendOTPVerificationEmail(currentlyRegisteredUser)
        //res.render('verifyMail.ejs',{isfalse:false})
        res.redirect('/login');
    }catch(err){
        console.log(err);
        res.render('register.ejs',{isDuplicateEmail:true});
    }
    //console.log(users)
})
app.get('/server.js', async (req, res)=>{

    //console.log("Old UserName "+req.query.oldName)
    console.log("New UserName "+req.query.newName)
    currUser.name = req.query.newName;
    await Student.findOneAndUpdate({email:currUser.email},{name:currUser.name});
    res.send(req.query.newName)
})

app.get('/manageAdmin', (req, res)=>{
    res.render('manageAdmin.ejs');
})
app.get('/reactjs', (req, res)=>{
    res.sendFile(__dirname+'/views/reactjs.jsx');
})

// Images Get
app.get("/image", (req, res)=>{
    res.sendFile(__dirname+"/views/Assets/logo.png")
})

app.get("/regImg", (req, res)=>{
    res.sendFile(__dirname+"/views/Assets/regImg.png")
})

// Bootstrap


// 404 Page Not Found
app.get("/pageNotFound", (req, res)=>{
    res.render('pageNotFound.ejs');
})
app.use((req, res, next)=>{
    res.status(404).redirect('/pageNotFound');
})


app.listen(5000);