import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DAYS_OF_WEEK,
  SLOT_HOURS,
  THERAPY_BOOKING_STATUSES,
  type DayOfWeek,
  type SlotHour,
  type TherapyBookingStatus,
} from '../db/schema';

export class TherapySlotQueryDto {
  @ApiPropertyOptional({ enum: DAYS_OF_WEEK, description: 'Day of week filter' })
  @IsOptional()
  @IsIn(DAYS_OF_WEEK)
  day?: DayOfWeek;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  isActive?: string | number | boolean;
}

export class UpdateTherapySlotDto {
  @ApiPropertyOptional({ description: 'Slot Male Regular Capacity', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotMaleRegularCapacity?: number;

  @ApiPropertyOptional({ description: 'Slot Female Regular Capacity', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotFemaleRegularCapacity?: number;

  @ApiPropertyOptional({ description: 'Slot Male Extra Capacity', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotMaleExtraCapacity?: number;

  @ApiPropertyOptional({ description: 'Slot Female Extra Capacity', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotFemaleExtraCapacity?: number;

  @ApiPropertyOptional({ description: 'Active status (1=active, 0=inactive)', example: 1 })
  @IsOptional()
  @IsInt()
  isActive?: number;

  @ApiPropertyOptional({ description: 'Operational notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUpdateItemDto {
  @ApiProperty({ description: 'Slot configuration ID' })
  @IsString()
  id!: string;

  @ApiPropertyOptional({ description: 'Slot Male Regular Capacity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotMaleRegularCapacity?: number;

  @ApiPropertyOptional({ description: 'Slot Female Regular Capacity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotFemaleRegularCapacity?: number;

  @ApiPropertyOptional({ description: 'Slot Male Extra Capacity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotMaleExtraCapacity?: number;

  @ApiPropertyOptional({ description: 'Slot Female Extra Capacity' })
  @IsOptional()
  @IsInt()
  @Min(0)
  slotFemaleExtraCapacity?: number;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsInt()
  isActive?: number;

  @ApiPropertyOptional({ description: 'Operational notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkUpdateTherapySlotsDto {
  @ApiProperty({ type: [BulkUpdateItemDto], description: 'Array of slots to update' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  slots!: BulkUpdateItemDto[];
}

export class CopyDayScheduleDto {
  @ApiProperty({ enum: DAYS_OF_WEEK, description: 'Source day' })
  @IsIn(DAYS_OF_WEEK)
  fromDay!: DayOfWeek;

  @ApiProperty({ enum: DAYS_OF_WEEK, isArray: true, description: 'Target days' })
  @IsArray()
  @IsIn(DAYS_OF_WEEK, { each: true })
  toDays!: DayOfWeek[];
}

export class TherapyAvailabilityQueryDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format', example: '2026-10-23' })
  @IsString()
  date!: string;
}

export class CreateTherapyBookingDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsString()
  patientId!: string;

  @ApiProperty({ description: 'Booking date in YYYY-MM-DD format', example: '2026-10-23' })
  @IsString()
  bookingDate!: string;

  @ApiProperty({ enum: SLOT_HOURS, description: 'Slot hour' })
  @IsIn(SLOT_HOURS)
  slotHour!: SlotHour;

  @ApiPropertyOptional({ description: 'Told time to arrive / attend', example: '09:15 AM' })
  @IsOptional()
  @IsString()
  toldTime?: string;

  @ApiPropertyOptional({ description: 'Booking clinical / operational notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTherapyBookingDto {
  @ApiPropertyOptional({ enum: THERAPY_BOOKING_STATUSES, description: 'Booking status' })
  @IsOptional()
  @IsIn(THERAPY_BOOKING_STATUSES)
  status?: TherapyBookingStatus;

  @ApiPropertyOptional({ description: 'Told time to arrive / attend' })
  @IsOptional()
  @IsString()
  toldTime?: string;

  @ApiPropertyOptional({ description: 'Booking notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: SLOT_HOURS, description: 'Updated slot hour' })
  @IsOptional()
  @IsIn(SLOT_HOURS)
  slotHour?: SlotHour;

  @ApiPropertyOptional({ description: 'Updated booking date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  bookingDate?: string;
}

export class TherapyBookingQueryDto {
  @ApiPropertyOptional({ description: 'Filter by booking date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Filter by patient ID' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Filter by booking status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by slot hour' })
  @IsOptional()
  @IsString()
  slotHour?: string;

  @ApiPropertyOptional({ description: 'Search patient name, MRN, phone, booking number' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page limit', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
