export class UserRepository {
  constructor(db) {
    this.db = db;
  }

  async initialize() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(180) NOT NULL,
        role VARCHAR(40) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  mapRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      name: row.name,
      role: row.role,
      passwordHash: row.password_hash,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async count() {
    const [rows] = await this.db.query("SELECT COUNT(*) AS total FROM users");
    return rows[0]?.total ?? 0;
  }

  async findById(id) {
    const [rows] = await this.db.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [id],
    );

    return this.mapRow(rows[0]);
  }

  async findByUsername(username) {
    const [rows] = await this.db.query(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username.trim().toLowerCase()],
    );

    return this.mapRow(rows[0]);
  }

  async create(user) {
    const timestamp = new Date();
    await this.db.query(
      `
        INSERT INTO users (
          id,
          username,
          name,
          role,
          password_hash,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
      user.id,
      user.username.trim().toLowerCase(),
      user.name.trim(),
      user.role,
      user.passwordHash,
      user.isActive ? 1 : 0,
      timestamp,
      timestamp,
      ],
    );

    return this.findById(user.id);
  }

  async seed(users) {
    if ((await this.count()) > 0) {
      return;
    }

    for (const user of users) {
      await this.create(user);
    }
  }
}