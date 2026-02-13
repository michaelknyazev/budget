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
import { BudgetTargetService } from '../services/budget-target.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import { CreateBudgetTargetDto, QueryBudgetTargetComparisonDto } from '../dto';
import { BudgetTarget } from '../entities/budget-target.entity';

@ApiTags('Budget Target')
@Controller('budget-target')
export class BudgetTargetController {
  constructor(private readonly budgetTargetService: BudgetTargetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new planned expense' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateBudgetTargetDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BudgetTarget> {
    return this.budgetTargetService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all planned expenses' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<BudgetTarget[]> {
    return this.budgetTargetService.findAll(user.id);
  }

  @Get('comparison')
  @ApiOperation({
    summary: 'Get planned vs actual expense comparison for a month',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getComparison(
    @Query() query: QueryBudgetTargetComparisonDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.budgetTargetService.getComparison(
      user.id,
      query.month,
      query.year,
      query.currency,
    );
  }

  @Post('copy-previous')
  @ApiOperation({
    summary: 'Copy planned expenses from the previous month',
  })
  @ApiResponse({ status: HttpStatus.CREATED })
  async copyFromPrevious(
    @Body() dto: { month: number; year: number },
    @CurrentUser() user: CurrentUserData,
  ): Promise<BudgetTarget[]> {
    return this.budgetTargetService.copyFromPreviousMonth(
      user.id,
      dto.month,
      dto.year,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get planned expense by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BudgetTarget> {
    return this.budgetTargetService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a planned expense' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBudgetTargetDto>,
  ): Promise<BudgetTarget> {
    return this.budgetTargetService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a planned expense' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.budgetTargetService.delete(id);
  }
}
