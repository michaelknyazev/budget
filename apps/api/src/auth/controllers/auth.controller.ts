import { Controller, All, Req, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { BetterAuthService } from '../services/better-auth.service';
import { Public } from '../decorators/public.decorator';

/**
 * Forwards all /api/auth/* requests to better-auth's handler.
 * This lets better-auth handle its own routes (sign-in, sign-up, session, etc.)
 */
@ApiExcludeController()
@Controller('api/auth')
export class AuthController {
  private handler: ReturnType<typeof toNodeHandler>;

  constructor(private readonly betterAuthService: BetterAuthService) {
    this.handler = toNodeHandler(this.betterAuthService.auth);
  }

  @Public()
  @All()
  async handleAuthBase(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }

  @Public()
  @All('*')
  async handleAuthWildcard(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}
