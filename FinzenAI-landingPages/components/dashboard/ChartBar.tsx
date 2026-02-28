'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface BarItem {
  canal: string;
  registros: number;
  color: string;
}

interface ChartBarProps {
  title: string;
  data: BarItem[];
  height?: number;
}

export default function ChartBar({ title, data, height = 280 }: ChartBarProps) {
  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <h3 className="text-sm font-semibold text-finzen-black mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height - 40}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#b0b8be' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="canal"
            tick={{ fontSize: 12, fill: '#1a1a1a' }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="registros" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
