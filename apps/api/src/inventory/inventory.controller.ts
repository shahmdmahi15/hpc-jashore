import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import {
  CreateExpenseDto,
  CreateMedicineDto,
  UpdateMedicineDto,
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
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get('medicines')
  listMedicines() {
    return this.inventory.listMedicines();
  }

  @Get('medicines/:id')
  getMedicine(@Param('id') id: string) {
    return this.inventory.getMedicine(id);
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

  @Put('medicines/:id')
  @Roles('admin')
  updateMedicine(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicineDto,
    @Req() req: Request,
  ) {
    return this.inventory.updateMedicine({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Delete('medicines/:id')
  @Roles('admin')
  deleteMedicine(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.inventory.deleteMedicine({ sub: user.sub, role: user.role }, id, this.meta(req));
  }

  @Get('expenses')
  @Roles('admin')
  listExpenses() {
    return this.inventory.listExpenses();
  }

  @Post('expenses')
  @Roles('admin', 'cashier')
  createExpense(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateExpenseDto,
    @Req() req: Request,
  ) {
    const staffId = user.staffId ?? user.sub;
    return this.inventory.createExpense({ sub: user.sub, role: user.role }, staffId, dto, this.meta(req));
  }
}
