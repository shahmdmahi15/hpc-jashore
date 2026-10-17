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
  GRANT_SECRET?: string;

  @IsOptional()
  CORS_ORIGINS?: string;

  @IsOptional()
  NODE_ENV?: string;
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
      accessTtlSeconds: 15 * 60,
      refreshTtlSeconds: 7 * 24 * 60 * 60,
      grantTtlSeconds: 60,
    },
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
};

// Keep class-validator import referenced for future strict fields.
export const EnvStringCheck = IsString;
export const EnvRequiredCheck = IsNotEmpty;
