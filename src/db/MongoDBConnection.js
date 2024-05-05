import { MongoClient } from "mongodb";

async function createMongoClient() {
  const client = new MongoClient(process.env.MONGO_URL);

  await client.connect();

  return client;
}

async function getMongoConnection() {
  let client = null;

  try {
    client = await createMongoClient();
    const collection = client.db("school").collection("students");

    return {
      students: collection,
      client,
    };
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);

    if (client) {
      await client.close();
    }

    throw error;
  }
}

export { getMongoConnection };
