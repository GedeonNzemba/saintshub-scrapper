import { MongoClient, Db, MongoClientOptions } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "test";

if (!MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is required. ' +
    'Set it in your environment (Railway, .env, etc.) before starting the server.'
  );
}

const clientOptions: MongoClientOptions = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '50', 10),
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '5', 10),
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  retryWrites: true,
};

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI as string, clientOptions);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');

    db = client.db(DB_NAME);
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectToDatabase() first.');
  }
  return db;
}

export async function pingDatabase(): Promise<boolean> {
  if (!db) return false;
  try {
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('Database connection closed');
  }
}
