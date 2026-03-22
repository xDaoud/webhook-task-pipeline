import { Router, Request, Response } from 'express';
import { findPipelineById } from 'src/repositories/pipeline.repository';
import { createPipeline, getAllPipelines, updatePipeline } from 'src/services/pipeline.service';
import { CreatePipelineBody, UpdatePipelineBody } from 'src/types';

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
router.get('/:id', async (req: Request<{id : string}>, res: Response) => {
  const pipeline = await findPipelineById(req.params.id);
  if(!pipeline){
    res.status(404).json({ error: 'Pipeline not found'});
    return;
  }
  res.status(200).json(pipeline);
});
// PATCH  /pipelines/:id
router.patch('/:id', async(req: Request<{ id: string }>, res: Response) => {
  const body: UpdatePipelineBody = req.body;
  const pipeline = await updatePipeline(req.params.id, body);

  if(!pipeline){
    res.status(404).json({ error: 'Pipeline not found'});
    return;
  }

  res.status(200).json(pipeline);
});
// DELETE /pipelines/:id

export default router;