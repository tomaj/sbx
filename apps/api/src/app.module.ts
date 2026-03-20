import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { DatasourcesModule } from './datasources/datasources.module';
import { SpacesModule } from './spaces/spaces.module';
import { UsersModule } from './users/users.module';
import { TagsModule } from './tags/tags.module';
import { AuthModule } from './auth/auth.module';
import { ComponentsModule } from './components/components.module';

@Module({
  imports: [DbModule, AuthModule, DatasourcesModule, SpacesModule, UsersModule, TagsModule, ComponentsModule],
})
export class AppModule {}
