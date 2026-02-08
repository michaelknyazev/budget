'use client';

import { Button, Icon } from '@blueprintjs/core';
import { usePathname, useRouter } from 'next/navigation';
import styles from './AppSidebar.module.scss';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' as const },
  { path: '/transactions', label: 'Transactions', icon: 'bank-account' as const },
  { path: '/subscriptions', label: 'Subscriptions', icon: 'repeat' as const },
  { path: '/loans', label: 'Loans', icon: 'credit-card' as const },
  { path: '/budget', label: 'Budget', icon: 'pie-chart' as const },
  { path: '/settings', label: 'Settings', icon: 'cog' as const },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <Icon icon="dollar" size={20} className={styles.brandIcon} />
        {!collapsed && <span className={styles.brandText}>Budget</span>}
      </div>

      <nav className={styles.nav}>
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
              title={collapsed ? item.label : undefined}
            >
              <Icon icon={item.icon} size={16} />
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <Button
          icon={collapsed ? 'chevron-right' : 'chevron-left'}
          minimal
          small
          onClick={onToggle}
          className={styles.collapseBtn}
        />
      </div>
    </aside>
  );
}
