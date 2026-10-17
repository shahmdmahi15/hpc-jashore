import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';

// In-memory presence: desk heartbeats every ~20 s → "who is online where".
// Process-local is fine for the single-writer v1 (one PM2 instance).
class HeartbeatDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  deskCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;
}

interface PresenceEntry {
  userId: string;
  role: string;
  deskCode: string | null;
  status: string;
  lastSeen: string;
}

@ApiTags('presence')
@ApiBearerAuth()
@Controller('presence')
@UseGuards(JwtAccessAuthGuard)
export class PresenceController {
  private readonly online = new Map<string, PresenceEntry>();

  @Post('heartbeat')
  beat(@CurrentUser() user: RequestUser, @Body() dto: HeartbeatDto) {
    const entry: PresenceEntry = {
      userId: user.sub,
      role: user.role,
      deskCode: dto.deskCode ?? null,
      status: dto.status ?? 'online',
      lastSeen: new Date().toISOString(),
    };
    this.online.set(user.sub, entry);
    return { ok: true };
  }

  @Get()
  all() {
    const cutoff = Date.now() - 60_000;
    for (const [key, entry] of this.online) {
      if (new Date(entry.lastSeen).getTime() < cutoff) this.online.delete(key);
    }
    return { online: [...this.online.values()] };
  }
}
