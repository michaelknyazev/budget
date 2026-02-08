'use client';

import {
  Navbar,
  NavbarGroup,
  NavbarHeading,
  NavbarDivider,
  Button,
  Alignment,
  SegmentedControl,
} from '@blueprintjs/core';
import { usePathname, useRouter } from 'next/navigation';
import { Currency } from '@budget/schemas';
import styles from './AppNavbar.module.scss';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' as const },
  { path: '/transactions', label: 'Transactions', icon: 'bank-account' as const },
  { path: '/subscriptions', label: 'Subscriptions', icon: 'repeat' as const },
  { path: '/loans', label: 'Loans', icon: 'credit-card' as const },
  { path: '/budget', label: 'Budget', icon: 'pie-chart' as const },
  { path: '/settings', label: 'Settings', icon: 'cog' as const },
];

const CURRENCIES = Object.values(Currency).map((c) => ({
  label: c,
  value: c,
}));

interface AppNavbarProps {
  displayCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export function AppNavbar({
  displayCurrency,
  onCurrencyChange,
}: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Navbar className={styles.navbar} fixedToTop>
      <div className={styles.navContent}>
        <NavbarGroup align={Alignment.LEFT}>
          <NavbarHeading>Budget</NavbarHeading>
          <NavbarDivider />
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.path}
              icon={item.icon}
              text={item.label}
              minimal
              active={
                item.path === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.path)
              }
              onClick={() => router.push(item.path)}
            />
          ))}
        </NavbarGroup>
        <NavbarGroup align={Alignment.RIGHT}>
          <SegmentedControl
            small
            options={CURRENCIES}
            value={displayCurrency}
            onValueChange={onCurrencyChange}
          />
        </NavbarGroup>
      </div>
    </Navbar>
  );
}
