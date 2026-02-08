'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface DisplayCurrencyContextType {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextType>({
  displayCurrency: 'USD',
  setDisplayCurrency: () => {},
});

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  return (
    <DisplayCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext);
}
