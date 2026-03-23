import { connectWithRetry, db } from "../db/client.js";
import { processNextJob } from "./processor.js";

const POLL_INTERNAL_MS = 5000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));  
}

await connectWithRetry();
async function startWorker() {
  console.log('Worker starting...');

  while(true) {
    try {
      const didWork = await processNextJob();

      if(!didWork){
        await sleep(POLL_INTERNAL_MS);
      }
    } catch (error) {
    console.error('Worker error:', error); // log the full error object, not just message
    await sleep(POLL_INTERNAL_MS);
    }
  }
}

async function shutdown() {
  console.log('Worker shutting down...');
  await db.$client.end();
  process.exit(1);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startWorker().catch((error) => {
  console.log('Worker failed to start: ', error);
  process.exit(1);
});