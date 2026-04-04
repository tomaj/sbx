import { Module } from '@nestjs/common';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { ComponentVersionsService } from './component-versions.service';

@Module({
  controllers: [ComponentsController],
  providers: [ComponentsService, ComponentVersionsService],
})
export class ComponentsModule {}
