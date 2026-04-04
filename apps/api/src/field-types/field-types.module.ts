import { Module } from '@nestjs/common';
import { FieldTypesAdminController } from './field-types-admin.controller';
import { FieldTypesService } from './field-types.service';

@Module({
  controllers: [FieldTypesAdminController],
  providers: [FieldTypesService],
  exports: [FieldTypesService],
})
export class FieldTypesModule {}
