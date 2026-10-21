import { existsSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

// Ensure .env is loaded into process.env before NestJS bootstrap
const candidateEnvPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../.env'),
  '/var/www/hpc-jashore/apps/api/.env',
  '/var/www/hpc-jashore/.env',
];
for (const envPath of candidateEnvPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Enable trust proxy for accurate client IP resolution behind Cloudflare and Nginx
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', true);
  }

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: config.get<string[]>('corsOrigins'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('HPC Jashore API')
      .setDescription(
        'Realtime physiotherapy center management — core API (proto v1).',
      )
      .setVersion('1')
      .addBearerAuth()
      .build(),
  );
  // Served at /api/docs (setup path is appended after the global prefix).
  SwaggerModule.setup('docs', app, doc, { useGlobalPrefix: true });

  app.enableShutdownHooks();

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`hpc-api listening on :${port} (prefix /api)`);

  // Signal PM2 that the process is ready to receive traffic (zero-downtime handshake)
  if (typeof process.send === 'function') {
    process.send('ready');
  }
}
bootstrap();
