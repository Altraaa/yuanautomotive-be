import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateFaqDto {
  @ApiProperty({ example: 'Apakah produk bergaransi?' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  question: string;

  @ApiProperty({ example: 'Ya, semua produk bergaransi resmi 1 tahun.' })
  @IsString()
  @MinLength(3)
  answer: string;

  @ApiPropertyOptional({ example: 'Garansi', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @ApiPropertyOptional({ default: 0, description: 'Urutan tampil (kecil = atas)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
