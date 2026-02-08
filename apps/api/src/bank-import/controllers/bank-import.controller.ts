import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { BankImportService } from '../services/bank-import.service';
import { CurrentUser, CurrentUserData } from '@/auth/decorators/current-user.decorator';

@ApiTags('Bank Import')
@Controller('bank-import')
export class BankImportController {
  constructor(private readonly bankImportService: BankImportService) {}

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
    );
  }
}
