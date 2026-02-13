'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface DisplayCurrencyContextType {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextType>({
  displayCurrency: 'GEL',
  setDisplayCurrency: () => {},
});

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState('GEL');

  return (
    <DisplayCurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext);
}
