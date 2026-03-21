import { Router, Request, Response } from 'express';
import { createPipeline, getAllPipelines } from 'src/services/pipeline.service';
import { CreatePipelineBody } from 'src/types';

const router = Router();

// POST   /pipelines
router.post('/', async (req: Request, res: Response) => {
  const body: CreatePipelineBody = req.body;
  
  if(!body.name || !body.actionType || !body.actionConfig || !body.subscribers?.length) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const pipeline = await createPipeline(body);
  res.status(201).json(pipeline);
});
// GET    /pipelines
router.get('/', async (_req: Request, res: Response) => {
  const allPipelines = await getAllPipelines();
  res.status(200).json(allPipelines);
});
// GET    /pipelines/:id
// PATCH  /pipelines/:id
// DELETE /pipelines/:id

export default router;