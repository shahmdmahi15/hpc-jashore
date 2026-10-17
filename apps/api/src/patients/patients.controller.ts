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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CreatePatientDto, UpdatePatientDto } from './dto';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  private meta(req: Request) {
    return {
      ip: (req.ip ?? null) as string | null,
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get()
  @ApiQuery({ name: 'q', required: false, description: 'Search MRN, name, or phone' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : 20;
    return this.patients.search(q, pageNum, limitNum);
  }

  @Post()
  @Roles('admin', 'head_doctor', 'doctor', 'reception')
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePatientDto,
    @Req() req: Request,
  ) {
    return this.patients.create({ sub: user.sub, role: user.role }, dto, this.meta(req));
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.patients.get(id);
  }

  @Patch(':id')
  @Roles('admin', 'head_doctor', 'doctor', 'reception')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: Request,
  ) {
    return this.patients.update({ sub: user.sub, role: user.role }, id, dto, this.meta(req));
  }

  @Delete(':id')
  @Roles('admin')
  remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.patients.remove({ sub: user.sub, role: user.role }, id, this.meta(req));
  }
}
