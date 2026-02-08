import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import { AppShell } from '@/components/shared/AppShell';

import 'normalize.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/datetime2/lib/css/blueprint-datetime2.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/table/lib/css/table.css';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Budget',
  description: 'Personal multi-currency budget tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bp5-dark">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
