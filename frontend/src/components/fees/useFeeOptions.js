/* What the fee register and the fee calendar are chosen and printed with:
   classes with sections, academic sessions, the school's letterhead. From
   the fees module, which the accountant may read (the class and settings
   pages are closed to the accountant). */
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

export default function useFeeOptions() {
  const { data } = useQuery({
    queryKey: ['fee-register-options'],
    queryFn: () => api.get('/fees/register/options').then((r) => r.data.data),
    staleTime: 5 * 60_000,
  });
  return { classes: data?.classes || [], sessions: data?.sessions || [], school: data?.school || {}, loaded: !!data };
}
