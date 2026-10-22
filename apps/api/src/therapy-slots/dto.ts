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
import { DAYS_OF_WEEK, SLOT_HOURS, type DayOfWeek, type SlotHour } from '../db/schema';

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
