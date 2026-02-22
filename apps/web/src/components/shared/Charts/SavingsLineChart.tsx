'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface SavingsLineChartProps {
  cumulativeSavings: number[];
  formatter: (value: number) => string;
}

export function SavingsLineChart({ cumulativeSavings, formatter }: SavingsLineChartProps) {
  const data = cumulativeSavings.map((savings, idx) => ({
    name: MONTH_SHORT[idx],
    Savings: savings,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} />
        <YAxis fontSize={11} tickFormatter={(v) => formatter(v)} tickLine={false} width={70} />
        <Tooltip
          formatter={(value: number) => formatter(value)}
          contentStyle={{ borderRadius: 8, border: '1px solid #d8e1e8', fontSize: 13 }}
        />
        <Line
          type="monotone"
          dataKey="Savings"
          stroke="#0d8050"
          strokeWidth={2}
          dot={{ fill: '#0d8050', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
