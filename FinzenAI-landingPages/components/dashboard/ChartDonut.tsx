'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface DonutItem {
  name: string;
  value: number;
  color: string;
}

interface ChartDonutProps {
  title: string;
  data: DonutItem[];
  height?: number;
}

export default function ChartDonut({ title, data, height = 280 }: ChartDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-finzen-gray/20 p-5">
      <h3 className="text-sm font-semibold text-finzen-black mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width="50%" height={height - 40}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value}%`, '']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-finzen-black">
                {item.name}: <span className="font-semibold">{item.value}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
