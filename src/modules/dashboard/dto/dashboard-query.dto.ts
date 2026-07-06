import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const METRICS = ['leads', 'orders', 'revenue'] as const;
export const RANGES = ['7d', '30d', '90d'] as const;
export const GRANULARITIES = ['day', 'week'] as const;
export const STATUS_ENTITIES = ['orders', 'contacts'] as const;

export type Metric = (typeof METRICS)[number];
export type Range = (typeof RANGES)[number];
export type Granularity = (typeof GRANULARITIES)[number];

export class TimeseriesQueryDto {
  @ApiPropertyOptional({ enum: METRICS, default: 'leads' })
  @IsOptional()
  @IsIn(METRICS)
  metric: Metric = 'leads';

  @ApiPropertyOptional({ enum: RANGES, default: '30d' })
  @IsOptional()
  @IsIn(RANGES)
  range: Range = '30d';

  @ApiPropertyOptional({ enum: GRANULARITIES, default: 'day' })
  @IsOptional()
  @IsIn(GRANULARITIES)
  granularity: Granularity = 'day';
}

export class TopProductsQueryDto {
  @ApiPropertyOptional({ enum: RANGES, default: '30d' })
  @IsOptional()
  @IsIn(RANGES)
  range: Range = '30d';

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 5;
}

export class StatusBreakdownQueryDto {
  @ApiPropertyOptional({ enum: STATUS_ENTITIES, default: 'orders' })
  @IsOptional()
  @IsIn(STATUS_ENTITIES)
  entity: (typeof STATUS_ENTITIES)[number] = 'orders';
}
