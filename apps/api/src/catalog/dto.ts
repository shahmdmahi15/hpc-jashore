import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateModalityDto {
  @IsString()
  @MaxLength(16)
  code!: string;

  @IsString()
  @MaxLength(160)
  nameEn!: string;

  @IsString()
  @MaxLength(160)
  nameBn!: string;

  @IsInt()
  @Min(1)
  defaultDurationMin!: number;

  @IsInt()
  @Min(0)
  defaultPricePaisa!: number;
}

export class UpdateModalityDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameBn?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  defaultDurationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultPricePaisa?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
