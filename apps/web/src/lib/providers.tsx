'use client';

import { BlueprintProvider } from '@blueprintjs/core';
import { QueryProvider } from './query-provider';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BlueprintProvider>
      <QueryProvider>{children}</QueryProvider>
    </BlueprintProvider>
  );
}
