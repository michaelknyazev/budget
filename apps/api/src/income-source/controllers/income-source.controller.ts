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
import { IncomeSourceService } from '../services/income-source.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import { CreateIncomeSourceDto, UpdateIncomeSourceDto } from '../dto';
import { IncomeSource } from '../entities/income-source.entity';

@ApiTags('Income Source')
@Controller('income-source')
export class IncomeSourceController {
  constructor(private readonly incomeSourceService: IncomeSourceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new income source' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateIncomeSourceDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<IncomeSource> {
    return this.incomeSourceService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all income sources' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<IncomeSource[]> {
    return this.incomeSourceService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get income source by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IncomeSource> {
    return this.incomeSourceService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an income source' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIncomeSourceDto,
  ): Promise<IncomeSource> {
    return this.incomeSourceService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an income source' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.incomeSourceService.delete(id);
  }
}
