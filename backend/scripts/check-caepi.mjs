import { env } from "../config/env.js";
import {
  parseCaepiFile,
  parseCaepiStream,
  resolveCaepiFilePath,
} from "../services/caepi-service.js";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import zlib from "node:zlib";

const linha = (rotulo, valor) => console.log(`${rotulo.padEnd(28)} ${valor}`);

console.log("\n=== Diagnóstico da base do CAEPI ===\n");
linha("Pasta atual (cwd):", process.cwd());
linha("CAEPI_FILE_PATH:", env.caepiFilePath ?? "(não configurado)");

let arquivo = null;

try {
  arquivo = await resolveCaepiFilePath(env.caepiFilePath);
} catch (error) {
  linha("Erro ao resolver caminho:", error.message);
}

if (!arquivo) {
  linha("Arquivo encontrado:", "NENHUM");
  console.log(
    "\nColoque o RelatorioCA_*.csv (ou .gz/.zip) na pasta da aplicação, ou\n" +
      "configure CAEPI_FILE_PATH com o caminho do arquivo ou da pasta.\n" +
      "Sem arquivo local, o sistema tenta o FTP do MTE — que muitas hospedagens bloqueiam.\n",
  );
  process.exit(1);
}

linha("Arquivo encontrado:", arquivo);

const stats = await fs.stat(arquivo);
linha("Tamanho:", `${(stats.size / 1024 / 1024).toFixed(1)} MB`);
linha("Modificado em:", stats.mtime.toLocaleString("pt-BR"));

const handle = await fs.open(arquivo, "r");
const header = Buffer.alloc(4);
await handle.read(header, 0, 4, 0);
await handle.close();

const isZip = header.readUInt32LE(0) === 0x04034b50;
const isGzip = header.readUInt16LE(0) === 0x8b1f;
linha("Formato:", isZip ? "ZIP" : isGzip ? "GZIP" : "texto (CSV/TXT)");

const inicio = Date.now();
let registros;

if (isZip) {
  const buffer = await fs.readFile(arquivo);
  const conteudo = buffer.subarray(
    30 + buffer.readUInt16LE(26) + buffer.readUInt16LE(28),
  );
  const texto = zlib
    .inflateRawSync(conteudo, { finishFlush: zlib.constants.Z_SYNC_FLUSH })
    .toString("utf8");
  registros = parseCaepiFile(texto);
} else {
  const stream = isGzip
    ? createReadStream(arquivo).pipe(zlib.createGunzip())
    : createReadStream(arquivo, { encoding: "utf8" });
  registros = await parseCaepiStream(stream);
}

linha("CAs lidos:", `${registros.length} em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);

const amostra = registros.slice(0, 3);
console.log("\nAmostra:");
for (const item of amostra) {
  console.log(
    `  CA ${item.ca} | ${item.equipamento.slice(0, 45)} | ${item.validade} | ${item.situacao}`,
  );
}

console.log(
  "\nTudo certo. Reinicie a aplicação e use \"Atualizar base\" no Estoque de EPIs.\n",
);
