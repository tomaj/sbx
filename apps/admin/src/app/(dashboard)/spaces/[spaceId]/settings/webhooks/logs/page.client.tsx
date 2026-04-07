'use client';

import { useState, use } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { WebhookLog } from '@sbx/types';
import { formatDateTime } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useApi } from '@/lib/swr';
import { LogDetailModal } from './log-detail-modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookRef {
  id: number;
  name: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WebhookLogsPage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);

  const [filterWebhookId, setFilterWebhookId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  // Applied filter state — only updated when Filter button is clicked
  const [appliedFilter, setAppliedFilter] = useState({ webhookId: '', from: '', to: '' });

  const { data: webhooksData } = useApi<any>(`/api/admin/spaces/${spaceId}/webhooks`);
  const webhooks: WebhookRef[] = webhooksData?.webhook_endpoints ?? [];

  const logsUrl = (() => {
    const qs = new URLSearchParams();
    if (appliedFilter.webhookId) qs.set('webhook_id', appliedFilter.webhookId);
    if (appliedFilter.from) qs.set('from', new Date(appliedFilter.from).toISOString());
    if (appliedFilter.to) qs.set('to', new Date(appliedFilter.to).toISOString());
    const qsStr = qs.toString();
    return `/api/admin/spaces/${spaceId}/webhooks/logs${qsStr ? `?${qsStr}` : ''}`;
  })();

  const { data: logsData, isLoading: loading } = useApi<any>(logsUrl);
  const logs: WebhookLog[] = logsData?.logs ?? [];

  function applyFilter() {
    setAppliedFilter({ webhookId: filterWebhookId, from: fromDate, to: toDate });
  }

  return (
    <div className="max-w-4xl px-10 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/spaces/${spaceId}/settings/webhooks`}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Webhook Logs</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            Webhook
          </label>
          <select
            value={filterWebhookId}
            onChange={(e) => setFilterWebhookId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All webhooks</option>
            {webhooks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            From
          </label>
          <input
            type="datetime-local"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            To
          </label>
          <input
            type="datetime-local"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={applyFilter}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
        >
          Filter
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : logs.length === 0 ? (
        <EmptyState message="No webhook logs found." />
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  Webhook
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  Event
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wide">
                  Executed at
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLogId(log.id)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                    {log.webhookName ?? `#${log.webhookEndpointId}`}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{log.action}</td>
                  <td className="px-4 py-3">
                    <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                      {log.status === 'success' ? 'Success' : 'Failed'}
                      {log.responseStatus ? ` ${log.responseStatus}` : ''}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDateTime(log.executedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLogId !== null && (
        <LogDetailModal
          spaceId={spaceId}
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
        />
      )}
    </div>
  );
}
