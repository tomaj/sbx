'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { WebhookLogDetail } from '@sbx/types';
import { formatDateTime } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { useApi } from '@/lib/swr';

export function LogDetailModal({
  spaceId,
  logId,
  onClose,
}: {
  spaceId: string;
  logId: number;
  onClose: () => void;
}) {
  const { data, isLoading: loading } = useApi<{ log: WebhookLogDetail }>(
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
            type="button"
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
