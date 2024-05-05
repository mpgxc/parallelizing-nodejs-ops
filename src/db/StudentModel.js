import pg from "pg";

export class StudentModel {
  /**
   * @param {import("knex").Knex} dbClient
   * @param {boolean} isNativePg
   */

  /**
   *
   * @param {pg.Client} dbClient
   * @param {*} isNativePg
   */
  constructor(dbClient, isNativePg = false) {
    this.dbClient = dbClient;
    this.isNativePg = isNativePg;
  }

  async insert({ name, email, age, registeredAt }) {
    if (this.isNativePg) {
      await this.dbClient.query(
        "INSERT INTO students (name, email, age, registered_at) VALUES ($1, $2, $3, $4)",
        [name, email, age, registeredAt]
      );
    } else {
      await this.dbClient
        .insert({
          name,
          email,
          age,
          registered_at: registeredAt,
        })
        .into("students");
    }
  }

  async insertMany(data) {
    if (this.isNativePg) {
      const values = data
        .map(
          (_, index) =>
            `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${
              index * 4 + 4
            })`
        )
        .join(", ");

      const query = `INSERT INTO students (name, email, age, registered_at) VALUES ${values}`;

      const valuesArr = data.flatMap(({ name, email, age, registeredAt }) => [
        name,
        email,
        age,
        registeredAt,
      ]);

      await this.dbClient.query(query, valuesArr);
    } else {
      await this.dbClient.batchInsert("students", data, data.length);
    }
  }

  async list(limit = 100) {
    if (this.isNativePg) {
      const query = "SELECT * FROM students LIMIT $1";
      const values = [limit];

      const result = await this.dbClient.query(query, values);
      return result.rows;
    } else {
      const result = await this.dbClient.select().from("students").limit(limit);
      return result;
    }
  }

  async count() {
    if (this.isNativePg) {
      const query = "SELECT COUNT(*) as total FROM students";

      const result = await this.dbClient.query(query);
      return Number(result.rows[0].total);
    } else {
      const [{ total }] = await this.dbClient
        .count("* as total")
        .from("students");
      return total;
    }
  }

  async deleteAll() {
    if (this.isNativePg) {
      await this.dbClient.query("DELETE FROM students");
    } else {
      await this.dbClient.delete().from("students");
    }
  }

  async createTable() {
    if (this.isNativePg) {
      const createStudentsTableQuery = `
    CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
      await this.dbClient.query(createStudentsTableQuery);
    } else {
      await this.dbClient.schema.createTable("students", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("email").notNullable();
        table.integer("age").notNullable();
        table.timestamp("registered_at").defaultTo(this.dbClient.fn.now());
      });
    }
  }
}
