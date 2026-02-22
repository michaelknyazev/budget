'use client';

import { Button, Icon } from '@blueprintjs/core';
import { usePathname, useRouter } from 'next/navigation';
import styles from './AppSidebar.module.scss';

interface NavChild {
  path: string;
  label: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: 'dashboard' },
  {
    path: '/transactions',
    label: 'Transactions',
    icon: 'bank-account',
    children: [
      { path: '/transactions', label: 'All' },
      { path: '/transactions/untracked-income', label: 'Untracked Income' },
      { path: '/transactions/untracked-expenses', label: 'Untracked Expenses' },
    ],
  },
  { path: '/reports', label: 'Reports', icon: 'chart' },
  { path: '/subscriptions', label: 'Subscriptions', icon: 'repeat' },
  { path: '/loans', label: 'Loans', icon: 'credit-card' },
  { path: '/budget', label: 'Budget', icon: 'pie-chart' },
  { path: '/settings', label: 'Settings', icon: 'cog' },
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

          const isChildActive = (child: NavChild) =>
            child.path === '/transactions'
              ? pathname === '/transactions'
              : pathname === child.path;

          return (
            <div key={item.path}>
              <button
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                onClick={() => router.push(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <Icon icon={item.icon as any} size={16} />
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>

              {item.children && isActive && !collapsed && (
                <div className={styles.subNav}>
                  {item.children.map((child) => (
                    <button
                      key={child.path}
                      className={`${styles.subNavItem} ${isChildActive(child) ? styles.active : ''}`}
                      onClick={() => router.push(child.path)}
                    >
                      <span className={styles.navLabel}>{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
