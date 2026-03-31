import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { StorageModule } from './storage/storage.module';
import { DatasourcesModule } from './datasources/datasources.module';
import { SpacesModule } from './spaces/spaces.module';
import { UsersModule } from './users/users.module';
import { TagsModule } from './tags/tags.module';
import { AuthModule } from './auth/auth.module';
import { ComponentsModule } from './components/components.module';
import { AccessTokensModule } from './access-tokens/access-tokens.module';
import { SpaceRolesModule } from './space-roles/space-roles.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PresetsModule } from './presets/presets.module';
import { ActivitiesModule } from './activities/activities.module';
import { PersonalTokensModule } from './personal-tokens/personal-tokens.module';
import { AssetsModule } from './assets/assets.module';
import { BranchesModule } from './branches/branches.module';
import { ReleasesModule } from './releases/releases.module';
import { StoriesModule } from './stories/stories.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { FieldTypesModule } from './field-types/field-types.module';
import { BridgeModule } from './bridge/bridge.module';
import { WorkflowStageChangesModule } from './workflow-stage-changes/workflow-stage-changes.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { JobsModule } from './jobs/jobs.module';
import { InternalTagsModule } from './internal-tags/internal-tags.module';

@Module({
  imports: [JobsModule, DbModule, StorageModule, AuthModule, DatasourcesModule, SpacesModule, UsersModule, TagsModule, ComponentsModule, AccessTokensModule, SpaceRolesModule, WebhooksModule, PresetsModule, ActivitiesModule, PersonalTokensModule, AssetsModule, BranchesModule, ReleasesModule, StoriesModule, TasksModule, WorkflowsModule, FieldTypesModule, BridgeModule, WorkflowStageChangesModule, ApprovalsModule, DiscussionsModule, InternalTagsModule],
})
export class AppModule {}
