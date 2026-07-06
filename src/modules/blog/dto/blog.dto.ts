import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBlogDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Tips', description: 'Tips | Rilis | Panduan | Berita' })
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  excerpt: string;

  @ApiProperty({ description: 'Tiptap HTML (sanitized server-side)' })
  @IsString()
  @MinLength(1)
  content_html: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  cover_uuid?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  author: string;

  @ApiProperty({ minimum: 1, maximum: 120 })
  @IsInt()
  @Min(1)
  @Max(120)
  reading_minutes: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiProperty({ example: '2026-06-28T00:00:00.000Z' })
  @IsDateString()
  published_at: string;
}

export class UpdateBlogDto extends PartialType(CreateBlogDto) {}
