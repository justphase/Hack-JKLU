import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function reportRoutes(server: FastifyInstance) {
  // Get report for a scan
  server.get("/reports/:scanId", async (request: FastifyRequest<{ Params: { scanId: string } }>, reply: FastifyReply) => {
    const { scanId } = request.params;

    // TODO: Fetch report from Supabase
    return reply.send({
      scanId,
      message: "Report retrieval will be connected to Supabase in Phase 4",
      vulnerabilities: [],
      riskScore: null,
    });
  });

  // List all reports for the current user
  server.get("/reports", async (_request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Fetch user reports from Supabase
    return reply.send({
      reports: [],
      message: "Report listing will be connected to Supabase",
    });
  });
}
