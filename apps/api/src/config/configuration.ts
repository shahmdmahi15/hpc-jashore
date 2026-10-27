// Central env config. All secrets come from environment — never commit real values.
// Dev falls back to obviously-insecure defaults; production refuses to boot with them.
import { plainToInstance } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvVars {
  @IsOptional()
  PORT?: string;

  @IsOptional()
  APP_VERSION?: string;

  @IsOptional()
  DATABASE_PATH?: string;

  @IsOptional()
  JWT_ACCESS_SECRET?: string;

  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsOptional()
  JWT_ACCESS_TTL_SECONDS?: string;

  @IsOptional()
  JWT_REFRESH_TTL_SECONDS?: string;

  @IsOptional()
  GRANT_SECRET?: string;

  @IsOptional()
  CORS_ORIGINS?: string;

  @IsOptional()
  NODE_ENV?: string;

  @IsOptional()
  SMTP_HOST?: string;

  @IsOptional()
  SMTP_PORT?: string;

  @IsOptional()
  SMTP_USER?: string;

  @IsOptional()
  SMTP_PASS?: string;

  @IsOptional()
  SMTP_FROM?: string;
}

function validated(): EnvVars {
  const env = plainToInstance(EnvVars, process.env, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(env, { skipMissingProperties: true });
  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${errors.toString()}`);
  }
  return env;
}

const DEV_SECRET = 'dev-only-insecure-secret-change-me';

export default () => {
  const env = validated();
  const isProd = env.NODE_ENV === 'production';

  const jwtAccessSecret = env.JWT_ACCESS_SECRET ?? DEV_SECRET;
  const jwtRefreshSecret = env.JWT_REFRESH_SECRET ?? DEV_SECRET;
  const grantSecret = env.GRANT_SECRET ?? DEV_SECRET;

  if (isProd && [jwtAccessSecret, jwtRefreshSecret, grantSecret].includes(DEV_SECRET)) {
    throw new Error(
      'Refusing to boot in production with default JWT secrets. Set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, GRANT_SECRET.',
    );
  }

  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 4000),
    appVersion: env.APP_VERSION ?? '0.1.0-dev',
    database: {
      path: env.DATABASE_PATH ?? './data/hpc.db',
    },
    jwt: {
      accessSecret: jwtAccessSecret,
      refreshSecret: jwtRefreshSecret,
      grantSecret,
      accessTtlSeconds: Number(env.JWT_ACCESS_TTL_SECONDS ?? 30 * 24 * 60 * 60), // 30 days (2,592,000 seconds)
      refreshTtlSeconds: Number(env.JWT_REFRESH_TTL_SECONDS ?? 30 * 24 * 60 * 60), // 30 days
      grantTtlSeconds: 60,
    },
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    smtp: {
      host: env.SMTP_HOST || process.env.SMTP_HOST || 'smtp.resend.com',
      port: Number(env.SMTP_PORT || process.env.SMTP_PORT || 587),
      user: env.SMTP_USER || process.env.SMTP_USER || 'resend',
      pass: env.SMTP_PASS || process.env.SMTP_PASS || '',
      from: env.SMTP_FROM || process.env.SMTP_FROM || '"HPC Jashore <no-reply@hpc.toufiquzzaman.com>"',
    },
    SMTP_HOST: env.SMTP_HOST || process.env.SMTP_HOST || 'smtp.resend.com',
    SMTP_PORT: env.SMTP_PORT || process.env.SMTP_PORT || '587',
    SMTP_USER: env.SMTP_USER || process.env.SMTP_USER || 'resend',
    SMTP_PASS: env.SMTP_PASS || process.env.SMTP_PASS || '',
    SMTP_FROM: env.SMTP_FROM || process.env.SMTP_FROM || '"HPC Jashore <no-reply@hpc.toufiquzzaman.com>"',
  };
};

// Keep class-validator import referenced for future strict fields.
export const EnvStringCheck = IsString;
export const EnvRequiredCheck = IsNotEmpty;
