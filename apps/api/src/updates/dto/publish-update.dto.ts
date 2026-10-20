import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublishUpdateDto {
  @ApiProperty({
    description: 'Release version (SemVer, e.g. "0.2.0" or "v0.2.0")',
    example: '0.2.0',
  })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({
    description: 'Platform key: windows-x86_64, android, android-tv, darwin-aarch64, etc.',
    example: 'windows-x86_64',
  })
  @IsString()
  @IsNotEmpty()
  platform!: string;

  @ApiProperty({
    description: 'Downloadable binary URL (CDN/GitHub release asset) or local server file path',
    example: 'https://github.com/hpc-jashore/hpc-jashore/releases/download/v0.2.0/hpc-jashore_0.2.0_x64-setup.exe',
  })
  @IsString()
  @IsNotEmpty()
  url!: string;

  @ApiPropertyOptional({
    description: 'Tauri v2 minisign signature string (.sig file content)',
    example: 'dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6...',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({
    description: 'Release notes or changelog (Markdown or plain text)',
    example: 'Bug fixes and performance improvements.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Publication date (RFC 3339 / ISO 8601 string). Defaults to current UTC time.',
    example: '2026-10-20T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  pubDate?: string;

  @ApiPropertyOptional({
    description: 'Android/TV integer version code (e.g. 2)',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  versionCode?: number;

  @ApiPropertyOptional({
    description: 'Flag indicating if update is mandatory for clients',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum required version code below which update is strictly enforced',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  minVersionCode?: number;
}
