import { createPool } from "mariadb";

class Repository {
  pool;
  conn;

  constructor() {}

  async connection(config) {
    try {
      if (!this.pool) {
        this.pool = createPool(config);
      }
      if (!this.conn) {
        this.conn = await this.pool.getConnection();
        await query(`CREATE DATABASE IF NOT EXISTS (?)`, [config.database]);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async query(query, values) {
    try {
      if (!this.conn) {
        this.conn = await this.pool.getConnection();
      }
      return await this.conn.query(query, values);
    } catch (err) {
      console.log(err);
    } finally {
      this.conn.release();
    }
  }
}

export default new Repository();
