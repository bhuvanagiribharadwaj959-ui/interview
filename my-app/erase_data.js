import { MongoClient } from 'mongodb';
async function clear() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  await client.connect();
  const adminDb = client.db().admin();
  const dbs = await adminDb.listDatabases();
  let totalDeleted = 0;
  for (let dbInfo of dbs.databases) {
    if (dbInfo.name === 'admin' || dbInfo.name === 'local' || dbInfo.name === 'config') continue;
    const db = client.db(dbInfo.name);
    try {
        const collections = await db.listCollections().toArray();
        for (let c of collections) {
            const count = await db.collection(c.name).countDocuments();
            if (count > 0) {
                const res = await db.collection(c.name).deleteMany({});
                totalDeleted += res.deletedCount;
                console.log("Deleted " + res.deletedCount + " from " + dbInfo.name + "." + c.name);
            }
        }
    } catch(e) {}
  }
  console.log("Total deleted:", totalDeleted);
  await client.close();
}
clear().catch(console.error);
