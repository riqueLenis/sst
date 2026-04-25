const applyFilters = (items, filters) => {
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0,
  );

  if (activeFilters.length === 0) {
    return items;
  }

  return items.filter((item) =>
    activeFilters.every(([field, expectedValue]) => {
      if (!(field in item)) {
        return true;
      }

      return String(item[field]) === expectedValue;
    }),
  );
};

const parseEntity = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? JSON.parse(value) : value;
};

const escapeIdentifier = (value) => {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `\`${value}\``;
};

export class MySqlJsonRepository {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
    this.safeTableName = escapeIdentifier(tableName);
  }

  async initialize() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.safeTableName} (
        id VARCHAR(64) PRIMARY KEY,
        data LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  async count(executor = this.db) {
    const [rows] = await executor.query(
      `SELECT COUNT(*) AS total FROM ${this.safeTableName}`,
    );
    return rows[0]?.total ?? 0;
  }

  async list(filters = {}, executor = this.db) {
    const [rows] = await executor.query(
      `SELECT data FROM ${this.safeTableName} ORDER BY created_at ASC`,
    );
    const items = rows.map((row) => parseEntity(row.data));

    return applyFilters(items, filters);
  }

  async get(id, executor = this.db) {
    const [rows] = await executor.query(
      `SELECT data FROM ${this.safeTableName} WHERE id = ? LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? parseEntity(row.data) : null;
  }

  async create(entity, executor = this.db) {
    const timestamp = new Date();
    await executor.query(
      `INSERT INTO ${this.safeTableName} (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [
      entity.id,
      JSON.stringify(entity),
      timestamp,
      timestamp,
      ],
    );
    return entity;
  }

  async replace(entity, executor = this.db) {
    await executor.query(
      `UPDATE ${this.safeTableName} SET data = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(entity), new Date(), entity.id],
    );
    return entity;
  }

  async remove(id, executor = this.db) {
    await executor.query(`DELETE FROM ${this.safeTableName} WHERE id = ?`, [id]);
  }

  async seed(entries) {
    if ((await this.count()) > 0) {
      return;
    }

    const timestamp = new Date();

    for (const entry of entries) {
      await this.db.query(
        `INSERT INTO ${this.safeTableName} (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        [
        entry.id,
        JSON.stringify(entry),
        timestamp,
        timestamp,
        ],
      );
    }
  }
}
