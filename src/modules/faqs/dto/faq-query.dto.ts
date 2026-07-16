import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class FaqQueryDto extends PaginationQueryDto {
  /** Filter by grouping label (case-sensitive exact match). */
  @ApiPropertyOptional({ description: 'Filter kategori, mis. "Garansi"' })
  @IsOptional()
  @IsString()
  category?: string;

  /** Free-text search across question + answer. */
  @ApiPropertyOptional({ description: 'Cari di pertanyaan & jawaban' })
  @IsOptional()
  @IsString()
  search?: string;
}
