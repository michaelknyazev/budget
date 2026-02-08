'use client';

import { Icon } from '@blueprintjs/core';
import { usePathname, useRouter } from 'next/navigation';
import styles from './MobileNav.module.scss';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' as const },
  { path: '/transactions', label: 'Txns', icon: 'bank-account' as const },
  { path: '/subscriptions', label: 'Subs', icon: 'repeat' as const },
  { path: '/loans', label: 'Loans', icon: 'credit-card' as const },
  { path: '/budget', label: 'Budget', icon: 'pie-chart' as const },
  { path: '/settings', label: 'Settings', icon: 'cog' as const },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className={styles.mobileNav}>
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.path === '/'
            ? pathname === '/'
            : pathname.startsWith(item.path);

        return (
          <button
            key={item.path}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            onClick={() => router.push(item.path)}
          >
            <Icon icon={item.icon} size={18} />
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
