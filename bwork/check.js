const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";

async function find() {
    let res = ""
    const client = await MongoClient.connect(url)
        .catch(err => { console.log(err); });

    if (!client) {
        return;
    }

    try {

        const db = client.db("mydb");

        let collection = db.collection('customers');

        let query = { email:"p1@gmail.com" }

         res = await collection.findOne(query);

        console.log(res);

    } catch (err) {

        console.log(err);
    } finally {

        client.close();
    }
    return await res!=null
}

let val =  find()
console.log(val)