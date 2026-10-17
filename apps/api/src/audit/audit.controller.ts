import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Inject } from '@nestjs/common';
import { and, count, desc, eq, gte, lte } from 'drizzle-orm';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { DB, type Db } from '../db/db.module';
import { auditLogs } from '../db/schema';
import { paged } from '../common/pagination.dto';

class AuditQuery {
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
}

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAccessAuthGuard)
export class AuditController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get()
  async query(@CurrentUser() user: RequestUser, @Query() q: AuditQuery) {
    // Doctors see only rows where they are the actor; admin sees everything.
    const conditions = [];
    if (user.role !== 'admin') {
      conditions.push(eq(auditLogs.actorUserId, user.sub));
    } else if (q.actor) {
      conditions.push(eq(auditLogs.actorUserId, q.actor));
    }
    if (q.entity) conditions.push(eq(auditLogs.entity, q.entity));
    if (q.action) conditions.push(eq(auditLogs.action, q.action));
    if (q.from) conditions.push(gte(auditLogs.occurredAt, q.from));
    if (q.to) conditions.push(lte(auditLogs.occurredAt, q.to));

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const offset = (q.page - 1) * q.limit;
    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.id))
      .limit(q.limit)
      .offset(offset);
    const countRes = await this.db.select({ total: count() }).from(auditLogs).where(where);
    const total = countRes[0]?.total ?? 0;
    return paged(rows, total, q.page, q.limit);
  }
}
