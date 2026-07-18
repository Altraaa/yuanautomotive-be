import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Standard page sizes applied when the FE omits `?limit=`.
 * Admin panel lists use 25 rows/page; public (end-user) lists use 10.
 * An explicit `?limit=` from the FE always wins (capped at 100 below).
 */
export const ADMIN_PAGE_SIZE = 25;
export const PUBLIC_PAGE_SIZE = 10;

/** Shared pagination query for all list endpoints (CLAUDE.md: always paginated). */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: PUBLIC_PAGE_SIZE,
    minimum: 1,
    maximum: 100,
    description: 'Rows per page. Defaults per context (admin 25 / public 10).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = PUBLIC_PAGE_SIZE;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * Apply the context default page-size when the FE didn't send an explicit
 * `?limit=`. `rawLimit` is the untouched query string value — it is undefined
 * only when the param is truly absent (the DTO default can't otherwise be
 * distinguished from an explicit value).
 */
export function applyContextLimit(
  query: PaginationQueryDto,
  rawLimit: string | undefined,
  isAdmin: boolean,
): void {
  if (rawLimit === undefined) {
    query.limit = isAdmin ? ADMIN_PAGE_SIZE : PUBLIC_PAGE_SIZE;
  }
}
