import { MongoClient } from 'mongodb';
async function clear() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const db = client.db('interview');
  const collections = await db.listCollections().toArray();
  console.log("Collections:", collections.map(c => c.name));
  const count = await db.collection('interviews').countDocuments();
  console.log("Total interviews:", count);
  const res = await db.collection('interviews').deleteMany({});
  console.log("Deleted count:", res.deletedCount);
  await client.close();
}
clear().catch(console.error);
