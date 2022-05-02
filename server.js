if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}
 
// create Student model
const Student = require('./models/student')
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

/*
to kill port already in use
sudo lsof -i :{portnumber}
kill {pid}

*/

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

const initializePassport = require('./passport-config')
initializePassport(
    passport,
     //email => users.find(user => user.email === email),
    async function(email){
        const mail = await Student.findOne({email:email});
        console.log(mail+" is using email");
       return mail;
    },
    //id => users.find(user => user.id ===id )
    async function(id){
        console.log(id);
        const tval = await Student.findOne({id:id});
        console.log(tval+" is using id");
        return tval;
    }
)


app.use(passport.initialize())
app.use(passport.session())

app.get('/', checkAuthenticated,(req, res)=>{
    res.render('index.ejs', {name :req.user.name})
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
        users.push(myobj)
        const student = new Student(myobj)
        const newStduent = await student.save();
        
        res.redirect('/login')
    }catch{
        res.redirect('/register')
    }
    console.log(users)
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


app.listen(5000)