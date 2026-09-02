export type TourSection = 'home' | 'transactions' | 'analytics' | 'budget';
export type TourDirection = 'forward' | 'backward';
export type TourPhase = 'exiting' | 'navigating' | 'locating' | 'scrolling' | 'settled';

export interface TourStep {
  section: TourSection;
  target: string;
  title: string;
  description: string;
}

export const PRODUCT_TOUR_STEPS: readonly TourStep[] = [
  {
    section: 'home',
    target: 'connection-health',
    title: 'Tu conexión, siempre clara',
    description: 'Aquí sabrás si Gmail está actualizado, importando o necesita atención. Tus movimientos guardados no se pierden.',
  },
  {
    section: 'home',
    target: 'period',
    title: 'Mira el período que te importa',
    description: 'Cambia fechas y moneda para que el resumen muestre exactamente lo que quieres analizar.',
  },
  {
    section: 'transactions',
    target: 'transactions',
    title: 'Encuentra cualquier movimiento',
    description: 'Busca y filtra por banco, tipo, categoría o estado. Toca un registro para corregir su información.',
  },
  {
    section: 'transactions',
    target: 'new-movement',
    title: 'Añade lo que falte',
    description: 'Este botón registra movimientos manuales. El recorrido no abrirá el formulario ni creará datos.',
  },
  {
    section: 'analytics',
    target: 'analytics',
    title: 'Detecta patrones',
    description: 'Compara categorías y días para entender cómo cambia tu gasto durante el período elegido.',
  },
  {
    section: 'budget',
    target: 'budget-overview',
    title: 'Decide antes de gastar',
    description: 'Define límites mensuales y revisa si tus categorías siguen dentro del ritmo que elegiste.',
  },
] as const;
