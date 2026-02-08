/**
 * TypeScript REPL runner.
 * Usage: pnpm --filter api repl:ts
 *
 * This allows you to interact with services directly:
 *   const service = await app.resolve(TransactionService);
 *   const txns = await service.findAll('user-id');
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as repl from 'repl';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  console.log('Budget App REPL ready.');
  console.log('Available: app.get(ServiceName) or app.resolve(ServiceName)');
  console.log('Example:');
  console.log(
    '  const em = app.get(require("@mikro-orm/postgresql").EntityManager);',
  );
  console.log('  await em.find(require("./transaction/entities/transaction.entity").Transaction, {});');
  console.log('');

  const r = repl.start({
    prompt: 'budget> ',
    useGlobal: true,
  });

  // Make app accessible in REPL
  (r.context as Record<string, unknown>).app = app;

  r.on('exit', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap();
