import express from 'express';
import dotenv from 'dotenv';
import pipelinesRouter from './routes/pipelines';
import webhooksRouter from './routes/webhooks';
import jobsRouter from './routes/jobs';

dotenv.config();

const app = express();

app.use(express.json());

app.use('/pipelines', pipelinesRouter);
app.use('/webhooks', webhooksRouter);
app.use('/jobs', jobsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;