'use client';

import { useState } from 'react';
import { X, Calendar, ChevronDown } from 'lucide-react';
import type { StoryDetail } from '../types';

const TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  CET: 1,
  CEST: 2,
  EET: 2,
  EEST: 3,
  EST: -5,
  EDT: -4,
  CST: -6,
  CDT: -5,
  MST: -7,
  MDT: -6,
  PST: -8,
  PDT: -7,
};

interface Props {
  spaceId: string;
  storyId: number;
  onClose: () => void;
  onScheduled: (story: StoryDetail) => void;
}

export function SchedulePublishModal({ spaceId, storyId, onClose, onScheduled }: Props) {
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [scheduleTz, setScheduleTz] = useState('UTC');
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSchedule() {
    setIsScheduling(true);
    setError(null);
    try {
      const offsetHours = TIMEZONE_OFFSETS[scheduleTz] ?? 0;
      const localMs = new Date(`${scheduleDate}T${scheduleTime}:00`).getTime();
      const utcMs = localMs - offsetHours * 3600 * 1000;
      const publishAt = new Date(utcMs).toISOString();
      const res = await fetch(`/api/admin/spaces/${spaceId}/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: { publish_at: publishAt } }),
      });
      if (!res.ok) throw new Error('Schedule failed');
      const data = await res.json();
      onScheduled(data.story as StoryDetail);
      onClose();
    } catch {
      setError('Failed to schedule publishing. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-[520px] p-7 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5 text-gray-300" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">Schedule Publishing</h2>
        <p className="text-sm text-gray-400 mb-6">
          Select a date and time for the publication of your story.
        </p>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="mb-4">
          <label className="block text-sm font-semibold text-white mb-2">Date &amp; Time</label>
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm outline-none [color-scheme:dark]"
            />
            <button
              type="button"
              onClick={() => setScheduleDate('')}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="bg-gray-800 border border-gray-600 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-600">
              <span className="text-sm font-semibold text-white">Set Time</span>
            </div>
            <div className="flex">
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm px-4 py-3 outline-none border-r border-gray-600 [color-scheme:dark]"
              />
              <div className="relative flex-1">
                <select
                  value={scheduleTz}
                  onChange={(e) => setScheduleTz(e.target.value)}
                  className="w-full bg-transparent text-white text-sm px-4 py-3 outline-none appearance-none cursor-pointer"
                >
                  <option value="UTC">UTC</option>
                  <option value="CET">CET (UTC+1)</option>
                  <option value="CEST">CEST (UTC+2)</option>
                  <option value="EET">EET (UTC+2)</option>
                  <option value="EEST">EEST (UTC+3)</option>
                  <option value="EST">EST (UTC-5)</option>
                  <option value="EDT">EDT (UTC-4)</option>
                  <option value="CST">CST (UTC-6)</option>
                  <option value="PST">PST (UTC-8)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-6">
          Note: Scheduled stories may experience a delay of up to 5 minutes before publishing.
        </p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-600 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSchedule}
            disabled={isScheduling || !scheduleDate || !scheduleTime}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-sm font-medium text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
          >
            {isScheduling ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
