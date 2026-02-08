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
import { BankAccountService } from '../services/bank-account.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../dto';
import { BankAccount } from '../entities/bank-account.entity';

@ApiTags('Bank Account')
@Controller('bank-account')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bank account' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(
    @Body() dto: CreateBankAccountDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<BankAccount> {
    return this.bankAccountService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all bank accounts' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<BankAccount[]> {
    return this.bankAccountService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bank account by ID' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<BankAccount> {
    return this.bankAccountService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bank account' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccount> {
    return this.bankAccountService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a bank account' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.bankAccountService.delete(id);
  }
}
