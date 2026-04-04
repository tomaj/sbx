'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function DateField({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const parsedDate = value ? new Date(`${value}T00:00:00`) : null;

  const [viewYear, setViewYear] = useState(parsedDate?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number, month: number, year: number) {
    const y = String(year).padStart(4, '0');
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  }

  // Build calendar cells: prev-month fillers + current days + next-month fillers
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const daysInPrevMonth = getDaysInMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1,
  );
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  type Cell = { day: number; offset: -1 | 0 | 1 };
  const cells: Cell[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrevMonth - firstDay + i + 1, offset: -1 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, offset: 0 });
  }
  for (let d = 1; d <= totalCells - cells.length; d++) {
    cells.push({ day: d, offset: 1 });
  }

  const selDay = parsedDate?.getDate();
  const selMonth = parsedDate?.getMonth();
  const selYear = parsedDate?.getFullYear();

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 transition-colors',
          open
            ? 'border-teal-600 ring-1 ring-teal-600'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        )}
      >
        <Calendar className="size-4 text-gray-400 shrink-0" />
        <span
          className={cn(
            'flex-1 text-left',
            value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400',
          )}
        >
          {value || placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 w-64">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 mb-2" />

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              const isCur = cell.offset === 0;
              const cellYear =
                cell.offset === -1
                  ? viewMonth === 0
                    ? viewYear - 1
                    : viewYear
                  : cell.offset === 1
                    ? viewMonth === 11
                      ? viewYear + 1
                      : viewYear
                    : viewYear;
              const cellMonth =
                cell.offset === -1
                  ? viewMonth === 0
                    ? 11
                    : viewMonth - 1
                  : cell.offset === 1
                    ? viewMonth === 11
                      ? 0
                      : viewMonth + 1
                    : viewMonth;

              const isToday =
                isCur &&
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                cell.day === today.getDate();

              const isSelected =
                isCur && selYear === viewYear && selMonth === viewMonth && selDay === cell.day;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(cell.day, cellMonth, cellYear)}
                  className={cn(
                    'relative flex items-center justify-center h-8 w-8 mx-auto rounded-full text-sm transition-colors',
                    !isCur && 'text-gray-300 dark:text-gray-600',
                    isCur &&
                      !isSelected &&
                      !isToday &&
                      'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                    isToday && !isSelected && 'text-teal-600 font-semibold',
                    isSelected && 'bg-teal-600 text-white font-semibold',
                  )}
                >
                  {cell.day}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-teal-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
