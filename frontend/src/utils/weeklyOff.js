/*
 * The school's weekly off days (Sunday unless the administrator chose others
 * on the Attendance Register), as weekday numbers: 0 Sunday … 6 Saturday.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const offWords = (days) => (days?.length ? days.map((d) => DAY_NAMES[d]).join(' and ') : 'Sunday');

export function useWeeklyOff() {
  const { data } = useQuery({
    queryKey: ['weekly-off'],
    queryFn: () => api.get('/attendance/weekly-off', { silent: true }).then((r) => r.data?.data?.days || [0]).catch(() => [0]),
    staleTime: 5 * 60e3,
  });
  return data || [0];
}
