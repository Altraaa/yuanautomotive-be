import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class BlogQueryDto extends PaginationQueryDto {
  /** Title-case category label (Tips | Rilis | Panduan | Berita). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
