import { useQuery } from '@tanstack/react-query';
import { getStoredUser } from '../api/client';

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', CHF: 'CHF', JPY: '¥',
};

export function useCurrency() {
  const { data } = useQuery({
    queryKey: ['storedUser'],
    queryFn: getStoredUser,
    staleTime: Infinity,
  });
  const currency = data?.currency ?? 'USD';
  return { currency, sym: SYMBOLS[currency] ?? currency };
}
