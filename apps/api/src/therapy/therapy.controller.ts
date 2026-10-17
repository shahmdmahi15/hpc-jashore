import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import {
  CompleteSessionDto,
  CreateBedDto,
  CreateMachineDto,
  CreatePackageDto,
  PurchasePackageDto,
  StartSessionDto,
} from './dto';
import { TherapyService } from './therapy.service';

@ApiTags('therapy')
@ApiBearerAuth()
@Controller('therapy')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class TherapyController {
  constructor(private readonly therapy: TherapyService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Post('sessions/start')
  @Roles('admin', 'head_doctor', 'therapist')
  startSession(
    @CurrentUser() user: RequestUser,
    @Body() dto: StartSessionDto,
    @Req() req: Request,
  ) {
    const therapistStaffId = user.staffId ?? user.sub;
    return this.therapy.startSession(
      { sub: user.sub, role: user.role },
      therapistStaffId,
      dto,
      this.meta(req),
    );
  }

  @Post('sessions/:id/complete')
  @Roles('admin', 'head_doctor', 'therapist')
  completeSession(
    @CurrentUser() user: RequestUser,
    @Param('id') sessionId: string,
    @Body() dto: CompleteSessionDto,
    @Req() req: Request,
  ) {
    return this.therapy.completeSession(
      { sub: user.sub, role: user.role },
      sessionId,
      dto,
      this.meta(req),
    );
  }

  @Get('sessions/today')
  getTodaySessions(@Query('therapistStaffId') therapistStaffId?: string) {
    return this.therapy.getTodaySessions(therapistStaffId);
  }

  @Get('occupancy')
  getOccupancy() {
    return this.therapy.getOccupancy();
  }

  @Get('beds')
  listBeds() {
    return this.therapy.listBeds();
  }

  @Post('beds')
  @Roles('admin')
  createBed(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBedDto,
    @Req() req: Request,
  ) {
    return this.therapy.createBed({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('machines')
  listMachines() {
    return this.therapy.listMachines();
  }

  @Post('machines')
  @Roles('admin')
  createMachine(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMachineDto,
    @Req() req: Request,
  ) {
    return this.therapy.createMachine({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get('packages')
  listPackages() {
    return this.therapy.listPackages();
  }

  @Post('packages')
  @Roles('admin')
  createPackage(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePackageDto,
    @Req() req: Request,
  ) {
    return this.therapy.createPackage({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('packages/purchase')
  @Roles('admin', 'head_doctor', 'cashier', 'reception')
  purchasePackage(
    @CurrentUser() user: RequestUser,
    @Body() dto: PurchasePackageDto,
    @Req() req: Request,
  ) {
    return this.therapy.purchasePackage({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }
}
