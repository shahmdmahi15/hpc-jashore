import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { AuditService } from './audit.service';

export class AuditQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  actor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAccessAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async query(@CurrentUser() user: RequestUser, @Query() q: AuditQuery) {
    return this.auditService.query(user, q);
  }
}
