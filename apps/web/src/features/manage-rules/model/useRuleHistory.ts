import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryRuleService, categoryRuleKeys, useRuleApplications } from '@/entities/category-rule';

export function useRuleHistory(authenticated: boolean) {
  const client = useQueryClient();
  const query = useRuleApplications(authenticated);
  const [ruleId, setRuleId] = useState('');
  const [includeUnknown, setIncludeUnknown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const signature = (query.data || []).map((job) => `${job.id}:${job.applied}`).join('|');
  const previous = useRef('');
  useEffect(() => {
    if (!signature || previous.current === signature) return;
    previous.current = signature;
    for (const key of ['transactions', 'stats', 'analytics', 'budgets', 'categories', 'merchants']) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  }, [client, signature]);
  const mutation = useMutation({
    mutationFn: ({ action, id }: { action: 'preview' | 'confirm' | 'retry'; id: string }) => action === 'preview'
      ? categoryRuleService.preview(id, { includeUnknown, startDate: startDate || undefined, endDate: endDate || undefined })
      : categoryRuleService.applicationAction(id, action),
    onSuccess: async () => { setError(''); await client.invalidateQueries({ queryKey: categoryRuleKeys.all }); },
    onError: (cause) => setError(cause.message),
  });
  const jobs = query.data || [];
  return {
    jobs, ruleId, setRuleId, includeUnknown, setIncludeUnknown, startDate, setStartDate, endDate, setEndDate,
    error: error || query.error?.message, pending: mutation.isPending,
    active: jobs.some((job) => ['QUEUED', 'PROCESSING'].includes(job.status)),
    run: (action: 'preview' | 'confirm' | 'retry', id = ruleId) => mutation.mutate({ action, id }),
  };
}
