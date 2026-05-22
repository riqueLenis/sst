import { createApp } from "./app.js";
import { env } from "./config/env.js";

let server;

const shutdown = (signal) => {
	console.log(`[sst-api] received ${signal}, shutting down`);

	if (!server) {
		process.exit(signal === "unhandledRejection" || signal === "uncaughtException" ? 1 : 0);
		return;
	}

	server.close(() => {
		console.log("[sst-api] server stopped");
		process.exit(0);
	});

	setTimeout(() => {
		console.error("[sst-api] forced shutdown after timeout");
		process.exit(1);
	}, 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
	console.error("[sst-api] unhandledRejection", reason);
	shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
	console.error("[sst-api] uncaughtException", error);
	shutdown("uncaughtException");
});

export const startServer = async () => {
	const app = await createApp();

	server = app.listen(env.port, env.host, () => {
		console.log(
			`[sst-api] listening on http://${env.host}:${env.port} (${env.nodeEnv})`,
		);
	});

	return server;
};

startServer().catch((error) => {
	console.error("[sst-api] failed to start", error);
	process.exit(1);
});
