import { StudentModel } from "./StudentModel.js";

/**
 * @param {Object} options
 * @param {boolean} options.useNativeDriver
 * @returns {Promise<{client: import("knex").Knex, students: StudentModel}>}
 */
async function getPostgresConnection({ useNativeDriver = false }) {
  const clientKey = useNativeDriver ? "NativeClient" : "KnexClient";
  const { [clientKey]: client } = await import("./Knex.js");

  if (useNativeDriver) await client.connect();

  return {
    client,
    students: new StudentModel(client, useNativeDriver),
  };
}

export { getPostgresConnection };
