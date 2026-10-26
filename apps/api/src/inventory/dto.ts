import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateMedicineDto {
  @ApiProperty({ example: 'Tab. Ace Plus 500mg' })
  @IsString()
  @IsNotEmpty()
  brandName!: string;

  @ApiProperty({ example: 'Paracetamol + Caffeine' })
  @IsString()
  @IsNotEmpty()
  genericName!: string;

  @ApiPropertyOptional({ example: 'Square Pharmaceuticals PLC' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'tablet' })
  @IsOptional()
  @IsString()
  form?: string;

  @ApiPropertyOptional({ example: '500mg + 65mg' })
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minStockAlert?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;

  @ApiPropertyOptional({ example: 350, description: 'MRP per unit in paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  mrpPaisa?: number;
}

export class DispenseMedicineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  medicineId!: string;

  @ApiProperty({ example: 14 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prescriptionItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateExpenseDto {
  @ApiProperty({ enum: ['rent', 'salary', 'utilities', 'maintenance', 'supplies', 'misc'] })
  @IsIn(['rent', 'salary', 'utilities', 'maintenance', 'supplies', 'misc'])
  category!: 'rent' | 'salary' | 'utilities' | 'maintenance' | 'supplies' | 'misc';

  @ApiProperty({ example: 'Clinic Electricity Bill (October 2026)' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 1250000, description: 'Amount in paisa (e.g. 12,500 BDT)' })
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @ApiPropertyOptional({ example: 'VOUCH-26-0042' })
  @IsOptional()
  @IsString()
  voucherNumber?: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}
