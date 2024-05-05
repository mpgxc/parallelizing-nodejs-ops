import { Queue, Worker } from "bullmq";
import cliProgress from "cli-progress";
import { getMongoConnection, getPostgresConnection } from "./db/index.js";

function createProgressBar() {
  return new cliProgress.SingleBar(
    {
      format: "progress [{bar}] {percentage}% | {value}/{total} | {duration}s",
      clearOnComplete: false,
    },
    cliProgress.Presets.shades_classic
  );
}

// async function worker(postgres, data) {}

async function deleteExistingPostgresData(postgres) {
  await postgres.students.deleteAll();
}

async function* getAllPagedData(mongo, itemsPerPage, page = 0) {
  const data = mongo.students.find().skip(page).limit(itemsPerPage);
  const items = await data.toArray();
  if (!items.length) return;
  yield items;
  yield* getAllPagedData(mongo, itemsPerPage, (page += itemsPerPage));
}

const postgres = await getPostgresConnection({
  useNativeDriver: true,
});

const progress = createProgressBar();
const mongo = await getMongoConnection();

await deleteExistingPostgresData(postgres);

const total = await mongo.students.countDocuments();
progress.start(total, 0);

console.time("Processing time");

const queue = new Queue("queue", {
  connection: {
    host: "localhost",
    port: 6379,
  },
});

const worker = new Worker(
  "queue",
  async (job) => {
    await postgres.students.insertMany(job.data);
  },
  {
    useWorkerThreads: true,
    concurrency: 99,
    connection: {
      host: "localhost",
      port: 6379,
    },
  }
);

for await (const data of getAllPagedData(mongo, 10000)) {
  await queue.add("insert", data, {
    removeOnComplete: true,
  });

  progress.increment(data.length);
}

worker.run();

progress.stop();
console.timeEnd("Processing time");

console.log("All items have been processed");
process.exit(0);
