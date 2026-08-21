import { describe, it, expect } from 'vitest';
import path from 'path';

// @ts-ignore
const { parseBhdNotification, parseBhdDate, parseAmount } = require(path.resolve(__dirname, '../../../n8n/bhd-parser-code-node.js'));

describe('Banco BHD Multi-Type Parser Engine', () => {
  it('should parse Sent Transfer: RD$ 2,500.00 to COLEGIO LOYOLA with exact date', () => {
    const rawHtml = `
      <table align="center" style="color:#666666;font-family:'Trebuchet MS', Helvetica, sans-serif !important;" width="650"><tbody><tr><td style="padding:20px 20px 15px;"><p>Estimado(a):&nbsp;<strong>ADRIAN JOEL HIDALGO</strong></p></td></tr><tr><td style="padding:5px 20px 25px;"><p style="font-size:14px;">A continuaci&oacute;n la informaci&oacute;n relacionada a tu transacci&oacute;n:</p></td></tr><tr><td style="padding:5px 20px 15px;"><table style="color:#33495f;"><tbody><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;" width="40%"><p>Producto origen:</p></td><td id="idProductoOrigen" style="font-size:14px;padding:0px 100px 15px 5px;" width="60%"><p><strong>DO60BCBH000000000XXXXXXX0016</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Producto destino:</p></td><td id="idProductoDestino" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>XXXXXX4027</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Descripci&oacute;n:</p></td><td id="idDescripcion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong></strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Monto:</p></td><td id="idMonto" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>RD$ 2,500.00</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Beneficiario:</p></td><td id="idBeneficiario" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>COLEGIO LOYOLA</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>N&uacute;mero de confirmaci&oacute;n:</p></td><td id="idNumeroConfirmacion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>M10-1787-1613-5982-7</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Fecha y hora de la transacci&oacute;n:</p></td><td id="idFechayHoraTransaccion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>19/08/2026 - 1:42 PM</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;vertical-align:top;"><p>Tipo de transacci&oacute;n:</p></td><td id="idTipoTransaccion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>Transacciones entre productos BHD y a otros Bancos</strong></p></td></tr></tbody></table></td></tr></tbody></table>
    `;

    const result = parseBhdNotification({
      id: '1a01b1e4187ff798',
      date: '2026-08-19T17:42:41.000Z',
      html: rawHtml,
    });

    expect(result).not.toBeNull();
    expect(result.merchant).toBe('Colegio Loyola');
    expect(result.amount).toBe(2500.0);
    expect(result.currency).toBe('DOP');
    expect(result.cardLast4).toBe('0016');
    expect(result.externalId).toBe('bhd_conf_M101787161359827');
    expect(result.transactionType).toBe('Transferencia entre Cuentas');
    expect(result.category).toBe('Transferencias');
    // Verify AST date (1:42 PM AST -> 17:42 UTC)
    const d = new Date(result.transactionDate);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(7); // August
    expect(d.getUTCDate()).toBe(19);
    expect(d.getUTCHours()).toBe(17);
    expect(d.getUTCMinutes()).toBe(42);
  });

  it('should parse Received Instant Transfer: RD$ 200.00 from LUIS RAFAEL NUNEZ MINOSO', () => {
    const rawHtml = `
      <table align="center" style="color:#666666;font-family:'Trebuchet MS', Helvetica, sans-serif !important;" width="650"><tbody><tr style=""><td style="padding:5px 20px 25px 20px;"><p style="font-size:14px;"><span style="font-size:10.5pt;line-height:107%;font-family:'Calibri',sans-serif;color:#666666;">Has recibido una transferencia de Pago al Instante. A continuaci&oacute;n, el detalle de la transacci&oacute;n:</span> </p></td></tr><tr style=""><td style="padding:5px 20px 15px 20px;"><table style="color:#33495f;"><tbody style=""><tr style=""><td style="text-align:right;font-size:14px;padding:0px 0px 15px;" width="40%"><p>Producto :</p></td><td id="idProductoOrigen" style="text-align:left;font-size:14px;padding:0 100px 15px 5px;" width="60%"><p>DO60BCBHXXXXXXXXXXXXXXXX0016</p></td></tr><tr style=""><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Tipo de producto:</p></td><td id="idMonto" style="text-align:left;font-size:14px;padding:0 100px 15px 5px;"><p>CUENTA DE AHORRO</p></td></tr><tr style=""><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Banco Origen:</p></td><td id="idNumeroConfirmacion" style="text-align:left;font-size:14px;padding:0 100px 15px 5px;"><p>BANCO DE RESERVAS DE LA REPUBLICA DOMINICANA<br /></p></td></tr><tr style=""><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Ordenante:</p></td><td id="idDescripcion" style="text-align:left;font-size:14px;padding:0 100px 15px 5px;"><p>LUIS RAFAEL NUNEZ MINOSO<br /></p></td></tr><tr style=""><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Monto:</p></td><td id="idDescripcion" style="text-align:left;font-size:14px;padding:0 100px 15px 5px;\">RD$200.00</td></tr><tr style=""><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p><span style="color:#33495f;font-family:'Trebuchet MS', Helvetica, sans-serif;font-size:14px;text-align:right;\">Fecha y hora de la transacci&oacute;n:</span></p></td><td id="idNumeroConfirmacion" style="text-align:left;font-size:14px;padding:0 100px 15px 5px;"><p><span style="color:#33495f;font-family:'Trebuchet MS', Helvetica, sans-serif;font-size:14px;\">19/08/2026&nbsp;</span>01:26 PM</p></td></tr></tbody></table></td></tr></tbody></table>
    `;

    const result = parseBhdNotification({
      id: '1a01b0f7e6e454e0',
      date: '2026-08-19T17:26:34.000Z',
      html: rawHtml,
    });

    expect(result).not.toBeNull();
    expect(result.merchant).toBe('Luis Rafael Nunez Minoso');
    expect(result.amount).toBe(200.0);
    expect(result.cardLast4).toBe('0016');
    expect(result.transactionType).toBe('Transferencia Recibida');
    expect(result.category).toBe('Ingresos / Transferencias');
    const d = new Date(result.transactionDate);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(7);
    expect(d.getUTCDate()).toBe(19);
    expect(d.getUTCHours()).toBe(17);
    expect(d.getUTCMinutes()).toBe(26);
  });

  it('should parse Service Bill Payment: RD$ 200 to CLARO', () => {
    const rawHtml = `
      <table align="center" style="color:#666666;font-family:'Trebuchet MS', Helvetica, sans-serif !important;" width="650"><tbody><tr><td style="padding:5px 20px;"><p>Has realizado exitosamente el pago de un servicio.</p></td></tr><tr><td style="padding:5px 20px 15px;"><table style="color:#33495f;"><tbody><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;" width="40%"><p>Producto origen:</p></td><td id="idProductoOrigen" style="font-size:14px;padding:0px 100px 15px 5px;" width="60%"><p><strong>DO60BCBH000000000XXXXXXX0016</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Monto:</p></td><td id="idMonto" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>RD$ 200</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Proveedor del servicio:</p></td><td id="idDescripcion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>CLARO</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Servicio:</p></td><td id="idDescripcion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>Compra de Recargas</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>N&uacute;mero de confirmaci&oacute;n:</p></td><td id="idNumeroConfirmacion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>M20-1786-7169-4244-7</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;"><p>Fecha y hora de la transacci&oacute;n:</p></td><td id="idFechayHoraTransaccion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>14/08/2026 |&nbsp;</strong><strong>10:15 AM</strong></p></td></tr><tr><td style="text-align:right;font-size:14px;padding:0px 0px 15px;vertical-align:top;"><p>Tipo de transacci&oacute;n:</p></td><td id="idTipoTransaccion" style="font-size:14px;padding:0px 100px 15px 5px;"><p><strong>Pago de Servicio e Impuestos</strong></p></td></tr></tbody></table></td></tr></tbody></table>
    `;

    const result = parseBhdNotification({
      id: '1a000a10338919a4',
      date: '2026-08-14T14:15:46.000Z',
      html: rawHtml,
    });

    expect(result).not.toBeNull();
    expect(result.merchant).toBe('Claro');
    expect(result.amount).toBe(200.0);
    expect(result.category).toBe('Servicios');
    expect(result.externalId).toBe('bhd_serv_M201786716942447');
    const d = new Date(result.transactionDate);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(7);
    expect(d.getUTCDate()).toBe(14);
    expect(d.getUTCHours()).toBe(14);
    expect(d.getUTCMinutes()).toBe(15);
  });

  it('should ignore promotional emails like EVA virtual assistant', () => {
    const rawHtml = `
      <html><body><p>Conoce a EVA, tu nueva agente virtual BHD</p></body></html>
    `;

    const result = parseBhdNotification({
      id: '1a01136649cd61e8',
      date: '2026-08-17T19:30:57.000Z',
      html: rawHtml,
    });

    expect(result).toBeNull();
  });
});
