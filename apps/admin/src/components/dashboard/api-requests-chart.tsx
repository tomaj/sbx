'use client';

import { useState, useRef, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useApi } from '@/lib/swr';
import { Calendar, ChevronDown } from 'lucide-react';
import { formatWeekdayShort, formatMonthShort } from '@/lib/date';

type Tab = 'api_requests' | 'ai_usage';

interface DayEntry {
  date: string;
  count: number;
  tokens?: number;
}

interface TrafficResponse {
  total: number;
  previous_total: number;
  period_label: string;
  group_by: 'day' | 'month';
  data: DayEntry[];
  total_tokens?: number;
}

type Period =
  | 'last_7_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'last_14_days';

const API_PERIODS: { value: Period; label: string }[] = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
];

const AI_PERIODS: { value: Period; label: string }[] = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_14_days', label: 'Last 14 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
];

function formatLabel(date: string, groupBy: 'day' | 'month'): { line1: string; line2: string } {
  if (groupBy === 'month') {
    const [year, month] = date.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return {
      line1: formatMonthShort(d),
      line2: String(year),
    };
  }
  const d = new Date(`${date}T12:00:00`);
  return {
    line1: formatWeekdayShort(d),
    line2: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`,
  };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatYAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: DayEntry & { line1: string; line2: string } }[];
  label?: string;
  tab: Tab;
}

function CustomTooltip({ active, payload, label, tab }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-teal-400">
        {entry.value.toLocaleString()} {tab === 'ai_usage' ? 'AI calls' : 'requests'}
      </p>
      {tab === 'ai_usage' && (entry.payload.tokens ?? 0) > 0 && (
        <p className="text-gray-400">{(entry.payload.tokens ?? 0).toLocaleString()} tokens</p>
      )}
    </div>
  );
}

function PeriodDropdown({
  value,
  onChange,
  periods,
}: {
  value: Period;
  onChange: (p: Period) => void;
  periods: { value: Period; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = periods.find((p) => p.value === value) ?? periods[0];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[160px] justify-between"
      >
        <span className="flex items-center gap-2">
          <Calendar className="size-4 text-gray-400" />
          {current.label}
        </span>
        <ChevronDown className="size-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => {
                onChange(p.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                p.value === value
                  ? 'bg-gray-100 dark:bg-gray-700 font-medium text-gray-900 dark:text-gray-100'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function ApiRequestsChart({ spaceId }: { spaceId: string }) {
  const [tab, setTab] = useState<Tab>('api_requests');
  const [apiPeriod, setApiPeriod] = useState<Period>('this_month');
  const [aiPeriod, setAiPeriod] = useState<Period>('last_14_days');
  const [showTable, setShowTable] = useState(false);
  const isDark = useDark();

  const period = tab === 'api_requests' ? apiPeriod : aiPeriod;
  const periods = tab === 'api_requests' ? API_PERIODS : AI_PERIODS;

  const apiUrl =
    tab === 'api_requests'
      ? `/api/admin/spaces/${spaceId}/statistics/traffic?period=${apiPeriod}`
      : `/api/admin/spaces/${spaceId}/statistics/ai?period=${aiPeriod}`;

  const { data, isLoading } = useApi<TrafficResponse>(apiUrl);

  const chartData = (data?.data ?? []).map((d) => {
    const lbl = formatLabel(d.date, data?.group_by ?? 'day');
    return { ...d, line1: lbl.line1, line2: lbl.line2 };
  });

  const currentPeriod = periods.find((p) => p.value === period) ?? periods[0];
  const prevDiff = data ? data.total - data.previous_total : 0;
  const xAxisStep = chartData.length <= 14 ? 1 : chartData.length <= 35 ? 7 : 4;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-10 w-40 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-4 w-44 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="h-52 w-full rounded bg-gray-100 dark:bg-gray-700/40 animate-pulse mt-2" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      {/* Tab switcher + period dropdown */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 w-full pb-0">
          {(['api_requests', 'ai_usage'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setShowTable(false);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t === 'api_requests' ? 'API Requests' : 'AI Usage'}
            </button>
          ))}
        </div>
        <div className="shrink-0">
          <PeriodDropdown
            value={period}
            onChange={tab === 'api_requests' ? setApiPeriod : setAiPeriod}
            periods={periods}
          />
        </div>
      </div>

      {/* Summary */}
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <span className="font-bold text-gray-900 dark:text-gray-100 text-2xl">
            {(data?.total ?? 0).toLocaleString()}
          </span>{' '}
          {tab === 'api_requests' ? 'requests' : 'AI calls'} in {currentPeriod.label.toLowerCase()}
        </p>
        {tab === 'ai_usage' && (data?.total_tokens ?? 0) > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {data!.total_tokens!.toLocaleString()} tokens total
          </p>
        )}
        {data && data.previous_total > 0 && (
          <p
            className={`text-xs font-medium mt-0.5 ${prevDiff >= 0 ? 'text-teal-500' : 'text-orange-400'}`}
          >
            {prevDiff >= 0 ? '+' : ''}
            {prevDiff.toLocaleString()} from previous period
          </p>
        )}
      </div>

      <div className="mt-4">
        <button
          onClick={() => setShowTable((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 10h16M4 14h16M4 18h16"
            />
          </svg>
          {showTable ? 'Show as Chart' : 'Show as Table'}
        </button>
      </div>

      {showTable ? (
        <div className="mt-4 overflow-auto max-h-64">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">Date</th>
                <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">
                  {tab === 'api_requests' ? 'Requests' : 'AI Calls'}
                </th>
                {tab === 'ai_usage' && (
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400 text-right">
                    Tokens
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr
                  key={d.date}
                  className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                >
                  <td className="py-1.5 text-gray-700 dark:text-gray-300">
                    {d.line1} {d.line2}
                  </td>
                  <td className="py-1.5 text-right font-medium text-gray-900 dark:text-gray-100">
                    {d.count.toLocaleString()}
                  </td>
                  {tab === 'ai_usage' && (
                    <td className="py-1.5 text-right text-gray-500 dark:text-gray-400">
                      {(d.tokens ?? 0).toLocaleString()}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barCategoryGap="25%"
              margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="line1"
                tick={(props: { x: string | number; y: string | number; index: number }) => {
                  const { x, y, index } = props;
                  if (index % xAxisStep !== 0) return <g />;
                  const d = chartData[index];
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={0} y={0} dy={12} textAnchor="middle" fill="#9ca3af" fontSize={10}>
                        {d?.line1}
                      </text>
                      <text x={0} y={0} dy={22} textAnchor="middle" fill="#6b7280" fontSize={9}>
                        {d?.line2}
                      </text>
                    </g>
                  );
                }}
                tickLine={false}
                axisLine={false}
                interval={0}
                height={32}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip tab={tab} />}
                cursor={{ fill: 'rgba(107,114,128,0.08)' }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} minPointSize={3}>
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 9, fill: '#9ca3af' }}
                  formatter={(v: unknown) => ((v as number) > 0 ? formatCount(v as number) : '')}
                />
                {chartData.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={entry.count > 0 ? '#0d9488' : isDark ? '#2d3748' : '#e5e7eb'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
