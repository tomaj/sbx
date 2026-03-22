import { Module } from '@nestjs/common';
import { FieldTypesAdminController } from './field-types-admin.controller';
import { FieldTypesService } from './field-types.service';
import { SessionGuard } from '../auth/session.guard';

@Module({
  controllers: [FieldTypesAdminController],
  providers: [FieldTypesService, SessionGuard],
  exports: [FieldTypesService],
})
export class FieldTypesModule {}
