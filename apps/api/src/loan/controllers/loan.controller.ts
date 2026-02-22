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
import { LoanService } from '../services/loan.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import { CreateLoanDto, UpdateLoanDto } from '../dto';
import { Loan } from '../entities/loan.entity';

@ApiTags('Loan')
@Controller('loan')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateLoanDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Loan> {
    return this.loanService.create(dto, user.id);
  }

  @Post('recalculate')
  @ApiOperation({ summary: 'Auto-create loans from unlinked LOAN_DISBURSEMENT transactions' })
  @ApiResponse({ status: HttpStatus.OK })
  async recalculate(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ created: number }> {
    const created = await this.loanService.recalculateFromTransactions(user.id);
    return { created };
  }

  @Post('link-repayments')
  @ApiOperation({ summary: 'Auto-link LOAN_REPAYMENT and LOAN_INTEREST transactions to loans' })
  @ApiResponse({ status: HttpStatus.OK })
  async linkRepayments(
    @CurrentUser() user: CurrentUserData,
  ): Promise<{ repaymentsLinked: number; interestLinked: number; loansStillUnpaid: number }> {
    return this.loanService.linkUnlinkedRepayments(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all loans' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<Loan[]> {
    return this.loanService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Loan> {
    return this.loanService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a loan' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLoanDto,
  ): Promise<Loan> {
    return this.loanService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a loan' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.loanService.delete(id);
  }
}
