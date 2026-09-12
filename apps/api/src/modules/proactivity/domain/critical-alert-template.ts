import { emailFooter, escapeHtml, formatEmailMoney } from './email-template';

export function renderImminentBillEmail(input: {
  displayName: string; amount: number; currency: string; dueDate: string;
  userDisplayName?: string; appUrl: string; unsubscribeUrl: string;
}) {
  const merchant = escapeHtml(input.displayName);
  const user = escapeHtml(input.userDisplayName || 'ahorrador');
  const amount = formatEmailMoney(input.amount, input.currency);
  const footer = emailFooter(input.unsubscribeUrl, input.appUrl);
  const subject = `Tienes un cobro importante próximo • Cuadre`;
  const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:auto;background:#0b1329;border:1px solid #1e293b;border-radius:20px">
<tr><td style="padding:28px 24px;text-align:center"><div style="display:inline-block;background:#10b981;border-radius:10px;width:36px;height:36px;line-height:36px;font-weight:900">C.</div><h1 style="font-size:20px">Cobro próximo</h1></td></tr>
<tr><td style="padding:0 24px 28px"><p>Hola <strong>${user}</strong>, tienes un compromiso confirmado dentro de los próximos dos días.</p>
<div style="padding:18px;background:#131f37;border:1px solid #1e293b;border-radius:14px"><p style="margin:0;color:#94a3b8;font-size:12px">${merchant}</p><p style="margin:6px 0;font-size:26px;font-weight:900">${amount}</p><p style="margin:0;color:#cbd5e1">Fecha esperada: ${escapeHtml(input.dueDate)}</p></div>
<p style="text-align:center;margin:24px 0 0"><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:#10b981;color:white;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:12px">Revisar en Cuadre</a></p></td></tr>
<tr><td style="padding:18px 24px;text-align:center;border-top:1px solid #1e293b;font-size:11px;color:#64748b">${footer.html}</td></tr></table></body></html>`;
  const text = `Cobro próximo\n\nHola ${input.userDisplayName || 'ahorrador'}, tienes un compromiso confirmado dentro de los próximos dos días.\n\n${input.displayName}: ${amount}\nFecha esperada: ${input.dueDate}\n\nRevisar en Cuadre: ${input.appUrl}\n\n${footer.text}`;
  return { subject, html, text };
}

function renderInsight(input: {
  subject: string; title: string; eyebrow: string; description: string; detail: string;
  userDisplayName?: string; appUrl: string; unsubscribeUrl: string; cta: string;
}) {
  const footer = emailFooter(input.unsubscribeUrl, input.appUrl);
  const subject = `${input.subject} • Cuadre`;
  const html = `<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f1f5f9"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:auto;background:#0b1329;border:1px solid #1e293b;border-radius:20px"><tr><td style="padding:28px 24px;text-align:center"><div style="display:inline-block;background:#10b981;border-radius:10px;width:36px;height:36px;line-height:36px;font-weight:900">C.</div><p style="color:#10b981;font-size:11px;text-transform:uppercase;font-weight:800">${escapeHtml(input.eyebrow)}</p><h1 style="font-size:20px">${escapeHtml(input.title)}</h1></td></tr><tr><td style="padding:0 24px 28px"><p>Hola <strong>${escapeHtml(input.userDisplayName || 'ahorrador')}</strong>, ${escapeHtml(input.description)}</p><div style="padding:18px;background:#131f37;border:1px solid #1e293b;border-radius:14px;font-size:18px;font-weight:800">${escapeHtml(input.detail)}</div><p style="text-align:center;margin:24px 0 0"><a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:#10b981;color:white;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:12px">${escapeHtml(input.cta)}</a></p></td></tr><tr><td style="padding:18px 24px;text-align:center;border-top:1px solid #1e293b;font-size:11px;color:#64748b">${footer.html}</td></tr></table></body></html>`;
  const text = `${input.title}\n\nHola ${input.userDisplayName || 'ahorrador'}, ${input.description}\n\n${input.detail}\n\n${input.cta}: ${input.appUrl}\n\n${footer.text}`;
  return { subject, html, text };
}

export function renderPriceHikeEmail(input: {
  merchant: string; baseline: number; observed: number; currency: string; userDisplayName?: string; appUrl: string; unsubscribeUrl: string;
}) {
  return renderInsight({ ...input, subject: 'Detectamos un cambio en una suscripción', title: `Aumento en ${input.merchant}`,
    eyebrow: 'Cambio de precio', description: 'el último cobro superó el importe habitual.',
    detail: `Antes ${formatEmailMoney(input.baseline, input.currency)} · Ahora ${formatEmailMoney(input.observed, input.currency)}`, cta: 'Revisar cobro' });
}

export function renderPacingWarningEmail(input: {
  category: string; percentUsed: number; spent: number; limit: number; currency: string; userDisplayName?: string; appUrl: string; unsubscribeUrl: string;
}) {
  return renderInsight({ ...input, subject: 'Tu presupuesto necesita atención', title: `Ritmo alto en ${input.category}`,
    eyebrow: 'Presupuesto', description: `ya consumiste el ${Math.round(input.percentUsed)}% del presupuesto de esta categoría.`,
    detail: `${formatEmailMoney(input.spent, input.currency)} de ${formatEmailMoney(input.limit, input.currency)}`, cta: 'Revisar presupuesto' });
}

export function renderPaydayEmail(input: {
  available: number; dailyAvailable: number; futureFixed: number; currency: string; userDisplayName?: string; appUrl: string; unsubscribeUrl: string;
}) {
  return renderInsight({ ...input, subject: 'Tu ritual de quincena está listo', title: 'Alinea tu próxima quincena',
    eyebrow: 'Quincena', description: 'revisa tus compromisos y el margen libre antes de distribuir tu ingreso.',
    detail: `Disponible ${formatEmailMoney(input.available, input.currency)} · Margen diario ${formatEmailMoney(input.dailyAvailable, input.currency)} · Fijos pendientes ${formatEmailMoney(input.futureFixed, input.currency)}`, cta: 'Revisar quincena' });
}
