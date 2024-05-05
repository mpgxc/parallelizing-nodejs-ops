import cliProgress from "cli-progress";
import fastq from "fastq";
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

async function worker(postgres, data) {
  await postgres.students.insertMany(data);
}

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

const queue = fastq.promise((data) => worker(postgres, data), 100);

console.time("Processing time");

for await (const data of getAllPagedData(mongo, 10000)) {
  await queue.push(data);

  progress.increment(data.length);
}

await queue.drain();
progress.stop();
console.timeEnd("Processing time");

console.log("All items have been processed");
process.exit(0);
