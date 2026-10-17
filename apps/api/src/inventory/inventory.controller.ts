import {
  Body,
  Controller,
  Get,
  Post,
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
  CreateExpenseDto,
  CreateMedicineDto,
  DispenseMedicineDto,
  PurchaseBatchDto,
} from './dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get('medicines')
  listMedicines() {
    return this.inventory.listMedicines();
  }

  @Post('medicines')
  @Roles('admin')
  createMedicine(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateMedicineDto,
    @Req() req: Request,
  ) {
    return this.inventory.createMedicine({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Post('batches/purchase')
  @Roles('admin', 'cashier')
  purchaseBatch(
    @CurrentUser() user: RequestUser,
    @Body() dto: PurchaseBatchDto,
    @Req() req: Request,
  ) {
    const staffId = user.staffId ?? user.sub;
    return this.inventory.purchaseBatch({ sub: user.sub, role: user.role }, staffId, dto, this.meta(req));
  }

  @Post('medicines/dispense')
  @Roles('admin', 'cashier')
  dispense(
    @CurrentUser() user: RequestUser,
    @Body() dto: DispenseMedicineDto,
    @Req() req: Request,
  ) {
    const staffId = user.staffId ?? user.sub;
    return this.inventory.dispenseFIFO({ sub: user.sub, role: user.role }, staffId, dto, this.meta(req));
  }

  @Get('expenses')
  @Roles('admin', 'head_doctor')
  listExpenses() {
    return this.inventory.listExpenses();
  }

  @Post('expenses')
  @Roles('admin', 'head_doctor', 'cashier')
  createExpense(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    const staffId = user.staffId ?? user.sub;
    return this.inventory.createExpense({ sub: user.sub, role: user.role }, staffId, dto, this.meta(req));
  }
}
