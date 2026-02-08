import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlannedIncomeService } from '../services/planned-income.service';
import {
  CurrentUser,
  CurrentUserData,
} from '@/auth/decorators/current-user.decorator';
import {
  CreatePlannedIncomeDto,
  UpdatePlannedIncomeDto,
  QueryPlannedIncomeDto,
  QueryPlannedIncomeComparisonDto,
} from '../dto';
import { PlannedIncome } from '../entities/planned-income.entity';

@ApiTags('Planned Income')
@Controller('planned-income')
export class PlannedIncomeController {
  constructor(
    private readonly plannedIncomeService: PlannedIncomeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a planned income entry' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreatePlannedIncomeDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PlannedIncome> {
    return this.plannedIncomeService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List planned income for a year (or month)' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(
    @Query() query: QueryPlannedIncomeDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<PlannedIncome[]> {
    return this.plannedIncomeService.findAll(
      user.id,
      query.year,
      query.month,
    );
  }

  @Get('comparison')
  @ApiOperation({
    summary: 'Get planned vs actual income comparison for a month',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getComparison(
    @Query() query: QueryPlannedIncomeComparisonDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.plannedIncomeService.getComparison(
      user.id,
      query.month,
      query.year,
      query.currency,
    );
  }

  @Post('copy-previous')
  @ApiOperation({
    summary: 'Copy planned income from the previous month',
  })
  @ApiResponse({ status: HttpStatus.CREATED })
  async copyFromPrevious(
    @Body() dto: { month: number; year: number },
    @CurrentUser() user: CurrentUserData,
  ): Promise<PlannedIncome[]> {
    return this.plannedIncomeService.copyFromPreviousMonth(
      user.id,
      dto.month,
      dto.year,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get planned income by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlannedIncome> {
    return this.plannedIncomeService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a planned income entry' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlannedIncomeDto,
  ): Promise<PlannedIncome> {
    return this.plannedIncomeService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a planned income entry' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.plannedIncomeService.delete(id);
  }
}
