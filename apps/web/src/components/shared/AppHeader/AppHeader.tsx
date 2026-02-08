'use client';

import { SegmentedControl } from '@blueprintjs/core';
import { usePathname } from 'next/navigation';
import { Currency } from '@budget/schemas';
import styles from './AppHeader.module.scss';

const CURRENCIES = Object.values(Currency).map((c) => ({
  label: c,
  value: c,
}));

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/transactions/import': 'Import Statement',
  '/subscriptions': 'Subscriptions',
  '/loans': 'Loans',
  '/budget': 'Budget',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match partial paths (e.g. /transactions/import)
  const match = Object.keys(PAGE_TITLES)
    .filter((p) => p !== '/')
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname.startsWith(p));
  return match ? PAGE_TITLES[match] : 'Budget';
}

interface AppHeaderProps {
  displayCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export function AppHeader({
  displayCurrency,
  onCurrencyChange,
}: AppHeaderProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        <SegmentedControl
          small
          options={CURRENCIES}
          value={displayCurrency}
          onValueChange={onCurrencyChange}
        />
      </div>
    </header>
  );
}
