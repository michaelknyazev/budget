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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionService } from '../services/transaction.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  QueryTransactionsDto,
  TransactionResponseDto,
} from '../dto';

@ApiTags('Transaction')
@Controller('transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: HttpStatus.CREATED, type: TransactionResponseDto })
  async create(
    @Body() dto: CreateTransactionDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionService.create(dto, user.id);
    return this.toResponseDto(transaction);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions with filters' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(
    @Query() query: QueryTransactionsDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ transactions: TransactionResponseDto[]; total: number }> {
    const result = await this.transactionService.findByUserId(user.id, query);
    return {
      transactions: result.transactions.map((t) => this.toResponseDto(t)),
      total: result.total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionService.findById(id);
    return this.toResponseDto(transaction);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiResponse({ status: HttpStatus.OK, type: TransactionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionService.update(id, dto);
    return this.toResponseDto(transaction);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.transactionService.delete(id);
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

  private toResponseDto(transaction: any): TransactionResponseDto {
    return {
      id: transaction.id,
      title: transaction.title,
      amount: parseFloat(transaction.amount),
      currency: transaction.currency,
      type: transaction.type,
      date: this.toDateString(transaction.date) as string,
      postingDate: this.toDateString(transaction.postingDate),
      merchantName: transaction.merchantName || null,
      merchantLocation: transaction.merchantLocation || null,
      mccCode: transaction.mccCode || null,
      cardLastFour: transaction.cardLastFour || null,
      rawDetails: transaction.rawDetails || null,
      metadata: transaction.metadata || null,
      categoryId: transaction.category?.id || null,
      bankImportId: transaction.bankImport?.id || null,
      importHash: transaction.importHash || null,
      createdAt: this.toISOString(transaction.createdAt),
      updatedAt: this.toISOString(transaction.updatedAt),
    };
  }
}
