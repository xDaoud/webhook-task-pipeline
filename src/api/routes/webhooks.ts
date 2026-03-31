import { Router, Request, Response, NextFunction } from "express";
import { ingestWebhook } from "../../services/webhook.service.js";
import { verifySignature } from "../middleware/verifySignature.js";

const router = Router();

// POST /webhooks/:sourceId — entry point for incoming webhook events.
// verifySignature runs first to authenticate the request before ingestion.
// Returns 202 Accepted immediately; actual processing happens asynchronously in the worker.
router.post(
  "/:sourceId",
  verifySignature,
  async (
    req: Request<{ sourceId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    const { sourceId } = req.params;
    const payload = req.body;

    try {
      const job = await ingestWebhook(sourceId, payload);
      // 202 signals the payload was accepted and queued, not yet processed
      res.status(202).json({ jobId: job.id, status: job.status });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
