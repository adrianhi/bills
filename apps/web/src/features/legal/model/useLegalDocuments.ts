import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { legalService, type LegalDocument } from '../api/legal.service';

export function useLegalDocuments(scope: 'public' | 'user', enabled = true) {
  return useQuery({
    queryKey: ['legal', scope],
    queryFn: ({ signal }) => scope === 'public' ? legalService.listPublic(signal) : legalService.listForUser(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useAcceptLegal(onAccepted: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documents: LegalDocument[]) => legalService.accept(documents),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['legal'] });
      onAccepted();
    },
  });
}
