import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import dotenv from "dotenv";
import { healthRoutes } from "./routes/health.js";
import { scanRoutes } from "./routes/scan.js";
import { reportRoutes } from "./routes/report.js";
import { verifyRoutes } from "./routes/verify.js";
import { githubAuthRoutes } from "./routes/githubAuth.js";

dotenv.config();

const server = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  },
  requestTimeout: 120_000, // 2 min for GitHub repo scans
});

async function bootstrap() {
  // Register plugins
  await server.register(cors, {
    origin: ["http://localhost:3000", "http://localhost:3001", process.env.FRONTEND_URL || ""].filter(Boolean),
    credentials: true,
  });

  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB max
      files: 50,
    },
  });

  // Register routes
  await server.register(healthRoutes, { prefix: "/api" });
  await server.register(scanRoutes, { prefix: "/api" });
  await server.register(reportRoutes, { prefix: "/api" });
  await server.register(verifyRoutes, { prefix: "/api" });
  await server.register(githubAuthRoutes, { prefix: "/api" });

  // Start server
  const port = Number(process.env.PORT) || 3001;
  const host = process.env.HOST || "0.0.0.0";

  try {
    await server.listen({ port, host });
    server.log.info(`🔮 Oracle's Decree API running on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();

export default server;
