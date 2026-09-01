export const COMMON_CATEGORIES = [
  'Supermercado', 'Restaurantes & Delivery', 'Servicios Financieros',
  'Transferencias', 'Transporte', 'Combustible',
  'Servicios', 'Suscripciones', 'Salud & Farmacia', 'Compras Online',
  'Hogar', 'Ropa & Moda', 'Entretenimiento', 'Tecnología', 'Otros',
] as const;

export const FINANCIAL_INSTITUTIONS = [
  { id: 'BHD', label: '🟢 Banco BHD', source: 'BHD_MANUAL' },
  { id: 'POPULAR', label: '🔵 Banco Popular', source: 'POPULAR_MANUAL' },
  { id: 'BANRESERVAS', label: '🔷 Banreservas', source: 'BANRESERVAS_MANUAL' },
  { id: 'QIK', label: '🟣 Qik Banco Digital', source: 'QIK_MANUAL' },
  { id: 'APAP', label: '🟠 APAP', source: 'APAP_MANUAL' },
  { id: 'SCOTIABANK', label: '🔴 Scotiabank', source: 'SCOTIABANK_MANUAL' },
  { id: 'MANUAL', label: '⚪ Manual / Efectivo', source: 'MANUAL' },
] as const;
