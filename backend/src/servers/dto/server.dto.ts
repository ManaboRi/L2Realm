import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsDateString, IsUrl, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class CreateServerDto {
  @ApiProperty() @IsString() id: string;
  @ApiProperty() @IsString() name: string;
  @IsOptional() @IsString() abbr?: string;
  @ApiProperty() @IsString() url: string;
  @ApiProperty() @IsString() chronicle: string;
  @ApiProperty() @IsString() rates: string;
  @IsOptional() @IsInt() rateNum?: number;
  @IsOptional() @IsString() donate?: string;
  @IsOptional() @IsArray() type?: string[];
  @IsOptional() @IsBoolean() vip?: boolean;
  @IsOptional() @IsDateString() openedDate?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsString() banner?: string;
  @IsOptional() @IsString() discord?: string;
  @IsOptional() @IsString() telegram?: string;
  @IsOptional() @IsString() vk?: string;
  @IsOptional() @IsString() youtube?: string;
  @IsOptional() @IsString() site?: string;
  @IsOptional() @IsString() shortDesc?: string;
  @IsOptional() @IsString() fullDesc?: string;
}

export class UpdateServerDto extends PartialType(CreateServerDto) {}

export class FilterServersDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() chronicle?: string;
  @IsOptional() @IsString() rate?: string;       // low|mid|high|ultra
  @IsOptional() @IsString() donate?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() sort?: string;        // opened|name|rating
  @IsOptional() @IsString() openedWithin?: string; // 7d|30d
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() page?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() limit?: number;
}
