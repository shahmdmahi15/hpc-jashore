import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpsertSettingDto {
  @IsString()
  valueJson!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  note?: string;
}
