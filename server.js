
/*
to kill port already in use
sudo lsof -i :5000
sudo kill {pid}

sudo -s
date --set 2022-05-20
date --set hrs:min

*/


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
            college : req.body.college,
            profType : "Student",//req.body.profType,
            password : hashedPassword
        };
        //users.push(myobj)
        console.log(myobj)
        currentlyRegisteredUser = myobj;
        const student = new Student(myobj)
        //await student.save();
        if( await Student.findOne({email:myobj.email})){
            throw err;
        }
        currentlyRegisteredUser = myobj;
        sendOTPVerfificationEmail(currentlyRegisteredUser)
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





app.get('/eventlist', function(req, res) {
    // User.find({}, function(err, users) {
    //    res.render('/usersList', {users: users});
    // });
    
    Eventinfo.find({}, function(err, eventdetails) {
        let  currUserDom = getDomainFromEmail(currUser.email)
        if(currUser.profType=='Organisation'){
            currUserDom = currUser.domain;
        }
        res.render('eventlist.ejs', {eventdetails:eventdetails,currDomain:currUserDom})
        //console.log("sending the page");
        // for(const i in eventdetails[0]){
        //     console.log(i)
        // }
        // console.log(eventdetails)
     });
});

app.get('/pasteventlist', function(req, res) {
    
    PastEventinfo.find({}, function(err, pasteventdetails) {
        res.render('pasteventlist.ejs', {pasteventdetails:pasteventdetails});
     });
});

app.get('/ongoingeventlist', function(req, res) {
    
    OngoingEventinfo.find({}, function(err, ongoingeventdetails) {
        res.render('ongoingeventlist.ejs', {ongoingeventdetails:ongoingeventdetails});
     });
});


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

app.post('/events', checkAuthenticated, async(req, res)=>{
    try{
        let givenOrg = await Student.findOne({name:req.body.orgName,profType:"Organisation"});
        if(isNotVerifiedFromSameOrganisation(currUser,givenOrg)){
            throw "not from same orgainsation";
        }
        let orgDom = givenOrg.domain;
        const eventObj = {
            id : Date.now().toString(),
            organisation:req.body.orgName,
            eventJoinType: req.body.eventJoinType,
            title : req.body.title,
            date  : req.body.date,
            time : req.body.time,
            linkToEvent : req.body.eventlink,
            description: req.body.description,
            fields : req.body.fields,
            eligiblity : req.body.eligiblity,
            constraints : req.body.constraints,
            prizes : req.body.prizes,
            takeaways : req.body.takeaways,
            sponsers : req.body.sponsers
        }
        if(eventObj.eventJoinType=="inside"){
            eventObj.organisationDomain = givenOrg.domain;
        }
        console.log(eventObj)
        //new Eventinfo(eventObj).save();
        let p1 = split_dates(eventObj.date,"-");//split_dates(req.body.edate,"-");
        let p2 = split_dates(eventObj.time,"-");//split_dates(req.body.etime,":");
        const when = new Date(p1[0],p1[1]-1,p1[2],p2[0],p2[1],0,0);
        let ep1 = split_dates(req.body.edate,"-");
        let ep2 = split_dates(req.body.etime,":");
        const pastwhen = new Date(ep1[0],ep1[1]-1,ep1[2],ep2[0],ep2[1],0,0);

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

    }catch{
        res.redirect('/events')
    }
    res.redirect('/')
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

// node mailer transporter creation
let transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }

});



// sending otp
const sendOTPVerfificationEmail = async(student,res)=>{
    try{
        var digits = '0123456789';
        var OTP = '';
        for (let i = 0; i < 4; i++ ) {
             OTP += digits[Math.floor(Math.random() * 10)];
        }
        const otp = OTP;
        const otpstring = " "+OTP+" "
        const email = student.name+" "+student.email
        const mailOptions = {
            from : 'actrak ' + process.env.AUTH_EMAIL,
            to: email, 
            subject: "Verify Your Email",
            html: `<p>Enter<b>${otpstring}</b> in the app to verfiy your email address and complete the signup</p><p> This code <b>expires in 1 hour</b>.</p>`,
        }


    const saltRounds = 10;
    const hashedOTP =  await bcrypt.hash(otp,saltRounds);
    
    const newOTPVerification = await new UserOTPVerification({ 
        userId: student.id,
        otp: hashedOTP,
        createdAt : Date.now(),
        expiresAt : Date.now() + 3600000,
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
        res.render('register.ejs',{isDuplicateEmail:false})
        
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
app.get('/addAdmin',(req, res)=>{
    res.render('addAdmin.ejs');
})

app.post('/addAdmin',async (req,res)=>{
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
app.get('/removeAdmin',(req, res)=>{
    res.render('removeAdmin.ejs')
})

app.post('/removeAdmin',async (req,res)=>{
    try{
        let mail=req.body.email;
        await Student.findOneAndUpdate({email:mail},{profType:"Student"});
        
    } catch(err) {
        console.log("cannot update")
        console.log(err+" is the error")
    }
    res.render('manageAdmin.ejs');
})

app.get('/showAdmin',async(req,res)=>{
    try{
        Student.find({profType:"Admin"}, function(err, adminDetails) {
            res.render('adminList.ejs', {adminDetails:adminDetails})
         });
    }catch(err){
        console.log("some error while showing admins");
        console.log(err);
        res.render('manageAdmin.ejs')
    }
})

app.get('/changeName',(req,res)=>{
    res.render('changeName.ejs')
})

app.post('/changeName',async(req,res)=>{
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




app.get("/main", (req, res)=>{
    res.render("main.ejs")
})

app.get("/style", (req, res)=>{
    res.sendFile(__dirname+"/views/index.css")
})


app.get("/image", (req, res)=>{
    res.sendFile(__dirname+"/views/Assets/logo.png")
})

app.get("/profile", (req, res)=>{
    res.render("profile.ejs", {user :currUser})
})

app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.get("/collab", (req, res)=>{
    res.render("collab.ejs");
})
app.get("/edit", (req, res)=>{
    res.render("edit.ejs", {user : currUer});
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
        //sendOTPVerfificationEmail(currentlyRegisteredUser)
        //res.render('verifyMail.ejs',{isfalse:false})
        res.redirect('/login');
    }catch(err){
        console.log(err);
        res.render('register.ejs',{isDuplicateEmail:true});
    }
    //console.log(users)
})
app.get('/server.js', (req, res)=>{
    let name = req.query.uname, newName = req.query.newName;
    res.send(newName);
})

app.get('/manageAdmin', (req, res)=>{
    res.render('manageAdmin.ejs');
})
app.get('/reactjs', (req, res)=>{
    res.sendFile(__dirname+'/views/reactjs.jsx');
})
// 404 Page Not Found
app.get("/pageNotFound", (req, res)=>{
    res.render('pageNotFound.ejs');
})
app.use((req, res, next)=>{
    res.status(404).redirect('/pageNotFound');
})



app.listen(5000);