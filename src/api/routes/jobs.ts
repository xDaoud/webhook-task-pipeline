import { Request, Response, Router, NextFunction } from "express";
import { getJobById, getJobDeliveries } from "../../services/job.service.js";

const router = Router();

// GET /jobs/:id — fetch a job's current status and result
router.get(
  "/:id",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const job = await getJobById(req.params.id);
      res.status(200).json(job);
    } catch (error) {
      next(error);
    }
  },
);

// GET /jobs/:id/deliveries — fetch the delivery audit log for a job
router.get(
  "/:id/deliveries",
  async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      const jobDeliveries = await getJobDeliveries(req.params.id);
      res.status(200).json(jobDeliveries);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
