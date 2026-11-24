/**
 * The exam terms a school runs (1 to 6), for every page of the Exam Vault.
 *
 * Read from /exams/terms, which teachers may read too: the pages used to ask
 * School Settings, which only the admin may open, so teachers always saw two
 * terms and the exams of a 3rd term never appeared for them.
 *
 * Changed in School Settings -> Exam Settings, or with "Add a term" in Exam
 * Setup; both refresh ['exam-terms'].
 */
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { buildTerms } from '../utils/terms';

export const EXAM_TERMS_KEY = ['exam-terms'];

/** The number of terms, or null while it loads (or if it cannot be read). */
export function useTermsCount() {
  const { data } = useQuery({
    queryKey: EXAM_TERMS_KEY,
    queryFn: () => api.get('/exams/terms').then((r) => r.data.data?.termsCount ?? null).catch(() => null),
    staleTime: 300_000,
  });
  return data ?? null;
}

/** The terms: [{ key: '1st', label: '1st Term', type, index }, …]. */
export default function useExamTerms(fallback = 2) {
  return buildTerms(useTermsCount() ?? fallback);
}
