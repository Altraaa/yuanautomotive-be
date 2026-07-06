import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import {
  StatusBreakdownQueryDto,
  TimeseriesQueryDto,
  TopProductsQueryDto,
} from './dto/dashboard-query.dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }

  @Get('timeseries')
  timeseries(@Query() query: TimeseriesQueryDto) {
    return this.dashboard.timeseries(query);
  }

  @Get('products-by-category')
  productsByCategory() {
    return this.dashboard.productsByCategory();
  }

  @Get('top-products')
  topProducts(@Query() query: TopProductsQueryDto) {
    return this.dashboard.topProducts(query);
  }

  @Get('status-breakdown')
  statusBreakdown(@Query() query: StatusBreakdownQueryDto) {
    return this.dashboard.statusBreakdown(query);
  }

  @Get('recent')
  recent() {
    return this.dashboard.recent();
  }
}
