import { useState, useEffect } from 'react';

const STORAGE_KEY = 'griffin_hide_amounts';

export function usePrivacyMode() {
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(hideAmounts));
  }, [hideAmounts]);

  const toggleHideAmounts = () => setHideAmounts(prev => !prev);

  const formatAmount = (amount: number, prefix: string = '') => {
    if (hideAmounts) return '***';
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${prefix}${amount.toLocaleString()}`;
  };

  return { hideAmounts, setHideAmounts, toggleHideAmounts, formatAmount };
}
