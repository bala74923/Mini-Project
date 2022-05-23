var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
const client = new MongoClient(url);

const result =  client.db("mydb").collection("customers").find({ email:"p1@gmail.com" }).toArray();
console.log(result)