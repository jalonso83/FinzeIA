'use client';

import type { DateRange } from '@/lib/dashboard-api';

const ranges: { label: string; value: DateRange }[] = [
  { label: '7d', value: '7d' },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 bg-white rounded-lg border border-finzen-gray/20 p-1 w-fit">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            value === range.value
              ? 'bg-finzen-blue text-white'
              : 'text-finzen-gray hover:text-finzen-black hover:bg-finzen-white'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
