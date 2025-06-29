import { Request as ExpressRequest } from 'express';
import { User } from '@prisma/client';

// Define a simplified user type for JWT payload
export interface JWTUser {
  userId: string;
  email: string;
  linkedUserIds?: string[];
}

// Define enterprise user with additional fields
export interface EnterpriseUser extends JWTUser {
  primaryUserId: string;
  provider: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTUser | EnterpriseUser;
    }
  }
}

export {};