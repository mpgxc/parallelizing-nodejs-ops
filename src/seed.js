import { faker } from "@faker-js/faker";
import { getMongoConnection, getPostgresConnection } from "./db/index.js";

async function seedMongoDB(amount) {
  const { students, client } = await getMongoConnection();
  console.log("Deleting all students from MongoDB");

  await students.deleteMany({});
  console.log(`Inserting ${amount} students into MongoDB`);

  const batchSize = 1000;
  for (let i = 0; i < amount; i += batchSize) {
    const persons = Array.from(
      { length: Math.min(batchSize, amount - i) },
      () => ({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        age: faker.number.int({ min: 18, max: 60 }),
        registeredAt: faker.date.past(),
      })
    );

    await students.insertMany(persons);
  }

  console.log("Done inserting into MongoDB!");

  await client.close();
}

async function seedPostgres() {
  const db = await getPostgresConnection({ useNativeDriver: true });

  // await db.client.schema.dropTableIfExists("students");

  await db.students.createTable();
}

async function seedDatabases() {
  try {
    await Promise.all([seedMongoDB(1_000_000), seedPostgres()]);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding databases:", error);
  }
}

seedDatabases();
