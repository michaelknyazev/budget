'use client';

import { useState } from 'react';
import { Icon } from '@blueprintjs/core';
import { usePathname, useRouter } from 'next/navigation';
import styles from './MobileNav.module.scss';

const PRIMARY_ITEMS = [
  { path: '/', label: 'Home', icon: 'dashboard' as const },
  { path: '/transactions', label: 'Txns', icon: 'bank-account' as const },
  { path: '/budget', label: 'Budget', icon: 'pie-chart' as const },
  { path: '/reports', label: 'Reports', icon: 'chart' as const },
];

const SECONDARY_ITEMS = [
  { path: '/subscriptions', label: 'Subscriptions', icon: 'repeat' as const },
  { path: '/loans', label: 'Loans', icon: 'credit-card' as const },
  { path: '/settings', label: 'Settings', icon: 'cog' as const },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const isSecondaryActive = SECONDARY_ITEMS.some((item) =>
    pathname.startsWith(item.path),
  );

  const handleNavigate = (path: string) => {
    router.push(path);
    setMoreOpen(false);
  };

  return (
    <>
      {moreOpen && (
        <div className={styles.moreOverlay} onClick={() => setMoreOpen(false)}>
          <div className={styles.moreMenu} onClick={(e) => e.stopPropagation()}>
            {SECONDARY_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  className={`${styles.moreItem} ${isActive ? styles.active : ''}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  <Icon icon={item.icon} size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      <nav className={styles.mobileNav}>
        {PRIMARY_ITEMS.map((item) => {
          const isActive =
            item.path === '/'
              ? pathname === '/'
              : pathname.startsWith(item.path);

          return (
            <button
              key={item.path}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => handleNavigate(item.path)}
            >
              <Icon icon={item.icon} size={18} />
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
        <button
          className={`${styles.navItem} ${isSecondaryActive || moreOpen ? styles.active : ''}`}
          onClick={() => setMoreOpen(!moreOpen)}
        >
          <Icon icon="more" size={18} />
          <span className={styles.label}>More</span>
        </button>
      </nav>
    </>
  );
}
