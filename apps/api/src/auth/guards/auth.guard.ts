import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { BetterAuthService } from '../services/better-auth.service';
import { fromNodeHeaders } from 'better-auth/node';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly betterAuthService: BetterAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    try {
      const session = await this.betterAuthService.auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });

      if (!session?.user) {
        throw new UnauthorizedException('Invalid session');
      }

      // Attach user to request for @CurrentUser() decorator
      request.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        displayCurrency:
          (session.user as Record<string, unknown>).displayCurrency || 'USD',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
