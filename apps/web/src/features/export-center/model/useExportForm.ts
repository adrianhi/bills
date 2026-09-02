import { useCallback, useEffect, useState } from 'react';
import { canIncludeBudget, createExportForm, exportFormError, selectedReportPeriod, type ExportFormInitial, type ExportFormState } from './export-form';

export function useExportForm({ open, initialPeriod, initialCurrency, initialFilters }: ExportFormInitial & { open: boolean }) {
  const [state, setState] = useState(() => createExportForm({ initialPeriod, initialCurrency, initialFilters }));
  const { category, status, organization, transactionType, search } = initialFilters || {};
  const { month, startDate, endDate, label } = initialPeriod || {};

  useEffect(() => {
    if (!open) return;
    const snapshot = createExportForm({
      initialCurrency,
      initialPeriod: label !== undefined ? { month, startDate, endDate, label } : undefined,
      initialFilters: { category, status, organization, transactionType, search },
    });
    // Opening captures dashboard filters while preserving the user's report preferences.
    // oxlint-disable-next-line react/set-state-in-effect
    setState((current) => ({ ...snapshot, format: current.format, title: current.title, sections: current.sections, includeNotes: current.includeNotes }));
  }, [open, initialCurrency, month, startDate, endDate, label, category, status, organization, transactionType, search]);

  const setField = useCallback(<K extends keyof ExportFormState>(key: K, value: ExportFormState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  }, []);
  const period = selectedReportPeriod(state, initialPeriod);
  return { state, period, setField, budgetEligible: canIncludeBudget(state, period), validationError: exportFormError(state, period) };
}
