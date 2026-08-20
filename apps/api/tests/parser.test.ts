import { describe, it, expect } from 'vitest';
// @ts-ignore
const { parseBhdNotification, parseBhdDate, parseAmount } = require('../n8n/bhd-parser-code-node.js');

describe('Banco BHD Parser Engine', () => {
  describe('parseAmount', () => {
    it('should parse DOP Dominican pesos format correctly', () => {
      expect(parseAmount('$1,530.00')).toBe(1530);
      expect(parseAmount('$287.00')).toBe(287);
    });

    it('should parse USD dollars format correctly', () => {
      expect(parseAmount('$45.50')).toBe(45.5);
    });
  });

  describe('parseBhdDate', () => {
    it('should parse Dominican format DD/MM/YYYY hh:mm AM/PM to ISO-8601', () => {
      const iso = parseBhdDate('18/08/2026 07:14 pm');
      expect(iso).toBeDefined();
      const date = new Date(iso);
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(7); // August is index 7
      expect(date.getUTCDate()).toBe(18);
    });
  });

  describe('Real Banco BHD Email Screenshots', () => {
    it('should parse Screenshot 1: 287.00 DOP at Bravo Las Americas', () => {
      const emailHtml = `
        <div>
          <h2>BHD Notificación de Transacciones</h2>
          <p>Visa Débito Intl # 0380</p>
          <p>Detalle de Criterios</p>
          <p>Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 0380</p>
          <p>Detalle de Transacciones</p>
          <table>
            <tr>
              <td>Fecha</td>
              <td>Moneda</td>
              <td>Monto</td>
              <td>Comercio</td>
              <td>Estado</td>
              <td>Tipo</td>
            </tr>
            <tr>
              <td>17/08/2026 11:49 pm</td>
              <td>RD</td>
              <td>$287.00</td>
              <td>SM BRAVO LAS AMERICAS</td>
              <td>Aprobada</td>
              <td>Compra</td>
            </tr>
          </table>
        </div>
      `;

      const result = parseBhdNotification({
        id: 'msg_287',
        messageId: 'msg_bhd_287',
        textHtml: emailHtml,
      });

      expect(result.externalId).toBe('msg_bhd_287');
      expect(result.cardLast4).toBe('0380');
      expect(result.rawMerchant).toBe('SM BRAVO LAS AMERICAS');
      expect(result.amount).toBe(287.0);
      expect(result.currency).toBe('DOP');
      expect(result.status).toBe('Aprobada');
      expect(result.transactionType).toBe('Compra');
    });

    it('should parse Screenshot 2: 1,530.00 DOP at Bravo Las Americas', () => {
      const emailHtml = `
        <div>
          <h2>BHD Notificación de Transacciones</h2>
          <p>Visa Débito Intl # 0380</p>
          <p>Detalle de Criterios</p>
          <p>Te notificamos la transacción realizada con tu Tarjeta Visa Débito Intl # 0380</p>
          <p>Detalle de Transacciones</p>
          <table>
            <tr>
              <td>Fecha</td>
              <td>Moneda</td>
              <td>Monto</td>
              <td>Comercio</td>
              <td>Estado</td>
              <td>Tipo</td>
            </tr>
            <tr>
              <td>18/08/2026 07:14 pm</td>
              <td>RD</td>
              <td>$1,530.00</td>
              <td>SM BRAVO LAS AMERICAS</td>
              <td>Aprobada</td>
              <td>Compra</td>
            </tr>
          </table>
        </div>
      `;

      const result = parseBhdNotification({
        id: 'msg_1530',
        messageId: 'msg_bhd_1530',
        textHtml: emailHtml,
      });

      expect(result.externalId).toBe('msg_bhd_1530');
      expect(result.cardLast4).toBe('0380');
      expect(result.rawMerchant).toBe('SM BRAVO LAS AMERICAS');
      expect(result.amount).toBe(1530.0);
      expect(result.currency).toBe('DOP');
      expect(result.status).toBe('Aprobada');
      expect(result.transactionType).toBe('Compra');
    });
  });
});
