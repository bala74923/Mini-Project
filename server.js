if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}


const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const { redirect } = require('express/lib/response');
const flash = require('express-flash')
const session = require('express-session')

//
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";
//

const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id ===id )
    
)
// function emailVerification(Email) {
//     let emailVerified = false
//     MongoClient.connect(url, function(err, db) {
//         if (err) throw err;
//         var dbo = db.db("mydb");
//         dbo.collection("customers").find({email:Email}).toArray(function(err, result) {
//           if (err) throw err;
//           emailVerified = result.length>0
//           db.close();
//         });
//     });
//     return emailVerified
// }
// function idVerification(Id) {
//     let idVerified = false
//     MongoClient.connect(url, function(err, db) {
//         if (err) throw err;
//         var dbo = db.db("mydb");
//         dbo.collection("customers").find({id:Id}).toArray(function(err, result) {
//           if (err) throw err;
//           idVerified = result.length>0
//           db.close();
//         });
//     });
//     return idVerified
// }


//let idVerified = false,emailVerified = false
// const initializePassport = require('./passport-config')
// initializePassport(
//     passport,
//     email => emailVerification(email),
//     id => idVerification(id)
    
// )

const users=[]

app.set('view-engine', 'ejs')
app.use(express.urlencoded({extended : false}))
app.use(flash())
app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : false

}))

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
        users.push({
            id : Date.now().toString(),
            name : req.body.name,
            email : req.body.email,
            password : hashedPassword
        })

        
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("mydb");
            var myobj = {
                id : Date.now().toString(),
                name : req.body.name,
                email : req.body.email,
                password : hashedPassword
            };
            dbo.collection("customers").insertOne(myobj, function(err, res) {
              if (err) throw err;
              console.log("1 document inserted");
              db.close();
            });
            console.log(myobj);
          });
          
        //
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