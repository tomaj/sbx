import { NextRequest } from 'next/server'
import { apiFetch, proxyResponse } from '@/lib/api-server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { spaceId, memberId } = await params
  const body = await req.json()
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/collaborators/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({
      collaborator: {
        role: body.role,
        space_role_id: body.spaceRoleId,
        space_role_ids: body.spaceRoleIds,
      },
    }),
  }))
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string; memberId: string }> },
) {
  const { spaceId, memberId } = await params
  return proxyResponse(await apiFetch(`/v1/spaces/${spaceId}/collaborators/${memberId}`, { method: 'DELETE' }))
}
