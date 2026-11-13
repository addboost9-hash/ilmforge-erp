/**
 * The school's stamp on printed papers.
 *
 *   useSchoolStamp()            the stamp and where it is printed (GET /stamp);
 *                               null for anyone who may not have it
 *   stampFor(stamp, place)      the picture, if it is printed on that kind of paper
 *   stampImg(src)               the <img> for a printed page: put it inside the
 *                               principal's signature box, which must be
 *                               position:relative (STAMP_CSS does the rest)
 *
 * Places: rollSlips, resultCards, dateSheets, feeRecords, attendanceRegister.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export const STAMP_PLACES = [
  { key: 'rollSlips', label: 'Roll number slips' },
  { key: 'resultCards', label: 'Result cards' },
  { key: 'dateSheets', label: 'Date sheets' },
  { key: 'feeRecords', label: 'Fee cards and fee register' },
  { key: 'attendanceRegister', label: 'Attendance register' },
];

export function useSchoolStamp() {
  const { data } = useQuery({
    queryKey: ['school-stamp'],
    queryFn: () => api.get('/stamp', { silent: true }).then((r) => r.data.data).catch(() => null),
    staleTime: 5 * 60_000,
  });
  return data || null;
}

const PICTURE = /^data:image\/(png|jpe?g|webp);base64,/i;
export const stampFor = (stamp, place) => (stamp?.image && PICTURE.test(stamp.image) && stamp.places?.[place] !== false ? stamp.image : '');

/** The stamp over the left of the principal's signature, a little turned, as a hand stamp lands. */
export const stampImg = (src) => (src ? `<img class="ilm-stamp" src="${src}" alt=""/>` : '');

export const STAMP_CSS = `
  .ilm-stamp{position:absolute;left:50%;bottom:4px;width:30mm;max-height:30mm;object-fit:contain;transform:translateX(-95%) rotate(-10deg);opacity:.88;pointer-events:none;mix-blend-mode:multiply}
`;
