import { Request as ExpressRequest } from 'express';
import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User & { linkedUserIds?: string[] };
    }
  }
}

export {};