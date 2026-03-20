import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { DatasourcesModule } from './datasources/datasources.module';
import { SpacesModule } from './spaces/spaces.module';
import { UsersModule } from './users/users.module';
import { TagsModule } from './tags/tags.module';
import { AuthModule } from './auth/auth.module';
import { ComponentsModule } from './components/components.module';
import { AccessTokensModule } from './access-tokens/access-tokens.module';
import { SpaceRolesModule } from './space-roles/space-roles.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [DbModule, AuthModule, DatasourcesModule, SpacesModule, UsersModule, TagsModule, ComponentsModule, AccessTokensModule, SpaceRolesModule, WebhooksModule],
})
export class AppModule {}
