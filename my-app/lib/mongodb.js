import { MongoClient } from 'mongodb';

const DEFAULT_URI = 'mongodb://localhost:27017/interview';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable.');
}

const options = {};
let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect();
}

export async function getDb() {
  const connectedClient = await clientPromise;
  return connectedClient.db('interview');
}

export default clientPromise;
