import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3000'

async function getSessionToken() {
  const cookieStore = await cookies()
  return (
    cookieStore.get('better-auth.session_token')?.value ??
    cookieStore.get('__Secure-better-auth.session_token')?.value ??
    ''
  )
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string; stageId: string }> }) {
  const { spaceId, workflowId, stageId } = await params
  const token = await getSessionToken()
  const body = await req.json()
  // Convert camelCase from admin UI to snake_case for MAPI
  const stage: Record<string, any> = {}
  if (body.name !== undefined) stage.name = body.name
  if (body.color !== undefined) stage.color = body.color
  if (body.position !== undefined) stage.position = body.position
  if (body.isDefault !== undefined) stage.is_default = body.isDefault
  if (body.allowPublish !== undefined) stage.allow_publish = body.allowPublish
  if (body.allowAdminPublish !== undefined) stage.allow_admin_publish = body.allowAdminPublish
  if (body.allowAllUsers !== undefined) stage.allow_all_users = body.allowAllUsers
  if (body.allowAdminChange !== undefined) stage.allow_admin_change = body.allowAdminChange
  if (body.allowEditorChange !== undefined) stage.allow_editor_change = body.allowEditorChange
  if (body.allowAllStages !== undefined) stage.allow_all_stages = body.allowAllStages
  if (body.storyEditingLocked !== undefined) stage.story_editing_locked = body.storyEditingLocked
  if (body.autoRemoveAssignee !== undefined) stage.auto_remove_assignee = body.autoRemoveAssignee
  if (body.userIds !== undefined) stage.user_ids = body.userIds
  if (body.spaceRoleIds !== undefined) stage.space_role_ids = body.spaceRoleIds
  if (body.workflowStageIds !== undefined) stage.workflow_stage_ids = body.workflowStageIds
  if (body.afterPublishId !== undefined) stage.after_publish_id = body.afterPublishId
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/workflow_stages/${stageId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_stage: stage }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ spaceId: string; workflowId: string; stageId: string }> }) {
  const { spaceId, workflowId, stageId } = await params
  const token = await getSessionToken()
  const res = await fetch(`${API_URL}/v1/spaces/${spaceId}/workflow_stages/${stageId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 })
  }
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
