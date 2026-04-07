import { Module } from '@nestjs/common';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { ComponentVersionsService } from './component-versions.service';
import { MaintenanceModeGuard } from '../shared/maintenance-mode.guard';

@Module({
  controllers: [ComponentsController],
  providers: [ComponentsService, ComponentVersionsService, MaintenanceModeGuard],
})
export class ComponentsModule {}
