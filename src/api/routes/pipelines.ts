import { Router, Request, Response, NextFunction } from 'express';
import { createPipeline, deletePipeline, getAllPipelines, getPipelineById, updatePipeline } from '../../services/pipeline.service.js';
import { CreatePipelineBody, UpdatePipelineBody } from '../../types/index.js';

const router = Router();

// POST   /pipelines
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const body: CreatePipelineBody = req.body;

  if(!body.name || !body.actionType || !body.actionConfig || !body.subscribers?.length) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const pipeline = await createPipeline(body);
    res.status(201).json(pipeline);
  } catch(error) {
    next(error);
  }
});
// GET    /pipelines
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const allPipelines = await getAllPipelines();
    res.status(200).json(allPipelines);
  } catch(error) {
    next(error);
  }
});
// GET    /pipelines/:id
router.get('/:id', async (req: Request<{id : string}>, res: Response, next: NextFunction) => {
  try {
    const pipeline = await getPipelineById(req.params.id);
    res.status(200).json(pipeline);
  } catch(error) {
    next(error);
  }
});
// PATCH  /pipelines/:id
router.patch('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const body: UpdatePipelineBody = req.body;
    const pipeline = await updatePipeline(req.params.id, body);
    res.status(200).json(pipeline);
  } catch(error) {
    next(error);
  }
});
// DELETE /pipelines/:id
router.delete('/:id', async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const deleted = await deletePipeline(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }

    res.status(204).send();
  } catch(error) {
    next(error);
  }
});

export default router;