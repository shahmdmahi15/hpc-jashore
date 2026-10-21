import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { BillingService } from './billing.service';
import {
  CloseDrawerDto,
  CreateBillDto,
  OpenDrawerDto,
  RecordPaymentDto,
  VoidBillDto,
} from './dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Post('bills')
  @Roles('admin', 'cashier')
  createBill(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBillDto,
    @Req() req: Request,
  ) {
    const cashierStaffId = user.staffId ?? user.sub;
    return this.billing.createBill(
      { sub: user.sub, role: user.role },
      cashierStaffId,
      dto,
      this.meta(req),
    );
  }

  @Post('bills/:id/pay')
  @Roles('admin', 'cashier')
  recordPayment(
    @CurrentUser() user: RequestUser,
    @Param('id') billId: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: Request,
  ) {
    const cashierStaffId = user.staffId ?? user.sub;
    return this.billing.recordPayment(
      { sub: user.sub, role: user.role },
      cashierStaffId,
      billId,
      dto,
      this.meta(req),
    );
  }

  @Post('bills/:id/void')
  @Roles('admin')
  voidBill(
    @CurrentUser() user: RequestUser,
    @Param('id') billId: string,
    @Body() dto: VoidBillDto,
    @Req() req: Request,
  ) {
    return this.billing.voidBill(
      { sub: user.sub, role: user.role },
      billId,
      dto,
      this.meta(req),
    );
  }

  @Get('bills')
  @Roles('admin', 'doctor', 'cashier')
  getAllBills() {
    return this.billing.getAllBills();
  }

  @Get('dues')
  @Roles('admin', 'doctor', 'cashier')
  getAllDues() {
    return this.billing.getAllDues();
  }

  @Get('bills/:id')
  getBill(@Param('id') id: string) {
    return this.billing.getBill(id);
  }

  @Get('bills/patient/:patientId')
  getPatientBilling(@Param('patientId') patientId: string) {
    return this.billing.getPatientBillingHistory(patientId);
  }

  // --- Cash Drawers -----------------------------------------------------------

  @Post('drawers/open')
  @Roles('admin', 'cashier')
  openDrawer(
    @CurrentUser() user: RequestUser,
    @Body() dto: OpenDrawerDto,
    @Req() req: Request,
  ) {
    const cashierStaffId = user.staffId ?? user.sub;
    return this.billing.openDrawer(
      { sub: user.sub, role: user.role },
      cashierStaffId,
      dto,
      this.meta(req),
    );
  }

  @Get('drawers/current')
  @Roles('admin', 'cashier')
  getCurrentDrawer(@CurrentUser() user: RequestUser) {
    const cashierStaffId = user.staffId ?? user.sub;
    return this.billing.getCurrentDrawer(cashierStaffId);
  }

  @Get('drawers/status/:cashierStaffId')
  @Roles('admin', 'cashier')
  getDrawerStatusByStaffId(@Param('cashierStaffId') cashierStaffId: string) {
    return this.billing.getCurrentDrawer(cashierStaffId);
  }

  @Post('drawers/close')
  @Roles('admin', 'cashier')
  closeDrawer(
    @CurrentUser() user: RequestUser,
    @Body() dto: CloseDrawerDto,
    @Req() req: Request,
  ) {
    const cashierStaffId = user.staffId ?? user.sub;
    return this.billing.closeDrawer(
      { sub: user.sub, role: user.role },
      cashierStaffId,
      dto,
      this.meta(req),
    );
  }

  @Post('drawers/:id/close')
  @Roles('admin', 'cashier')
  closeDrawerById(
    @CurrentUser() user: RequestUser,
    @Param('id') _id: string,
    @Body() dto: CloseDrawerDto,
    @Req() req: Request,
  ) {
    const cashierStaffId = user.staffId ?? user.sub;
    return this.billing.closeDrawer(
      { sub: user.sub, role: user.role },
      cashierStaffId,
      dto,
      this.meta(req),
    );
  }

  @Get('drawers/reports/daily')
  @Roles('admin')
  getDailyDrawerReport() {
    return this.billing.getDailyDrawerReport();
  }
}
