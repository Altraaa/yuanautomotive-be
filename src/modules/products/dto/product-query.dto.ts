import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export const PRODUCT_SORTS = ['terbaru', 'termurah', 'termahal'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/**
 * Default page size per context, applied by the controller when the FE omits
 * `?limit=` (an explicit ?limit= always wins, capped at 100 by the base DTO).
 */
export const PUBLIC_PRODUCTS_PER_PAGE = 10;
export const ADMIN_PRODUCTS_PER_PAGE = 20;

/** Public catalog list query (BACKEND-GUIDE §5.2). */
export class ProductQueryDto extends PaginationQueryDto {
  /** Category name or slug. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Minimum price (inclusive)' })
  @IsOptional()
  @IsNumberString()
  price_min?: string;

  @ApiPropertyOptional({ description: 'Maximum price (inclusive)' })
  @IsOptional()
  @IsNumberString()
  price_max?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: 'terbaru' })
  @IsOptional()
  @Type(() => String)
  @IsIn(PRODUCT_SORTS)
  sort: ProductSort = 'terbaru';
}
