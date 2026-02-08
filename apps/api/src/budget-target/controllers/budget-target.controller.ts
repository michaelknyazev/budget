import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BudgetTargetService } from '../services/budget-target.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import { CreateBudgetTargetDto } from '../dto';
import { BudgetTarget } from '../entities/budget-target.entity';

@ApiTags('Budget Target')
@Controller('budget-target')
export class BudgetTargetController {
  constructor(private readonly budgetTargetService: BudgetTargetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new budget target' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateBudgetTargetDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BudgetTarget> {
    return this.budgetTargetService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all budget targets' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<BudgetTarget[]> {
    return this.budgetTargetService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget target by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BudgetTarget> {
    return this.budgetTargetService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a budget target' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBudgetTargetDto>,
  ): Promise<BudgetTarget> {
    return this.budgetTargetService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a budget target' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.budgetTargetService.delete(id);
  }
}
