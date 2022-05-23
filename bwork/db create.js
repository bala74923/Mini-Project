var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/mydb";
let emailVerified = false
async function  emailVerification(Email) {
 
  MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db("mydb");
      dbo.collection("customers").find({email:Email}).toArray( function(err, result) {
        if (err) throw err;
        console.log(result.length)
        if(result.length>0) emailVerified = true
        console.log("inside function:"+emailVerified)
        db.close();
      });
  });
}
 emailVerification("p1@gmail.com")
console.log(emailVerified)
