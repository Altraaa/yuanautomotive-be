import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductBadge } from '../../../common/enums';

export class ProductSpecDto {
  @ApiProperty({ example: 'Daya Output' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label: string;

  @ApiProperty({ example: '7 kW (32A)' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  value: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order = 0;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  name: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  category_id: string;

  @ApiProperty({ example: '8450000', description: 'Price as a string' })
  @IsNumberString()
  price: string;

  @ApiPropertyOptional({ enum: ProductBadge })
  @IsOptional()
  @IsEnum(ProductBadge)
  badge?: ProductBadge;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({ type: [String], example: ['Wuling', 'Hyundai'] })
  @IsArray()
  @IsString({ each: true })
  compatibility: string[];

  @ApiProperty({ type: [ProductSpecDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs: ProductSpecDto[];

  @ApiProperty({ type: [String], format: 'uuid', description: 'Media UUIDs (first = thumbnail)' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  image_uuids: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
