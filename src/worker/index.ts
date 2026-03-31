import { connectWithRetry, db } from "../db/client.js";
import { processNextJob } from "./processor.js";
import { processFailedDeliveries } from "./retry.js";

// How long to wait before polling again when there are no pending jobs or retries.
// Short enough to feel responsive; long enough not to hammer the database.
const POLL_INTERVAL_MS = 5000;
const RETRY_INTERVAL_MS = 30000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await connectWithRetry();

/**
 * Main job processing loop (Phase 2).
 * Runs as fast as possible while there is work to do.
 * Sleeps POLL_INTERVAL_MS when the queue is empty to avoid a busy-wait.
 */
async function startWorker() {
  console.log("Worker starting...");

  while (true) {
    try {
      const didWork = await processNextJob();

      if (!didWork) {
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error("Worker error:", error); // log the full error object, not just message
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

/**
 * Retry poller loop — runs independently of the main worker.
 * Checks for failed deliveries whose backoff window has passed every RETRY_INTERVAL_MS.
 * Always sleeps between iterations since retries are time-gated by design.
 */
async function startRetryPoller() {
  while (true) {
    try {
      await processFailedDeliveries();
    } catch (error) {
      console.error("Retry poller error:", error);
    }
    await sleep(RETRY_INTERVAL_MS);
  }
}

/** Graceful shutdown: drain the DB connection pool before exiting. */
async function shutdown() {
  console.log("Worker shutting down...");
  await db.$client.end();
  process.exit(1);
}

// Handle container stop (SIGTERM from Docker/k8s) and Ctrl-C (SIGINT)
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startWorker().catch((error) => {
  console.log("Worker failed to start: ", error);
  process.exit(1);
});

startRetryPoller().catch((error) => {
  console.log("Worker failed to start: ", error);
  process.exit(1);
});
