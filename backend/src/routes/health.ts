import { FastifyInstance } from "fastify";

export async function healthRoutes(server: FastifyInstance) {
  server.get("/health", async (_request, _reply) => {
    return {
      status: "ok",
      service: "oracles-decree-api",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}
