import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { verifySignature } from './verifySignature.js';
import * as pipelineRepo from '../../repositories/pipeline.repository.js';
import { createHmac } from 'crypto';

vi.mock('../../repositories/pipeline.repository.js');

// mock req, res, next
const mockNext = vi.fn() as unknown as NextFunction;

const mockPipeline = {
  id: 'pipeline-123',
  name: 'Test Pipeline',
  sourceId: 'source-123',
  signingSecret: 'whsec_test_secret',
  actionType: 'filter',
  actionConfig: { keepFields: ['name'] },
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    params: { sourceId: 'source-123' },
    headers: {},
    body: { orderId: '123' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('verifySignature', () => {
  it('should call next without an argument if success', async () => {
    vi.mocked(pipelineRepo.findPipelineBySourceId).mockResolvedValue(mockPipeline);
    
    const body = { orderId: '123' };
    const signature = `sha256=${createHmac('sha256', mockPipeline.signingSecret)
      .update(JSON.stringify(body))
      .digest('hex')}`;
    const req = makeReq({
      headers: { 'x-webhook-signature': signature },
      body,
    });
    await verifySignature(
      req as Request<{ sourceId: string }>,
      {} as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(); //called with no args = success
  });

  it('should call next with 401 error if missing header', async () => {
    vi.mocked(pipelineRepo.findPipelineBySourceId).mockResolvedValue(mockPipeline);
    
    const body = { orderId: '123' };
    const req = makeReq({
      headers: { },
      body,
    });
    await verifySignature(
      req as Request<{ sourceId: string }>,
      {} as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Missing signature header'
      })
    );
  });

  it('should call next with 401 error if invalid signatures', async () => {
    vi.mocked(pipelineRepo.findPipelineBySourceId).mockResolvedValue(mockPipeline);
    
    const body = { orderId: '123' };
    const fakeBody = { orderId: '999' };
    const signature = `sha256=${createHmac('sha256', mockPipeline.signingSecret)
      .update(JSON.stringify(fakeBody))
      .digest('hex')}`;
    const req = makeReq({
      headers: { 'x-webhook-signature': signature },
      body,
    });
    await verifySignature(
      req as Request<{ sourceId: string }>,
      {} as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid signature',
        name: 'UnauthorizedError'
      })
    );
  });

  it('should call next with 404 error if pipeline not found', async () => {
    vi.mocked(pipelineRepo.findPipelineBySourceId).mockResolvedValue(null);

    const req = makeReq({ headers: { 'x-webhook-signature': 'sha256=placeholder' } });
    await verifySignature(
      req as Request<{ sourceId: string }>,
      {} as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Pipeline not found',
        name: 'NotFoundError'
      })
    );
  });
});