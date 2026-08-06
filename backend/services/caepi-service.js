import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { env } from "../config/env.js";
import { downloadFileOverFtp } from "../lib/ftp-download.js";
import { HttpError } from "../lib/http-error.js";
const FTP_HOST = "ftp.mtps.gov.br";
const FTP_PATH =
  "/portal/fiscalizacao/seguranca-e-saude-no-trabalho/caepi/tgg_export_caepi.zip";

const COLUMNS = [
  "ca",
  "validade",
  "situacao",
  "processo",
  "cnpj",
  "razaoSocial",
  "natureza",
  "equipamento",
  "descricao",
  "marca",
  "referencia",
  "cor",
  "aprovadoPara",
  "restricao",
  "observacao",
  "cnpjLaboratorio",
  "razaoSocialLaboratorio",
  "numeroLaudo",
  "norma",
];

const SITUATION_LABELS = {
  VÁLIDO: "valido",
  VALIDO: "valido",
  VENCIDO: "vencido",
  SUSPENSO: "suspenso",
  CANCELADO: "cancelado",
};

/** Normaliza a situação do CA para uma chave estável usada pelo frontend. */
export const normalizeSituation = (situacao) => {
  const key = String(situacao ?? "")
    .trim()
    .toUpperCase();

  return SITUATION_LABELS[key] ?? "desconhecido";
};

/** Mantém apenas os dígitos do CA (o cadastro aceita "CA 12345", "12.345"...). */
export const normalizeCaNumber = (value) =>
  String(value ?? "").replace(/\D/g, "");

/** Converte "dd/mm/aaaa" do arquivo para "aaaa-mm-dd". */
const toIsoDate = (value) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value ?? "").trim());

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
};

/** Remove o preenchimento de zeros que o MTE deixa no fim do arquivo. */
const trimZeroPadding = (buffer) => {
  let end = buffer.length;

  while (end > 0 && buffer[end - 1] === 0) {
    end -= 1;
  }

  return buffer.subarray(0, end);
};

const inflateSingleFileZip = (buffer) => {
  if (buffer.length < 30 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error("Arquivo do CAEPI não é um ZIP válido.");
  }

  const compressionMethod = buffer.readUInt16LE(8);
  const nameLength = buffer.readUInt16LE(26);
  const extraLength = buffer.readUInt16LE(28);
  const contentStart = 30 + nameLength + extraLength;
  const content = trimZeroPadding(buffer.subarray(contentStart));

  if (compressionMethod === 0) {
    return { data: content, partial: false, payloadBytes: content.length };
  }

  if (compressionMethod !== 8) {
    throw new Error(
      `Compressão não suportada no arquivo do CAEPI: ${compressionMethod}.`,
    );
  }

  const inflater = zlib.createInflateRaw();
  let data;
  let partial = false;

  try {
    data = zlib.inflateRawSync(content);
  } catch {
    partial = true;
    data = zlib.inflateRawSync(content, {
      finishFlush: zlib.constants.Z_SYNC_FLUSH,
    });
  } finally {
    inflater.close();
  }

  return { data, partial, payloadBytes: content.length };
};

export const downloadCaepiFile = async ({ timeoutMs = 180_000 } = {}) => {
  const zipBuffer = await downloadFileOverFtp({
    host: FTP_HOST,
    path: FTP_PATH,
    timeoutMs,
  });

  const { data, partial, payloadBytes } = inflateSingleFileZip(zipBuffer);

  return {
    text: data.toString("utf8"),
    compressedBytes: zipBuffer.length,
    payloadBytes,
    partial,
    source: `ftp://${FTP_HOST}${FTP_PATH}`,
  };
};

const ZIP_SIGNATURE = 0x04034b50;
const GZIP_SIGNATURE = 0x8b1f;

// Nomes usados pelo MTE: relatório exportado do portal e arquivo do FTP.
const CAEPI_FILE_PATTERN = /^(relatorioca|tgg_export_caepi).*\.(csv|txt|zip|gz)$/i;
/** Dentro de uma pasta, devolve o arquivo de CA mais recente (ou null). */
const findCaepiFileInDirectory = async (directory) => {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = entries
    .filter((entry) => entry.isFile() && CAEPI_FILE_PATTERN.test(entry.name))
    .map((entry) => path.join(directory, entry.name));

  if (candidates.length === 0) {
    return null;
  }

  const withTimes = await Promise.all(
    candidates.map(async (file) => ({
      file,
      modifiedAt: (await fs.stat(file)).mtimeMs,
    })),
  );

  withTimes.sort((left, right) => right.modifiedAt - left.modifiedAt);

  return withTimes[0].file;
};

const backendDirectory = path.dirname(
  path.dirname(fileURLToPath(import.meta.url)),
);

const DEFAULT_SEARCH_DIRECTORIES = [
  process.cwd(),
  path.join(process.cwd(), "data"),
  path.join(process.cwd(), "assets"),
  backendDirectory,
  path.join(backendDirectory, "data"),
  path.dirname(backendDirectory),
  path.join(path.dirname(backendDirectory), "assets"),
];

export const resolveCaepiFilePath = async (configuredPath) => {
  if (configuredPath) {
    const stats = await fs.stat(configuredPath);

    if (stats.isFile()) {
      return configuredPath;
    }

    const found = await findCaepiFileInDirectory(configuredPath);

    if (!found) {
      throw new Error(
        `Nenhum arquivo da base do CAEPI encontrado em ${configuredPath} (esperado RelatorioCA_*.csv ou tgg_export_caepi.*).`,
      );
    }

    return found;
  }

  for (const directory of [...new Set(DEFAULT_SEARCH_DIRECTORIES)]) {
    const found = await findCaepiFileInDirectory(directory);

    if (found) {
      return found;
    }
  }

  return null;
};

const readLocalCaepiRecords = async (configuredPath) => {
  const filePath = await resolveCaepiFilePath(configuredPath);
  const handle = await fs.open(filePath, "r");
  let signature;

  try {
    const header = Buffer.alloc(4);
    await handle.read(header, 0, 4, 0);
    signature = header;
  } finally {
    await handle.close();
  }

  const stats = await fs.stat(filePath);
  const isZip = signature.readUInt32LE(0) === ZIP_SIGNATURE;
  const isGzip = signature.readUInt16LE(0) === GZIP_SIGNATURE;

  if (isZip) {
    // O zip do MTE não tem diretório central: reaproveitamos o inflate próprio.
    const buffer = await fs.readFile(filePath);
    const { data, partial } = inflateSingleFileZip(buffer);

    return {
      records: parseCaepiFile(data.toString("utf8")),
      partial,
      bytes: stats.size,
    };
  }

  const stream = isGzip
    ? createReadStream(filePath).pipe(zlib.createGunzip())
    : createReadStream(filePath, { encoding: "utf8" });

  return {
    records: await parseCaepiStream(stream),
    partial: false,
    bytes: stats.size,
  };
};

const detectDelimiter = (headerLine) =>
  headerLine.split(";").length > headerLine.split("|").length ? ";" : "|";

const splitLine = (line, delimiter) => {
  if (!line.includes('"')) {
    return line.split(delimiter);
  }

  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);

  return values;
};

const createRecordCollector = () => {
  const byCa = new Map();

  return {
    add(line, delimiter) {
      if (!line || !line.includes(delimiter)) {
        return;
      }

      const parts = splitLine(line, delimiter);
      const record = {};

      COLUMNS.forEach((column, columnIndex) => {
        record[column] = (parts[columnIndex] ?? "").trim();
      });

      record.ca = normalizeCaNumber(record.ca);

      if (!record.ca) {
        return;
      }

      record.validade = toIsoDate(record.validade);

      const current = byCa.get(record.ca);
      if (!current || shouldReplaceRecord(current, record)) {
        byCa.set(record.ca, record);
      }
    },
    result() {
      return [...byCa.values()];
    },
  };
};

export const parseCaepiFile = (text) => {
  const lines = text.replace(/^﻿+/, "").split(/\r?\n/);
  const delimiter = detectDelimiter(lines[0] ?? "");
  const collector = createRecordCollector();

  // A primeira linha é o cabeçalho das colunas.
  for (let index = 1; index < lines.length; index += 1) {
    collector.add(lines[index], delimiter);
  }

  return collector.result();
};

export const parseCaepiStream = async (readable) => {
  const rl = readline.createInterface({ input: readable, crlfDelay: Infinity });
  const collector = createRecordCollector();

  let delimiter = null;
  let lineNumber = 0;

  for await (const rawLine of rl) {
    const line = lineNumber === 0 ? rawLine.replace(/^﻿+/, "") : rawLine;
    lineNumber += 1;

    if (delimiter === null) {
      delimiter = detectDelimiter(line);
      continue; // cabeçalho
    }

    collector.add(line, delimiter);
  }

  return collector.result();
};

const shouldReplaceRecord = (current, candidate) => {
  if (candidate.validade && !current.validade) {
    return true;
  }

  if (!candidate.validade) {
    return false;
  }

  if (candidate.validade !== current.validade) {
    return candidate.validade > current.validade;
  }

  return (
    normalizeSituation(candidate.situacao) === "valido" &&
    normalizeSituation(current.situacao) !== "valido"
  );
};

export class CaepiService {
  constructor(repository) {
    this.repository = repository;
    this.syncPromise = null;
    this.lastError = null;
    this.resolvedFile = null;
  }

  /** Consulta um CA na base local. */
  async findByNumber(rawNumber) {
    const ca = normalizeCaNumber(rawNumber);

    if (!ca) {
      throw new HttpError(400, "Informe o número do CA para consultar.");
    }

    const record = await this.repository.findByCa(ca);

    if (!record) {
      return null;
    }

    return this.decorate(record);
  }

  /** Consulta vários CAs de uma vez (usado para validar o estoque). */
  async findManyByNumber(rawNumbers) {
    const numbers = [
      ...new Set(
        (Array.isArray(rawNumbers) ? rawNumbers : [])
          .map(normalizeCaNumber)
          .filter(Boolean),
      ),
    ].slice(0, 500);

    if (numbers.length === 0) {
      return [];
    }

    const records = await this.repository.findManyByCa(numbers);

    return records.map((record) => this.decorate(record));
  }

  /** Acrescenta a situação normalizada e o vencimento calculado. */
  decorate(record) {
    const situation = normalizeSituation(record.situacao);
    const isExpiredByDate = record.validade
      ? new Date(`${record.validade}T23:59:59`).getTime() < Date.now()
      : false;

    return {
      ...record,
      situacaoNormalizada:
        situation === "valido" && isExpiredByDate ? "vencido" : situation,
      vencido: situation === "vencido" || isExpiredByDate,
      regular: situation === "valido" && !isExpiredByDate,
    };
  }

  async getStatus() {
    const [total, lastSync] = await Promise.all([
      this.repository.count(),
      this.repository.getLastSync(),
    ]);

    return {
      total,
      lastSyncAt: lastSync?.syncedAt ?? null,
      lastSyncRecords: lastSync?.records ?? null,
      partial: lastSync?.partial ?? false,
      lastError: this.lastError ?? null,
      source:
        this.resolvedFile ?? env.caepiFilePath ?? `ftp://${FTP_HOST}${FTP_PATH}`,
      syncing: this.syncPromise !== null,
    };
  }

  async sync({ force = false } = {}) {
    if (this.syncPromise) {
      return this.syncPromise;
    }

    if (!force && !(await this.isStale())) {
      const status = await this.getStatus();
      return { skipped: true, ...status };
    }

    this.syncPromise = this.runSync().finally(() => {
      this.syncPromise = null;
    });

    return this.syncPromise;
  }

  /** A base do MTE é publicada uma vez por dia; nada de rebaixar com mais frequência. */
  async isStale() {
    const [total, lastSync] = await Promise.all([
      this.repository.count(),
      this.repository.getLastSync(),
    ]);

    if (total === 0 || !lastSync?.syncedAt) {
      return true;
    }

    const elapsed = Date.now() - new Date(lastSync.syncedAt).getTime();
    return elapsed >= 20 * 60 * 60 * 1000;
  }

  async runSync() {
    const startedAt = Date.now();

    try {
      const syncFromFtp = async () => {
        const downloaded = await downloadCaepiFile();

        return {
          records: parseCaepiFile(downloaded.text),
          partial: downloaded.partial,
          bytes: downloaded.payloadBytes,
        };
      };

      let source;
      let localFile = null;

      try {
        localFile = await resolveCaepiFilePath(env.caepiFilePath);
      } catch (error) {
        console.warn(
          `[sst-api] CAEPI_FILE_PATH inválido (${error.message}); tentando o FTP oficial.`,
        );
      }

      if (localFile) {
        console.log(`[sst-api] base do CAEPI: importando de ${localFile}`);
        source = await readLocalCaepiRecords(localFile);
        this.resolvedFile = localFile;
      } else {
        source = await syncFromFtp();
        this.resolvedFile = null;
      }

      const { records, partial } = source;
      const payloadBytes = source.bytes;

      if (records.length === 0) {
        throw new HttpError(
          502,
          "A base do CAEPI foi baixada, mas nenhum registro válido foi encontrado.",
        );
      }

      if (partial) {
        await this.repository.upsertMany(records);
      } else {
        await this.repository.replaceAll(records);
      }

      const total = await this.repository.count();
      await this.repository.registerSync(total, partial);

      const elapsedMs = Date.now() - startedAt;
      this.lastError = null;

      console.log(
        `[sst-api] base CAEPI sincronizada: ${records.length} CAs no arquivo${
          partial
            ? ` (arquivo oficial incompleto — ${(payloadBytes / 1024 / 1024).toFixed(1)} MB úteis; total acumulado: ${total})`
            : ""
        } em ${(elapsedMs / 1000).toFixed(1)}s.`,
      );

      return {
        skipped: false,
        records: records.length,
        total,
        partial,
        elapsedMs,
      };
    } catch (error) {
      this.lastError = error.message;
      throw error;
    }
  }
}
