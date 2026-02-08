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
import { DepositService } from '../services/deposit.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import { CreateDepositDto, UpdateDepositDto } from '../dto';
import { DepositResponse } from '@budget/schemas';
import { Deposit } from '../entities/deposit.entity';

@ApiTags('Deposit')
@Controller('deposit')
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deposit' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateDepositDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<DepositResponse> {
    const deposit = await this.depositService.create(dto, user.id);
    return this.toResponse(deposit);
  }

  @Get()
  @ApiOperation({ summary: 'List all deposits' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<DepositResponse[]> {
    const deposits = await this.depositService.findAll(user.id);
    return deposits.map((d) => this.toResponse(d));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deposit by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DepositResponse> {
    const deposit = await this.depositService.findById(id);
    return this.toResponse(deposit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a deposit' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDepositDto,
  ): Promise<DepositResponse> {
    const deposit = await this.depositService.update(id, dto);
    return this.toResponse(deposit);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deposit' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.depositService.delete(id);
  }

  private toDateString(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().split('T')[0]!;
    if (typeof value === 'string') return value.split('T')[0]!;
    return null;
  }

  private toISOString(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return new Date(value).toISOString();
    return new Date().toISOString();
  }

  private toResponse(deposit: Deposit): DepositResponse {
    return {
      id: deposit.id,
      title: deposit.title,
      balance: parseFloat(deposit.balance),
      currency: deposit.currency,
      annualRate: deposit.annualRate != null ? parseFloat(deposit.annualRate) : null,
      effectiveRate: deposit.effectiveRate != null ? parseFloat(deposit.effectiveRate) : null,
      startDate: this.toDateString(deposit.startDate),
      maturityDate: this.toDateString(deposit.maturityDate),
      bankAccountId: deposit.bankAccount?.id ?? null,
      isActive: deposit.isActive,
      createdAt: this.toISOString(deposit.createdAt),
      updatedAt: this.toISOString(deposit.updatedAt),
    };
  }
}
