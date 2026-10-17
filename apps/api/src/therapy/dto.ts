import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class StartSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  modalityCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: 'Therapy hall bed UUID' })
  @IsOptional()
  @IsString()
  bedId?: string;

  @ApiPropertyOptional({ description: 'Machine UUID if modality requires one' })
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Therapist staff UUID' })
  @IsOptional()
  @IsString()
  therapistStaffId?: string;
}

export class CompleteSessionDto {
  @ApiProperty({ description: 'Actual duration in minutes' })
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcomeNote?: string;

  @ApiPropertyOptional({ description: 'VAS Pain score post-session (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScoreAfter?: number;
}

export class CreateBedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({ example: 'BED-A1' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Bed A-1' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreateMachineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiProperty({ example: 'IFT-01' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'BTL 4000 IFT Unit' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'IFT' })
  @IsOptional()
  @IsString()
  modalityCode?: string;
}

export class CreatePackageDto {
  @ApiProperty({ example: 'Back Pain Relief 10-Session Package' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiPropertyOptional({ example: 'কোমর ব্যথা নিরাময় ১০ সেশন প্যাকেজ' })
  @IsOptional()
  @IsString()
  nameBn?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  totalConsultations!: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  totalTherapySessions!: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  validityDays!: number;

  @ApiProperty({ example: 500000, description: 'Price in paisa (e.g. 5000 BDT = 500000 paisa)' })
  @IsInt()
  @Min(0)
  pricePaisa!: number;
}

export class PurchasePackageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  packageId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billId?: string;
}
