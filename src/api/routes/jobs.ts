import { Request, Response, Router } from 'express';
import { getJobById, getJobDeliveries } from '../../services/job.service.js';

const router = Router();

// GET /jobs/:id
router.get('/:id', async (req: Request<{id: string}>, res: Response) => {
  const job = await getJobById(req.params.id);

  if(!job){
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.status(200).json(job);
});
// GET /jobs/:id/deliveries
router.get('/:id/deliveries', async (req: Request<{id: string}>, res: Response) => {
  try{
    const jobDeliveries = await getJobDeliveries(req.params.id);
    res.status(200).json(jobDeliveries);
  } catch (error) {
    if(error instanceof Error && error.message === 'JOB_NOT_FOUND'){
      res.status(404).json(({ error: 'Job not found' }));
      return;
    }
    res.status(500).json({ error: 'Inernal server error' });
  }
});

export default router;