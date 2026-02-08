import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Pool } from 'pg';

@Injectable()
export class BetterAuthService {
  public auth: ReturnType<typeof betterAuth>;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL')!;
    const secret = this.configService.get<string>('BETTER_AUTH_SECRET')!;
    const baseURL = this.configService.get<string>(
      'BETTER_AUTH_URL',
      'http://localhost:3001',
    );

    const pool = new Pool({ connectionString: databaseUrl });

    const corsOrigin =
      this.configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000';

    this.auth = betterAuth({
      database: pool,
      secret,
      baseURL,
      trustedOrigins: [corsOrigin],
      emailAndPassword: {
        enabled: true,
      },
      plugins: [
        magicLink({
          sendMagicLink: async ({ email, url }) => {
            // In development, just log the magic link
            console.log(`\n🔗 Magic link for ${email}: ${url}\n`);
          },
        }),
      ],
      session: {
        expiresIn: 60 * 60 * 8, // 8 hours
        updateAge: 60 * 60, // 1 hour
        fields: {
          expiresAt: 'expires_at',
          ipAddress: 'ip_address',
          userAgent: 'user_agent',
          userId: 'user_id',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      },
      user: {
        fields: {
          emailVerified: 'email_verified',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
        additionalFields: {
          displayCurrency: {
            type: 'string',
            defaultValue: 'USD',
            required: false,
            fieldName: 'display_currency',
          },
        },
      },
      account: {
        fields: {
          accountId: 'account_id',
          providerId: 'provider_id',
          userId: 'user_id',
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          idToken: 'id_token',
          accessTokenExpiresAt: 'access_token_expires_at',
          refreshTokenExpiresAt: 'refresh_token_expires_at',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      },
      verification: {
        fields: {
          expiresAt: 'expires_at',
          createdAt: 'created_at',
          updatedAt: 'updated_at',
        },
      },
    });
  }
}
