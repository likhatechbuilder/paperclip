import { Router } from "express";
import { truncateAllTables } from "@paperclipai/db";
import { ensureLocalTrustedBoardPrincipal } from "../services/auth-setup.js";

export function adminRoutes(db: any, databaseUrl: string) {
  const router = Router();

  router.post("/reset", async (req, res) => {
    const { passkey } = req.body;

    if (passkey !== "1234") {
      res.status(403).json({ error: "Invalid passkey" });
      return;
    }

    try {
      console.log("[admin] Initiating full instance reset...");
      await truncateAllTables(databaseUrl);
      console.log("[admin] Database truncated, re-initializing local board...");
      await ensureLocalTrustedBoardPrincipal(db);
      console.log("[admin] Reset complete.");
      res.json({ success: true });
    } catch (err) {
      console.error("[admin] Failed to reset instance:", err);
      res.status(500).json({ error: "Failed to reset instance" });
    }
  });

  return router;
}
