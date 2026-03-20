import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { DatasourcesModule } from './datasources/datasources.module';
import { SpacesModule } from './spaces/spaces.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DbModule, DatasourcesModule, SpacesModule, UsersModule],
})
export class AppModule {}
