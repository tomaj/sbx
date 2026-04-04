'use client';

import { useState, use } from 'react';
import { ArrowLeft, RotateCcw, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { WebhookLog, WebhookLogDetail } from '@sbx/types';
import { formatDateTime } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useApi } from '@/lib/swr';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookRef {
  id: number;
  name: string;
}

// ─── Log Detail Modal ─────────────────────────────────────────────────────────

function LogDetailModal({
  spaceId,
  logId,
  onClose,
}: {
  spaceId: string;
  logId: number;
  onClose: () => void;
}) {
  const { data, isLoading: loading } = useApi<any>(
    `/api/admin/spaces/${spaceId}/webhooks/logs/${logId}`,
  );
  const log: WebhookLogDetail | null = data?.log ?? null;

  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    await fetch(`/api/admin/spaces/${spaceId}/webhooks/logs/${logId}`, { method: 'POST' });
    setRetrying(false);
    setRetried(true);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {loading ? 'Loading...' : (log?.action ?? 'Log Detail')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : !log ? (
            <p className="text-sm text-red-500">Log not found.</p>
          ) : (
            <div className="space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Status
                  </p>
                  <Badge variant={log.status === 'success' ? 'success' : 'danger'}>
                    {log.status === 'success' ? 'Success' : 'Failed'}
                    {log.responseStatus ? ` (${log.responseStatus})` : ''}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Executed at
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDateTime(log.executedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Type
                  </p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{log.action}</p>
                </div>
                {log.webhookName && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Webhook
                    </p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{log.webhookName}</p>
                  </div>
                )}
              </div>

              {/* Response */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Response
                </p>
                <pre className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-words">
                  {log.responseBody
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(log.responseBody), null, 2);
                        } catch {
                          return log.responseBody;
                        }
                      })()
                    : '(no response body)'}
                </pre>
              </div>

              {/* Payload */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Payload
                </p>
                <pre className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-words">
                  {log.requestBody ? JSON.stringify(log.requestBody, null, 2) : '(no payload)'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying || retried}
            className="flex items-center gap-1.5 text-sm text-teal-600 dark:text-teal-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {retried ? 'Retried' : retrying ? 'Retrying...' : 'Retry'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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
