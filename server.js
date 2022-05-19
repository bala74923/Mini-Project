
/*
to kill port already in use
sudo lsof -i :{portnumber}
kill {pid}

sudo -s
date --set 2022-05-20
date --set hrs:min

*/


if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
 
// create Student model
const Student = require('./models/student')
const schedule = require('node-schedule')
// create eventinfo db
const Eventinfo = require('./models/eventinfo')
//

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { redirect } = require('express/lib/response');
const flash = require('express-flash')
const session = require('express-session')

// const MongoClient = require('mongodb').MongoClient;
// const url = "mongodb://localhost:27017/";
const mongoose =  require('mongoose');
const url = "mongodb://localhost:27017/actrack"; //db name-  actrack 

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
const initializePassport = require('./passport-config')
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
    res.render('index.ejs',{name:currUser.name} )

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
app.get("/logout",(req,res)=>{
    req.logout();
    res.redirect("/");
});

app.get('/register', checkNotAuthenticated,(req, res)=>{
    res.render('register.ejs')
})

app.post('/register',checkNotAuthenticated, async (req, res)=>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        var myobj = {
            id : Date.now().toString(),
            name : req.body.name,
            email : req.body.email,
            password : hashedPassword
        };
        //users.push(myobj)
        const student = new Student(myobj)
        const newStduent = await student.save();
        
        res.redirect('/login')
    }catch{
        res.redirect('/register')
    }
    //console.log(users)
})
function checkAuthenticated(req, res,next){
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
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
        res.render('eventlist.ejs', {eventdetails:eventdetails});
        //console.log("sending the page");
        // for(const i in eventdetails[0]){
        //     console.log(i)
        // }
        // console.log(eventdetails)
     });
});

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
app.post('/events', checkAuthenticated, (req, res)=>{
    try{
        const eventObj = {
            id : Date.now().toString(),
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
        console.log(eventObj)
        //new Eventinfo(eventObj).save();
        Eventinfo.create(eventObj, function(err, doc) {
        if (err) return console.error(err); // Handle the error
        // var now = new Date();
        // var day = new Date(eventObj.date);
        // // var when = new Date(now).setHours(now.getHours() + 1);
        // var when = new Date(now).setMilliseconds(day.getTime()-now.getTime()+(1000*60*60))
        // schedule.scheduleJob(when, function() {
        //     // This callback will fire in one hour
        //     Eventinfo.find({ id:eventObj.id }).remove().exec();
        // });
        // let now = new Date();
        // let day = new Date(eventObj.date);
        // console.log(eventObj.date+" is the date")
        // let parts = eventObj.time.toString().split(":")
        // let hour = parseInt(parts[0])
        // let mins = parseInt(parts[1])
        // day.setHours(hour)
        // day.setMinutes(mins)
        // //day = new Date(day.getTime()+d.getTime())//console.log(d)
        // const when = day;
        // console.log(day);
        let p1 = split_dates(eventObj.date,"-");
        let p2 = split_dates(eventObj.time,":");
        const when = new Date(p1[0],p1[1]-1,p1[2],p2[0],p2[1]+1,0,0);
        console.log(when+" is the time the post will be deleted")
        
        //console.log(now+" to "+day)
        //console.log(eventObj.date+" =>"+eventObj.time);
        //var when = new Date(now).setHours(now.getHours() + 1);
        // let minutes = Math.abs(day.getTime() - now.getTime())/60000;//1000ms-> 60sec ->1min
        // let delhrs = 
        //let when = new Date(now).setMinutes()
        //console.log(minutes+2)
        schedule.scheduleJob(when, ()=> {
            // This callback will fire in one hour
            Eventinfo.find({ id:eventObj.id }).remove().exec();
        });
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
app.get('/logout', (req, res) => {
    res.clearCookie('nToken');
    return res.redirect('/');
  });


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

app.listen(5000)