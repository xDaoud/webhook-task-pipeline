import express from 'express';
import dotenv from 'dotenv';
import pipelinesRouter from './routes/pipelines.js';
import webhooksRouter from './routes/webhooks.js';
import jobsRouter from './routes/jobs.js';
import { connectWithRetry } from '../db/client.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/pipelines', pipelinesRouter);
app.use('/webhooks', webhooksRouter);
app.use('/jobs', jobsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

await connectWithRetry();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;