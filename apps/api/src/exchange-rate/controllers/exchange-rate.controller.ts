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
import { ExchangeRateService } from '../services/exchange-rate.service';
import { ExchangeRateDto } from '../dto';
import { ExchangeRate } from '../entities/exchange-rate.entity';

@ApiTags('Exchange Rate')
@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exchange rate' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(@Body() dto: ExchangeRateDto): Promise<ExchangeRate> {
    return this.exchangeRateService.create(dto);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest exchange rates for all tracked currencies' })
  @ApiResponse({ status: HttpStatus.OK })
  async findLatest(): Promise<Record<string, number>> {
    return this.exchangeRateService.findLatestRates();
  }

  @Get()
  @ApiOperation({ summary: 'List all exchange rates' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(): Promise<ExchangeRate[]> {
    return this.exchangeRateService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exchange rate by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ExchangeRate> {
    return this.exchangeRateService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exchange rate' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<ExchangeRateDto>,
  ): Promise<ExchangeRate> {
    return this.exchangeRateService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an exchange rate' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.exchangeRateService.delete(id);
  }
}
