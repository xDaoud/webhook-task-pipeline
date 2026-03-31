import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { findPipelineBySourceId } from "../../repositories/pipeline.repository.js";
import { NotFoundError, UnauthorizedError } from "./errors.js";

/**
 * Express middleware that authenticates incoming webhooks via HMAC-SHA256.
 *
 * The sender must include an `X-Webhook-Signature` header of the form:
 *   sha256=<hex(hmac-sha256(signingSecret, JSON.stringify(body)))>
 *
 * `timingSafeEqual` is used for the comparison to prevent timing attacks
 * that could reveal the expected signature via response-time differences.
 */
export async function verifySignature(
  req: Request<{ sourceId: string }>,
  _res: Response,
  next: NextFunction,
) {
  try {
    const { sourceId } = req.params;
    const signature = req.headers["x-webhook-signature"] as string;

    if (!signature) {
      throw new UnauthorizedError("Missing signature header");
    }

    const pipeline = await findPipelineBySourceId(sourceId);

    if (!pipeline) {
      throw new NotFoundError("Pipeline not found");
    }

    const body = JSON.stringify(req.body);
    const expected = `sha256=${createHmac("sha256", pipeline.signingSecret)
      .update(body)
      .digest("hex")}`;

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    // Buffers must be the same length before timingSafeEqual or it throws
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedError("Invalid signature");
    }
    next();
  } catch (error) {
    next(error);
  }
}
