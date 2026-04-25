import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const baseConnectionConfig = {
  host: env.mysqlHost,
  port: env.mysqlPort,
  user: env.mysqlUser,
  password: env.mysqlPassword,
  waitForConnections: true,
  connectionLimit: env.mysqlConnectionLimit,
  queueLimit: 0,
  decimalNumbers: true,
};

export const createDatabaseClient = async () => {
  const adminPool = mysql.createPool(baseConnectionConfig);

  try {
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.mysqlDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await adminPool.end();
  }

  const db = mysql.createPool({
    ...baseConnectionConfig,
    database: env.mysqlDatabase,
  });

  await db.query("SELECT 1");
  return db;
};

export const runInTransaction = async (db, operation) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback errors so the original cause is preserved.
    }

    throw error;
  } finally {
    connection.release();
  }
};
