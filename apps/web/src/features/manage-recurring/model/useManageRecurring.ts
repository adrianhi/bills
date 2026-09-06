import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateRecurringBillInput } from '@bills/contracts';
import { recurringKeys, recurringService } from '@/entities/recurring-bill';
import { budgetKeys } from '@/entities/budget';

export function useManageRecurring(currency: string) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: recurringKeys.all }),
      queryClient.invalidateQueries({ queryKey: budgetKeys.safeToSpend(currency) }),
    ]);
  };
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRecurringBillInput }) => recurringService.update(id, input),
    onSuccess: refresh,
  });
  const acknowledge = useMutation({
    mutationFn: recurringService.acknowledgeAlert,
    onSuccess: refresh,
  });
  return { update, acknowledge };
}
