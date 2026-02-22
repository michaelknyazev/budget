'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = [
  '#0d8050', '#2965cc', '#c23030', '#bf7326', '#634dbf',
  '#0f9960', '#d99e0b', '#db3737', '#8a5c2c', '#5c7080',
];

interface CategoryData {
  name: string;
  amount: number;
}

interface CategoryPieChartProps {
  categories: CategoryData[];
  formatter: (value: number) => string;
}

export function CategoryPieChart({ categories, formatter }: CategoryPieChartProps) {
  if (!categories.length) return null;

  const data = categories.slice(0, 8).map((cat) => ({
    name: cat.name,
    value: cat.amount,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatter(value)}
          contentStyle={{ borderRadius: 8, border: '1px solid #d8e1e8', fontSize: 13 }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
