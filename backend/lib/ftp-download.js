import net from "node:net";


const CRLF = "\r\n";
const DEFAULT_PORT = 21;

const createResponseReader = (socket) => {
  let buffer = "";
  let pending = null;
  let failure = null;

  const tryResolve = () => {
    if (!pending) {
      return;
    }

    const firstLineEnd = buffer.indexOf("\n");

    if (firstLineEnd === -1) {
      return;
    }

    const code = buffer.slice(0, 3);

    if (!/^\d{3}$/.test(code)) {
      const current = pending;
      pending = null;
      current.reject(new Error(`Resposta FTP inesperada: ${buffer.slice(0, 60)}`));
      return;
    }

    // A resposta termina na linha que repete o código seguido de espaço.
    const finalLine = new RegExp(`^${code} [^\\n]*\\n`, "m");
    const match = finalLine.exec(buffer);

    if (!match) {
      return;
    }

    const end = match.index + match[0].length;
    const text = buffer.slice(0, end);
    buffer = buffer.slice(end);

    const current = pending;
    pending = null;
    current.resolve({ code: Number(code), text });
  };

  socket.on("data", (chunk) => {
    buffer += chunk.toString("latin1");
    tryResolve();
  });

  const fail = (error) => {
    failure = error;

    if (pending) {
      const current = pending;
      pending = null;
      current.reject(error);
    }
  };

  socket.on("error", fail);
  socket.on("timeout", () => fail(new Error("Tempo esgotado na conexão FTP.")));
  socket.on("close", () => fail(new Error("Conexão FTP encerrada pelo servidor.")));

  return {
    read: () =>
      new Promise((resolve, reject) => {
        if (failure) {
          reject(failure);
          return;
        }

        pending = { resolve, reject };
        tryResolve();
      }),
  };
};

const connect = (host, port, timeoutMs) =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(timeoutMs);

    const onError = (error) => {
      socket.destroy();
      reject(error);
    };

    socket.once("error", onError);
    socket.once("timeout", () =>
      onError(new Error(`Tempo esgotado ao conectar em ${host}:${port}.`)),
    );
    socket.once("connect", () => {
      socket.removeListener("error", onError);
      resolve(socket);
    });
  });

/** Extrai host e porta da resposta do comando PASV. */
const parsePassiveResponse = (text) => {
  const match = /\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/.exec(text);

  if (!match) {
    throw new Error("Não foi possível interpretar a resposta PASV do servidor.");
  }

  const numbers = match.slice(1).map(Number);

  return {
    host: numbers.slice(0, 4).join("."),
    port: numbers[4] * 256 + numbers[5],
  };
};

/**
 * Baixa um arquivo por FTP anônimo e devolve o conteúdo como Buffer.
 */
export const downloadFileOverFtp = async ({
  host,
  path,
  port = DEFAULT_PORT,
  timeoutMs = 180_000,
  user = "anonymous",
  password = "anonymous@",
}) => {
  const control = await connect(host, port, timeoutMs);
  const reader = createResponseReader(control);

  const send = async (command, expectedCodes) => {
    control.write(command + CRLF);
    const response = await reader.read();

    if (expectedCodes && !expectedCodes.includes(response.code)) {
      throw new Error(
        `Comando FTP "${command.split(" ")[0]}" falhou: ${response.text.trim()}`,
      );
    }

    return response;
  };

  try {
    await reader.read(); // saudação 220
    await send(`USER ${user}`, [230, 331]);
    await send(`PASS ${password}`, [230, 202]);
    await send("TYPE I", [200]);

    const passive = await send("PASV", [227]);
    const target = parsePassiveResponse(passive.text);

    // O servidor pode anunciar um IP interno; nesse caso vale o host original.
    const dataHost = target.host.startsWith("10.") ? host : target.host;
    const dataSocket = await connect(dataHost, target.port, timeoutMs);
    dataSocket.setTimeout(timeoutMs);

    const chunks = [];
    const transfer = new Promise((resolve, reject) => {
      dataSocket.on("data", (chunk) => chunks.push(chunk));
      dataSocket.on("end", resolve);
      dataSocket.on("close", resolve);
      dataSocket.on("error", reject);
      dataSocket.on("timeout", () =>
        reject(new Error("Tempo esgotado durante o download FTP.")),
      );
    });

    control.write(`RETR ${path}${CRLF}`);
    const opening = await reader.read();

    if (![125, 150].includes(opening.code)) {
      dataSocket.destroy();
      throw new Error(`Não foi possível baixar o arquivo: ${opening.text.trim()}`);
    }

    await transfer;
    await reader.read(); // 226 transferência concluída

    return Buffer.concat(chunks);
  } finally {
    try {
      control.write(`QUIT${CRLF}`);
    } catch {
      // Conexão já pode ter caído; o importante é liberar o socket.
    }

    control.destroy();
  }
};
