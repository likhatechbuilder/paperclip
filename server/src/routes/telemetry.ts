import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { heartbeatRunEvents } from "@paperclipai/db";
import { assertCompanyAccess } from "./authz.js";

export function telemetryRoutes(db: Db) {
  const router = Router();

  router.get("/companies/:companyId/telemetry", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    
    const limitNum = parseInt(req.query.limit as string) || 500;

    const results = await db
      .select({
        id: heartbeatRunEvents.id,
        runId: heartbeatRunEvents.runId,
        agentId: heartbeatRunEvents.agentId,
        seq: heartbeatRunEvents.seq,
        eventType: heartbeatRunEvents.eventType,
        stream: heartbeatRunEvents.stream,
        message: heartbeatRunEvents.message,
        payload: heartbeatRunEvents.payload,
        createdAt: heartbeatRunEvents.createdAt,
      })
      .from(heartbeatRunEvents)
      .where(eq(heartbeatRunEvents.companyId, companyId))
      .orderBy(desc(heartbeatRunEvents.createdAt))
      .limit(limitNum);

    // Return in chronological order
    res.json(results.reverse());
  });

  return router;
}
