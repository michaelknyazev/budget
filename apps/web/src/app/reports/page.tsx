'use client';

import { Card, H4, Icon, Text } from '@blueprintjs/core';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import styles from './reports.module.scss';

const REPORT_TYPES = [
  {
    path: '/reports/yearly',
    title: 'Yearly Overview',
    description:
      'Full year at a glance: income, expenses, savings, and currency breakdown for all 12 months.',
    icon: 'calendar' as const,
  },
  {
    path: '/reports/monthly',
    title: 'Monthly Report',
    description:
      'Detailed monthly breakdown: income by source, expenses by currency, savings, loans, and subscriptions.',
    icon: 'document' as const,
  },
];

export default function ReportsPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <PageHeader title="Reports" />

      <div className={styles.grid}>
        {REPORT_TYPES.map((report) => (
          <Card
            key={report.path}
            className={styles.reportCard}
            interactive
            elevation={1}
            onClick={() => router.push(report.path)}
          >
            <div className={styles.cardIcon}>
              <Icon icon={report.icon} size={32} />
            </div>
            <H4>{report.title}</H4>
            <Text>{report.description}</Text>
          </Card>
        ))}
      </div>
    </div>
  );
}
