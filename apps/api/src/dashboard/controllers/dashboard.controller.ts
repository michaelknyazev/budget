import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import { QueryMonthlySummaryDto } from '../dto/monthly-summary.dto';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly financial summary' })
  async getMonthlySummary(
    @Query() query: QueryMonthlySummaryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.dashboardService.getMonthlySummary(
      user.id,
      query.month,
      query.year,
      query.currency,
    );
  }
}
