import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesAdminController } from './pipelines-admin.controller';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule],
  controllers: [PipelinesAdminController],
  providers: [PipelinesService],
})
export class PipelinesModule {}
