import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from '../services/dashboard.service';
import {
  QueryMonthlySummaryDto,
  QueryYearlySummaryDto,
  QueryMonthlyReportDto,
} from '../dto/monthly-summary.dto';
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

  @Get('yearly-summary')
  @ApiOperation({ summary: 'Get yearly financial summary (all 12 months)' })
  async getYearlySummary(
    @Query() query: QueryYearlySummaryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.dashboardService.getYearlySummary(
      user.id,
      query.year,
      query.currency,
    );
  }

  @Get('monthly-report')
  @ApiOperation({ summary: 'Get detailed monthly financial report' })
  async getMonthlyReport(
    @Query() query: QueryMonthlyReportDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.dashboardService.getMonthlyReport(
      user.id,
      query.month,
      query.year,
      query.currency,
    );
  }

  @Get('balance-reconciliation')
  @ApiOperation({
    summary: 'Compare calculated balances against bank statement balances',
  })
  async getBalanceReconciliation(@CurrentUser() user: CurrentUserData) {
    return this.dashboardService.getBalanceReconciliation(user.id);
  }
}
