import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class NewsQueryDto extends PaginationQueryDto {
  /** Tab filter: `reels` | `poster` (case-insensitive). */
  @ApiPropertyOptional({ description: 'reels | poster' })
  @IsOptional()
  @IsString()
  type?: string;
}
