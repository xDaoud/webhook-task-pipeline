import { Router, Request, Response } from 'express';
import { ingestWebhook } from 'src/services/webhook.service';

const router = Router();

// POST /webhooks/:sourceId
router.post('/:sourceId', async (req: Request<{ sourceId: string }>, res: Response) => {
  const { sourceId } = req.params;
  const payload = req.body;

  try {
    const job = await ingestWebhook(sourceId, payload);
    res.status(202).json({ jobId: job.id, status: job.status});
  } catch(error) {
      if(error instanceof Error){
        if(error.message === 'PIPELINE_NOT_FOUND'){
          res.status(404).json({ error: 'Pipeline not found' });
          return;
        }
        if(error.message === 'PIPELINE_PAUSED'){
          res.status(409).json({ error: 'Pipeline is paused' });
          return;
        }
      }
    res.status(500).json({ error: 'Internal server error '});
  }
});

export default router;