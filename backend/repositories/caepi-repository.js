import { runInTransaction } from "../db/client.js";

// Lotes de INSERT: 52 mil registros em uma única instrução estouraria o
// max_allowed_packet do MySQL.
const BATCH_SIZE = 500;

export class CaepiRepository {
  constructor(db) {
    this.db = db;
  }

  async initialize() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS caepi (
        ca VARCHAR(20) PRIMARY KEY,
        validade DATE NULL,
        situacao VARCHAR(40) NOT NULL DEFAULT '',
        processo VARCHAR(40) NOT NULL DEFAULT '',
        cnpj VARCHAR(20) NOT NULL DEFAULT '',
        razao_social VARCHAR(255) NOT NULL DEFAULT '',
        natureza VARCHAR(40) NOT NULL DEFAULT '',
        equipamento VARCHAR(255) NOT NULL DEFAULT '',
        descricao TEXT NULL,
        marca VARCHAR(180) NOT NULL DEFAULT '',
        referencia VARCHAR(180) NOT NULL DEFAULT '',
        cor VARCHAR(120) NOT NULL DEFAULT '',
        aprovado_para TEXT NULL,
        restricao TEXT NULL,
        observacao TEXT NULL,
        cnpj_laboratorio VARCHAR(20) NOT NULL DEFAULT '',
        razao_social_laboratorio VARCHAR(255) NOT NULL DEFAULT '',
        numero_laudo VARCHAR(120) NOT NULL DEFAULT '',
        norma TEXT NULL,
        updated_at DATETIME(3) NOT NULL,
        INDEX idx_caepi_situacao (situacao),
        INDEX idx_caepi_validade (validade)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.db.query(`
      CREATE TABLE IF NOT EXISTS caepi_sync (
        id TINYINT PRIMARY KEY,
        synced_at DATETIME(3) NOT NULL,
        records INT NOT NULL,
        partial TINYINT(1) NOT NULL DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Instalações anteriores não tinham a coluna "partial".
    const [columns] = await this.db.query(
      "SHOW COLUMNS FROM caepi_sync LIKE 'partial'",
    );

    if (columns.length === 0) {
      await this.db.query(
        "ALTER TABLE caepi_sync ADD COLUMN partial TINYINT(1) NOT NULL DEFAULT 0",
      );
    }
  }

  mapRow(row) {
    if (!row) {
      return null;
    }

    return {
      ca: row.ca,
      validade: row.validade ? formatDateOnly(row.validade) : null,
      situacao: row.situacao,
      processo: row.processo,
      cnpj: row.cnpj,
      razaoSocial: row.razao_social,
      natureza: row.natureza,
      equipamento: row.equipamento,
      descricao: row.descricao ?? "",
      marca: row.marca,
      referencia: row.referencia,
      cor: row.cor,
      aprovadoPara: row.aprovado_para ?? "",
      restricao: row.restricao ?? "",
      observacao: row.observacao ?? "",
      cnpjLaboratorio: row.cnpj_laboratorio,
      razaoSocialLaboratorio: row.razao_social_laboratorio,
      numeroLaudo: row.numero_laudo,
      norma: row.norma ?? "",
      atualizadoEm: row.updated_at,
    };
  }

  async count() {
    const [rows] = await this.db.query("SELECT COUNT(*) AS total FROM caepi");
    return rows[0]?.total ?? 0;
  }

  async findByCa(ca) {
    const [rows] = await this.db.query(
      "SELECT * FROM caepi WHERE ca = ? LIMIT 1",
      [ca],
    );

    return this.mapRow(rows[0]);
  }

  async findManyByCa(numbers) {
    if (numbers.length === 0) {
      return [];
    }

    const placeholders = numbers.map(() => "?").join(", ");
    const [rows] = await this.db.query(
      `SELECT * FROM caepi WHERE ca IN (${placeholders})`,
      numbers,
    );

    return rows.map((row) => this.mapRow(row));
  }

  /** Troca a base inteira em uma transação: ou entra tudo, ou nada muda. */
  async replaceAll(records) {
    return this.writeAll(records, { replaceExisting: true });
  }

  /**
   * Insere/atualiza sem apagar o que já existe. Usado quando o arquivo oficial
   * vem incompleto: cada sincronização acrescenta os CAs que faltavam.
   */
  async upsertMany(records) {
    return this.writeAll(records, { replaceExisting: false });
  }

  // Atenção: o nome do parâmetro não pode ser "truncate" — colidiria com o
  // helper truncate() usado abaixo para cortar os valores das colunas.
  async writeAll(records, { replaceExisting }) {
    return runInTransaction(this.db, async (connection) => {
      if (replaceExisting) {
        await connection.query("DELETE FROM caepi");
      }

      const timestamp = new Date();

      for (let index = 0; index < records.length; index += BATCH_SIZE) {
        const batch = records.slice(index, index + BATCH_SIZE);
        const values = batch.map((record) => [
          record.ca,
          record.validade,
          truncate(record.situacao, 40),
          truncate(record.processo, 40),
          truncate(record.cnpj, 20),
          truncate(record.razaoSocial, 255),
          truncate(record.natureza, 40),
          truncate(record.equipamento, 255),
          record.descricao,
          truncate(record.marca, 180),
          truncate(record.referencia, 180),
          truncate(record.cor, 120),
          record.aprovadoPara,
          record.restricao,
          record.observacao,
          truncate(record.cnpjLaboratorio, 20),
          truncate(record.razaoSocialLaboratorio, 255),
          truncate(record.numeroLaudo, 120),
          record.norma,
          timestamp,
        ]);

        await connection.query(
          `INSERT INTO caepi (
            ca, validade, situacao, processo, cnpj, razao_social, natureza,
            equipamento, descricao, marca, referencia, cor, aprovado_para,
            restricao, observacao, cnpj_laboratorio, razao_social_laboratorio,
            numero_laudo, norma, updated_at
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            validade = VALUES(validade),
            situacao = VALUES(situacao),
            processo = VALUES(processo),
            cnpj = VALUES(cnpj),
            razao_social = VALUES(razao_social),
            natureza = VALUES(natureza),
            equipamento = VALUES(equipamento),
            descricao = VALUES(descricao),
            marca = VALUES(marca),
            referencia = VALUES(referencia),
            cor = VALUES(cor),
            aprovado_para = VALUES(aprovado_para),
            restricao = VALUES(restricao),
            observacao = VALUES(observacao),
            cnpj_laboratorio = VALUES(cnpj_laboratorio),
            razao_social_laboratorio = VALUES(razao_social_laboratorio),
            numero_laudo = VALUES(numero_laudo),
            norma = VALUES(norma),
            updated_at = VALUES(updated_at)`,
          [values],
        );
      }

      return records.length;
    });
  }

  async registerSync(records, partial = false) {
    await this.db.query(
      `INSERT INTO caepi_sync (id, synced_at, records, partial) VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE synced_at = VALUES(synced_at), records = VALUES(records), partial = VALUES(partial)`,
      [new Date(), records, partial ? 1 : 0],
    );
  }

  async getLastSync() {
    const [rows] = await this.db.query(
      "SELECT synced_at, records, partial FROM caepi_sync WHERE id = 1 LIMIT 1",
    );

    const row = rows[0];

    return row
      ? {
          syncedAt: row.synced_at,
          records: row.records,
          partial: Boolean(row.partial),
        }
      : null;
  }
}

const truncate = (value, max) => String(value ?? "").slice(0, max);

const formatDateOnly = (value) => {
  if (value instanceof Date) {
    const month = `${value.getMonth() + 1}`.padStart(2, "0");
    const day = `${value.getDate()}`.padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
};
