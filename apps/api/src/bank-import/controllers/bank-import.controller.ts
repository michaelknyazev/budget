import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EntityManager } from '@mikro-orm/postgresql';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { BankImportService } from '../services/bank-import.service';
import { BankImport } from '../entities/bank-import.entity';
import { SkippedTransaction } from '../entities/skipped-transaction.entity';
import { Transaction } from '@/transaction/entities/transaction.entity';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';

@ApiTags('Bank Import')
@Controller('bank-import')
export class BankImportController {
  constructor(
    private readonly bankImportService: BankImportService,
    private readonly em: EntityManager,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Import bank statement XLSX' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body('bankAccountId') bankAccountId: string | undefined,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.bankImportService.processFile(
      file.buffer,
      user.id,
      bankAccountId,
      file.originalname,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all bank imports for the current user' })
  async listImports(@CurrentUser() user: CurrentUserData) {
    const imports = await this.em.find(
      BankImport,
      { bankAccount: { user: user.id } },
      {
        populate: ['bankAccount'],
        orderBy: { importedAt: 'DESC' },
      },
    );

    // Batch-count created and skipped per import
    const importIds = imports.map((i) => i.id);

    const createdCounts = importIds.length
      ? await this.em
          .createQueryBuilder(Transaction, 't')
          .select(['t.bank_import_id', 'count(*) as cnt'])
          .where({ bankImport: { $in: importIds } })
          .groupBy('t.bank_import_id')
          .execute<{ bank_import_id: string; cnt: string }[]>()
      : [];

    const skippedCounts = importIds.length
      ? await this.em
          .createQueryBuilder(SkippedTransaction, 's')
          .select(['s.bank_import_id', 'count(*) as cnt'])
          .where({ bankImport: { $in: importIds } })
          .groupBy('s.bank_import_id')
          .execute<{ bank_import_id: string; cnt: string }[]>()
      : [];

    const createdMap = new Map(createdCounts.map((r) => [r.bank_import_id, parseInt(r.cnt)]));
    const skippedMap = new Map(skippedCounts.map((r) => [r.bank_import_id, parseInt(r.cnt)]));

    return imports.map((imp) => ({
      id: imp.id,
      fileName: imp.fileName,
      accountIban: imp.bankAccount?.iban ?? '',
      accountOwner: imp.bankAccount?.accountOwner ?? '',
      periodFrom: imp.periodFrom,
      periodTo: imp.periodTo,
      startingBalance: imp.startingBalance,
      endBalance: imp.endBalance,
      transactionCount: imp.transactionCount,
      created: createdMap.get(imp.id) ?? 0,
      skipped: skippedMap.get(imp.id) ?? 0,
      importedAt: imp.importedAt,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bank import with details' })
  async getImport(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const imp = await this.em.findOneOrFail(
      BankImport,
      { id, bankAccount: { user: user.id } },
      { populate: ['bankAccount'] },
    );

    const [createdCount, skippedCount] = await Promise.all([
      this.em.count(Transaction, { bankImport: id }),
      this.em.count(SkippedTransaction, { bankImport: id }),
    ]);

    return {
      id: imp.id,
      fileName: imp.fileName,
      accountIban: imp.bankAccount?.iban ?? '',
      accountOwner: imp.bankAccount?.accountOwner ?? '',
      periodFrom: imp.periodFrom,
      periodTo: imp.periodTo,
      startingBalance: imp.startingBalance,
      endBalance: imp.endBalance,
      transactionCount: imp.transactionCount,
      created: createdCount,
      skipped: skippedCount,
      importedAt: imp.importedAt,
    };
  }

  @Get(':id/skipped-transactions')
  @ApiOperation({ summary: 'List skipped transactions for a bank import' })
  async getSkippedTransactions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Verify ownership
    await this.em.findOneOrFail(BankImport, {
      id,
      bankAccount: { user: user.id },
    });

    const skipped = await this.em.find(
      SkippedTransaction,
      { bankImport: id },
      { orderBy: { date: 'ASC' } },
    );

    return skipped.map((s) => ({
      id: s.id,
      date: s.date,
      amount: s.amount,
      currency: s.currency,
      rawDetails: s.rawDetails,
      reason: s.reason,
      importHash: s.importHash,
      existingTransactionId: s.existingTransaction?.id ?? null,
    }));
  }
}
