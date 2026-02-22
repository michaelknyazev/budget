'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface MonthData {
  month: number;
  grossIncome: number;
  totalExpenses: number;
  netIncome: number;
}

interface YearlyBarChartProps {
  months: MonthData[];
  formatter: (value: number) => string;
}

export function YearlyBarChart({ months, formatter }: YearlyBarChartProps) {
  const data = months.map((m, idx) => ({
    name: MONTH_SHORT[idx],
    Income: m.grossIncome,
    Expenses: m.totalExpenses,
    Net: m.netIncome,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e1e8ed" />
        <XAxis dataKey="name" fontSize={12} tickLine={false} />
        <YAxis fontSize={11} tickFormatter={(v) => formatter(v)} tickLine={false} width={70} />
        <Tooltip
          formatter={(value: number) => formatter(value)}
          contentStyle={{ borderRadius: 8, border: '1px solid #d8e1e8', fontSize: 13 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Income" fill="#0d8050" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expenses" fill="#c23030" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
