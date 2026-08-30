import { useMutation } from '@tanstack/react-query';
import type { ProductGuideState } from '@bills/contracts';
import { accountService } from '@/entities/account/api/account.service';

export function useProductGuide(onChange: (state: ProductGuideState) => void) {
  const mutation = useMutation({
    mutationFn: accountService.updateProductGuide,
    onSuccess: onChange,
  });
  return {
    saving: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : '',
    save: mutation.mutateAsync,
  };
}
