import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TauriUpdateQueryDto {
  @ApiPropertyOptional({
    description: 'Operating system target: windows, darwin, linux',
    example: 'windows',
  })
  @IsOptional()
  @IsString()
  target?: string;

  @ApiPropertyOptional({
    description: 'System architecture: x86_64, aarch64, armv7, i686',
    example: 'x86_64',
  })
  @IsOptional()
  @IsString()
  arch?: string;

  @ApiPropertyOptional({
    description: 'Current client version (Tauri {{current_version}} query param)',
    example: '0.1.0',
  })
  @IsOptional()
  @IsString()
  current_version?: string;

  @ApiPropertyOptional({
    description: 'Alternative current version parameter',
    example: '0.1.0',
  })
  @IsOptional()
  @IsString()
  version?: string;
}
