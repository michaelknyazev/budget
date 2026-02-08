'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@blueprintjs/core';
import { useSession } from '@/lib/auth-client';
import { AppNavbar } from '../AppNavbar';
import styles from './AppShell.module.scss';

const PUBLIC_PATHS = ['/login'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  // Login page renders without the shell
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Loading auth state
  if (isPending) {
    return (
      <div className={styles.loadingScreen}>
        <Spinner size={50} />
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!session?.user) {
    router.replace('/login');
    return (
      <div className={styles.loadingScreen}>
        <Spinner size={50} />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <AppNavbar
        displayCurrency={displayCurrency}
        onCurrencyChange={setDisplayCurrency}
      />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
