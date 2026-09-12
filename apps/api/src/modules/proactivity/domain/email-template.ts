export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] || character);
}

export function formatEmailMoney(amount: number, currency: string): string {
  const formatted = Math.abs(amount).toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${currency} ${formatted}`;
}

export function emailFooter(unsubscribeUrl?: string, preferencesUrl?: string): { html: string; text: string } {
  const preferences = preferencesUrl
    ? `<br><a href="${escapeHtml(preferencesUrl)}" style="color:#94a3b8;text-decoration:underline">Administrar preferencias</a>`
    : '';
  const unsubscribe = unsubscribeUrl
    ? `<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;text-decoration:underline">Dejar de recibir este tipo de correo</a>`
    : '';
  return {
    html: `Este correo fue generado automáticamente por Cuadre.${preferences}${unsubscribe}`,
    text: `Este correo fue generado automáticamente por Cuadre.${preferencesUrl ? `\nAdministrar preferencias: ${preferencesUrl}` : ''}${unsubscribeUrl ? `\nCancelar este tipo de correo: ${unsubscribeUrl}` : ''}`,
  };
}
