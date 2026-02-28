'use client';

import { useState } from 'react';

const ranges = [
  { label: '7d', value: '7d' },
  { label: '14d', value: '14d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

export default function DateRangePicker() {
  const [selected, setSelected] = useState('30d');

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg border border-finzen-gray/20 p-1 w-fit">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => setSelected(range.value)}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            selected === range.value
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
