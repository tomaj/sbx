import { Suspense } from 'react';
import ContentPlannerClient from './page.client';

export default function ContentPlannerPage({ params }: { params: Promise<{ spaceId: string }> }) {
  return (
    <Suspense>
      <ContentPlannerClient params={params} />
    </Suspense>
  );
}
