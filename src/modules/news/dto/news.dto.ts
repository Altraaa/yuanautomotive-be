import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateNewsDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Reels', description: 'Reels | Poster' })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2200)
  caption: string;

  @ApiProperty({ example: 'https://www.instagram.com/reel/xxxx/' })
  @IsUrl()
  instagram_url: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  mark_new?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  thumbnail_uuid?: string;

  @ApiPropertyOptional({ example: '2026-07-07T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  published_at?: string;
}

export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
