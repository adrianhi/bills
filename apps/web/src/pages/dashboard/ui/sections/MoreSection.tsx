import React from 'react';
import type { PeriodSelection } from '@/entities/period';
import {
  Download,
  HelpCircle,
  Lock,
  Moon,
  Settings,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { ExportCenterCard } from '@/features/export-center';
import { Button } from '@/shared/ui';

interface MoreSectionProps {
  currentPeriod: PeriodSelection;
  currency: string;
  filters: {
    category?: string;
    status?: string;
    organization?: string;
    transactionType?: string;
    search?: string;
  };
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenSettings: () => void;
  onRepeatTour: () => void;
  onOpenRules: () => void;
  onOpenExportModal: () => void;
  onLock: () => void;
}

export const MoreSection: React.FC<MoreSectionProps> = ({
  currentPeriod,
  currency,
  filters,
  darkMode,
  setDarkMode,
  onOpenSettings,
  onRepeatTour,
  onOpenRules,
  onOpenExportModal,
  onLock,
}) => {
  return (
    <>
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Control y preferencias
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Las herramientas menos frecuentes viven aquí.
        </p>
      </div>

      <ExportCenterCard
        period={currentPeriod}
        currency={currency}
        filters={filters}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          onClick={onOpenSettings}
          data-product-tour="more-tools"
          className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"
        >
          <Settings className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-bold">Conexiones y privacidad</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Gmail, exportación completa y tu cuenta
            </span>
          </span>
        </Button>

        <Button
          variant="outline"
          onClick={onRepeatTour}
          className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"
        >
          <HelpCircle className="h-5 w-5 text-emerald-500" />
          <span>
            <span className="block font-bold">Repetir recorrido</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Vuelve a conocer las secciones principales
            </span>
          </span>
        </Button>

        <Button
          variant="outline"
          onClick={onOpenRules}
          className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"
        >
          <SlidersHorizontal className="h-5 w-5 text-amber-500" />
          <span>
            <span className="block font-bold">Reglas de categorías</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Automatiza cómo se organizan tus gastos
            </span>
          </span>
        </Button>

        <Button
          variant="outline"
          onClick={onOpenExportModal}
          className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"
        >
          <Download className="h-5 w-5 text-sky-500" />
          <span>
            <span className="block font-bold">Exportar datos</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Excel con 5 pestañas, CSV, PDF o JSON
            </span>
          </span>
        </Button>

        <Button
          variant="outline"
          onClick={() => setDarkMode(!darkMode)}
          className="h-auto min-h-20 justify-start gap-3 rounded-2xl p-4 text-left"
        >
          {darkMode ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-500" />
          )}
          <span>
            <span className="block font-bold">
              {darkMode ? 'Usar tema claro' : 'Usar tema oscuro'}
            </span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Ajusta la apariencia a tu entorno
            </span>
          </span>
        </Button>
      </div>

      <Button
        variant="ghost"
        onClick={onLock}
        className="min-h-11 w-full gap-2 text-muted-foreground sm:w-auto"
      >
        <Lock className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </>
  );
};
