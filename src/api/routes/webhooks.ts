import { Router, Request, Response, NextFunction } from 'express';
import { ingestWebhook } from '../../services/webhook.service.js';

const router = Router();

// POST /webhooks/:sourceId
router.post('/:sourceId', async (req: Request<{ sourceId: string }>, res: Response, next: NextFunction) => {
  const { sourceId } = req.params;
  const payload = req.body;

  try {
    const job = await ingestWebhook(sourceId, payload);
    res.status(202).json({ jobId: job.id, status: job.status});
  } catch(error) {
    next(error);
  }
});

export default router;