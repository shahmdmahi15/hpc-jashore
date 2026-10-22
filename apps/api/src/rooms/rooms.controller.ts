import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CreateRoomDto, RoomQueryDto, UpdateRoomDto, UpdateRoomStatusDto } from './dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@Controller('rooms')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List and search clinical rooms with filters and KPI stats' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  list(@Query() query: RoomQueryDto) {
    return this.roomsService.search(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details by ID' })
  @Roles('admin', 'doctor', 'handler', 'cashier', 'receptionist')
  get(@Param('id') id: string) {
    return this.roomsService.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new room in the clinic' })
  @Roles('admin')
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRoomDto, @Req() req: Request) {
    return this.roomsService.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update room configuration and details' })
  @Roles('admin')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @Req() req: Request,
  ) {
    return this.roomsService.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Quick status change for room (available, occupied, maintenance, not_allowed)' })
  @Roles('admin', 'doctor', 'receptionist', 'handler')
  updateStatus(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoomStatusDto,
    @Req() req: Request,
  ) {
    return this.roomsService.updateStatus(
      { sub: user.sub, role: user.role },
      id,
      dto.status,
      this.meta(req),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete room' })
  @Roles('admin')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.roomsService.delete({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
