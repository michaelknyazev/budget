import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { BetterAuthService } from '../services/better-auth.service';

@Injectable()
export class BetterAuthMiddleware implements NestMiddleware {
  private handler: ReturnType<typeof toNodeHandler>;

  constructor(private readonly betterAuthService: BetterAuthService) {
    this.handler = toNodeHandler(this.betterAuthService.auth);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // better-auth expects the full URL path
    req.url = req.originalUrl || req.url;
    this.handler(req, res).catch(next);
  }
}
