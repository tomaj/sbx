import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiLogsService } from './ai-logs.service';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  providers: [AiService, AiLogsService],
  exports: [AiService, AiLogsService],
})
export class AiModule {}
