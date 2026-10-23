import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BillItemInputDto {
  @ApiProperty({ enum: ['consultation', 'therapy', 'medicine', 'package', 'misc'] })
  @IsIn(['consultation', 'therapy', 'medicine', 'package', 'misc'])
  itemType!: 'consultation' | 'therapy' | 'medicine' | 'package' | 'misc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiProperty({ example: 'Doctor Consultation' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 50000, description: 'Price in paisa' })
  @IsInt()
  @Min(0)
  unitPricePaisa!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 0, description: 'Discount in paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPaisa?: number;
}

export class CreateBillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiProperty({ type: [BillItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemInputDto)
  items!: BillItemInputDto[];

  @ApiPropertyOptional({ example: 0, description: 'Overall bill discount in paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  overallDiscountPaisa?: number;

  @ApiPropertyOptional({ example: 0, description: 'Discount in paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPaisa?: number;

  @ApiPropertyOptional({ example: 0, description: 'Initial paid amount in paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  paidPaisa?: number;

  @ApiPropertyOptional({ enum: ['cash', 'bkash', 'nagad', 'rocket', 'card', 'bank'] })
  @IsOptional()
  @IsString()
  paymentMethod?: 'cash' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'bank';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ example: 50000, description: 'Amount paid in paisa' })
  @IsInt()
  @Min(1)
  amountPaisa!: number;

  @ApiProperty({ enum: ['cash', 'bkash', 'nagad', 'rocket', 'card', 'bank'] })
  @IsIn(['cash', 'bkash', 'nagad', 'rocket', 'card', 'bank'])
  method!: 'cash' | 'bkash' | 'nagad' | 'rocket' | 'card' | 'bank';

  @ApiPropertyOptional({ description: 'Transaction ID for digital payments' })
  @IsOptional()
  @IsString()
  txnId?: string;
}

export class VoidBillDto {
  @ApiProperty({ example: 'Accidental double entry or patient cancelled' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class OpenDrawerDto {
  @ApiProperty({ description: 'Terminal desk UUID' })
  @IsString()
  @IsNotEmpty()
  deskId!: string;

  @ApiProperty({ example: 500000, description: 'Opening float cash in paisa (e.g. 5000 BDT)' })
  @IsInt()
  @Min(0)
  openingCashPaisa!: number;
}

export class CloseDrawerDto {
  @ApiProperty({ example: 2540000, description: 'Actual cash in drawer counted in paisa' })
  @IsInt()
  @Min(0)
  closingCashActualPaisa!: number;

  @ApiPropertyOptional({ description: 'Reason if drawer does not match system total' })
  @IsOptional()
  @IsString()
  varianceReason?: string;
}
