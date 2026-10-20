import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckUpdateDto {
  @ApiProperty({
    description: 'Target platform: android, android-tv, windows-x86_64, etc.',
    example: 'android',
  })
  @IsString()
  @IsNotEmpty()
  platform!: string;

  @ApiPropertyOptional({
    description: 'Current client version code (integer, e.g. from Android BuildConfig.VERSION_CODE)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  versionCode?: number;

  @ApiPropertyOptional({
    description: 'Current client version name (SemVer, e.g. "0.1.0")',
    example: '0.1.0',
  })
  @IsOptional()
  @IsString()
  versionName?: string;
}
