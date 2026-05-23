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

const withDatabaseConfigHint = (error) => {
  if (!error || typeof error !== "object") {
    return error;
  }

  if (
    error.code === "ER_ACCESS_DENIED_ERROR" ||
    error.code === "ER_DBACCESS_DENIED_ERROR" ||
    error.code === "ER_BAD_DB_ERROR"
  ) {
    error.message = [
      error.message,
      `Verifique MYSQL_HOST/DB_HOST, MYSQL_PORT/DB_PORT, MYSQL_USER/DB_USER, MYSQL_PASSWORD/DB_PASSWORD e MYSQL_DATABASE/DB_NAME. Atual: ${env.mysqlUser}@${env.mysqlHost}:${env.mysqlPort}/${env.mysqlDatabase}`,
      "Em hospedagem cPanel/LiteSpeed, normalmente voce deve usar o usuario e o banco criados no painel, nao `root`.",
    ].join(" ");
  }

  return error;
};

export const createDatabaseClient = async () => {
  try {
    if (env.mysqlAutoCreateDatabase) {
      const adminPool = mysql.createPool(baseConnectionConfig);

      try {
        await adminPool.query(
          `CREATE DATABASE IF NOT EXISTS \`${env.mysqlDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
        );
      } finally {
        await adminPool.end();
      }
    }

    const db = mysql.createPool({
      ...baseConnectionConfig,
      database: env.mysqlDatabase,
    });

    await db.query("SELECT 1");
    return db;
  } catch (error) {
    throw withDatabaseConfigHint(error);
  }
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
