import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BetterAuthService } from './services/better-auth.service';
import { AuthController } from './controllers/auth.controller';
import { AuthGuard } from './guards/auth.guard';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    BetterAuthService,
    // Global auth guard — all routes protected by default
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [BetterAuthService],
})
export class AuthModule {}
