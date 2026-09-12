import type { RecurringBillDto, WeeklyCheckinDto } from '@bills/contracts';

export interface WeeklyDigestTemplateInput {
  checkin: WeeklyCheckinDto;
  upcomingBills: RecurringBillDto[];
  userDisplayName?: string;
  appUrl?: string;
}

function formatMoney(amount: number, currency: string): string {
  const formatted = Math.abs(amount).toLocaleString('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function renderWeeklyDigestHtml(input: WeeklyDigestTemplateInput): {
  subject: string;
  html: string;
} {
  const c = input.checkin;
  const currency = c.currency;
  const name = input.userDisplayName || 'ahorrador';
  const appUrl = input.appUrl || 'http://localhost:3000';

  const diffText =
    c.changePercent !== null
      ? c.changePercent <= 0
        ? `🟢 Gastaste un ${Math.abs(c.changePercent)}% menos que la semana anterior.`
        : `🟠 Gastaste un ${c.changePercent}% más que la semana anterior.`
      : 'Ritmo estable comparado con la semana anterior.';

  const subject = `Tu Pulso Semanal (${c.startDate} al ${c.endDate}) • Cuadre`;

  const billsRows = input.upcomingBills.length > 0
    ? input.upcomingBills
        .slice(0, 4)
        .map(
          (b) => `
        <tr style="border-bottom: 1px solid #1e293b;">
          <td style="padding: 10px 0; font-size: 13px; color: #f1f5f9; font-weight: 600;">${b.displayName}</td>
          <td style="padding: 10px 0; font-size: 12px; color: #94a3b8; text-align: center;">${b.nextExpectedDate || 'Próximamente'}</td>
          <td style="padding: 10px 0; font-size: 13px; color: #10b981; font-weight: 700; text-align: right;">${formatMoney(b.expectedAmount, b.currency)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="3" style="padding: 12px 0; font-size: 12px; color: #94a3b8; text-align: center;">No tienes cobros fijos programados para los próximos 7 días.</td></tr>`;

  const topCategoryHtml = c.topCategory
    ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Categoría con más gasto: <strong style="color: #f1f5f9;">${c.topCategory.name}</strong> (${formatMoney(c.topCategory.amount, currency)} · ${c.topCategory.percentage}%)</p>`
    : '';

  const topMerchantHtml = c.topMerchant
    ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Comercio frecuente: <strong style="color: #f1f5f9;">${c.topMerchant.name}</strong> (${formatMoney(c.topMerchant.amount, currency)})</p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto; background-color: #0b1329; border-radius: 20px; border: 1px solid #1e293b; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 28px 24px 20px 24px; text-align: center; border-bottom: 1px solid #1e293b; background: linear-gradient(180deg, #111e38 0%, #0b1329 100%);">
        <div style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 900; font-size: 18px; width: 36px; height: 36px; line-height: 36px; border-radius: 10px; margin-bottom: 8px;">b.</div>
        <h1 style="margin: 4px 0 2px 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Tu Pulso Semanal</h1>
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">Semana del ${c.startDate} al ${c.endDate}</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 18px 0; font-size: 14px; color: #cbd5e1;">Hola <strong>${name}</strong>, aquí tienes el resumen de tu dinero de esta semana:</p>

        <!-- Card 1: Gasto Semanal -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #131f37; border-radius: 14px; border: 1px solid #1e293b; margin-bottom: 16px;">
          <tr>
            <td style="padding: 16px;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #94a3b8;">Ritmo de Gasto Semanal</span>
              <div style="font-size: 26px; font-weight: 900; color: #ffffff; margin: 6px 0 4px 0;">${formatMoney(c.totalSpentThisWeek, currency)}</div>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">${diffText}</p>
            </td>
          </tr>
        </table>

        <!-- Card 2: Destino del Dinero -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #131f37; border-radius: 14px; border: 1px solid #1e293b; margin-bottom: 16px;">
          <tr>
            <td style="padding: 16px;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #94a3b8;">¿Dónde se fue el dinero?</span>
              ${topCategoryHtml}
              ${topMerchantHtml}
            </td>
          </tr>
        </table>

        <!-- Card 3: Próximos Cobros Fijos (7 días) -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #131f37; border-radius: 14px; border: 1px solid #1e293b; margin-bottom: 16px;">
          <tr>
            <td style="padding: 16px;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #94a3b8;">Cobros fijos de los próximos 7 días</span>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                ${billsRows}
              </table>
            </td>
          </tr>
        </table>

        <!-- Card 4: Brújula a la Quincena -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #10b98115; border-radius: 14px; border: 1px solid #10b98130; margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #10b981;">Brújula hacia el próximo corte</span>
              <div style="margin-top: 6px; font-size: 13px; color: #f1f5f9;">
                Faltan <strong>${c.daysToNextPayday} días</strong>. Margen diario recomendado:
                <div style="font-size: 20px; font-weight: 900; color: #10b981; margin-top: 2px;">${formatMoney(c.estimatedDailyAllowance, currency)} / día</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <div style="text-align: center; margin-bottom: 12px;">
          <a href="${appUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">Abrir Cuadre</a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 24px 24px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
        Este es tu resumen financiero automatizado generado por Cuadre.<br>
        Tus datos bancarios y personales están protegidos con cifrado de extremo a extremo.
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
