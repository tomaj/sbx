'use client';

import { ActivitiesTable } from '@/components/activities/activities-table';

export default function OrgActivitiesPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activities</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View history of changes in your Organization.
        </p>
      </div>

      <div className="px-8 pb-8 flex-1 flex flex-col">
        <ActivitiesTable scope="org" storageKey="perPage:org-activities" />
      </div>
    </div>
  );
}
