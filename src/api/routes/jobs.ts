import { Request, Response, Router } from 'express';
import { getJobById } from 'src/services/job.service';

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

export default router;