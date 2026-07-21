import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
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

/**
 * FE sends grouped rupiah strings ("8.450.000") or numbers; strip everything but
 * digits so the value is a clean numeric string before validation (BACKEND-GUIDE §5.2).
 */
const digitsOnly = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned.length ? cleaned : undefined;
  }
  return value;
};

/** Trim string inputs so blank/whitespace-only fitment fields fail validation
 *  (or get dropped in the service) instead of being stored as-is. */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

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

export class VehicleFitmentDto {
  @ApiProperty({ example: 'Wuling' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  brand: string;

  @ApiProperty({ example: 'Air EV' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  model: string;

  @ApiPropertyOptional({
    example: '2022–2024',
    description: 'Free-text year/range; omit or send null when unknown',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  years?: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  name: string;

  @ApiProperty({ example: 'YD-CHG-7K2', description: 'Unique stock code' })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  sku: string;

  @ApiPropertyOptional({
    description: 'URL slug — auto-generated from name when empty',
  })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  category_id: string;

  @ApiProperty({ example: '8450000', description: 'Retail price as a string' })
  @Transform(digitsOnly)
  @IsNumberString()
  price: string;

  @ApiPropertyOptional({
    example: '7900000',
    description: 'Wholesale price as a string (admin only)',
  })
  @IsOptional()
  @Transform(digitsOnly)
  @IsNumberString()
  price_wholesale?: string;

  @ApiPropertyOptional({ default: 0, description: 'On-hand units' })
  @IsOptional()
  @Transform(({ value }) => {
    const digits = String(value ?? '').replace(/[^\d]/g, '');
    return digits.length ? Number(digits) : undefined;
  })
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ enum: ProductBadge })
  @IsOptional()
  @IsEnum(ProductBadge)
  badge?: ProductBadge;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiPropertyOptional({
    type: [VehicleFitmentDto],
    description:
      'Structured vehicle fitment. Order preserved. Absent on PATCH keeps ' +
      'existing data; [] clears it. Create defaults to [].',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleFitmentDto)
  compatibility?: VehicleFitmentDto[];

  @ApiProperty({ type: [ProductSpecDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs: ProductSpecDto[];

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Media UUIDs from two-step upload (first = thumbnail)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  image_uuids?: string[];

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
