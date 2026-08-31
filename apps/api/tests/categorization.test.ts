import { describe, it, expect } from 'vitest';
import { CategorizationService } from '../src/modules/categorization/infrastructure/categorization.service';

describe('Categorization and Normalization Service', () => {
  it('should clean raw merchant prefixes', () => {
    expect(CategorizationService.cleanRawMerchant('SM BRAVO CHURCHILL')).toBe('BRAVO CHURCHILL');
    expect(CategorizationService.cleanRawMerchant('EST TOTALENERGIES NITA')).toBe('TOTALENERGIES NITA');
    expect(CategorizationService.cleanRawMerchant('FARM CAROL EVARISTO')).toBe('CAROL EVARISTO');
  });

  it('should correctly normalize and categorize Dominican Supermarkets', async () => {
    const r1 = await CategorizationService.categorize('SM BRAVO LAS AMERICAS');
    expect(r1.merchant).toBe('Supermercados Bravo');
    expect(r1.category).toBe('Supermercado');

    const r2 = await CategorizationService.categorize('SUPERMERCADOS NACIONAL LOPE DE VEGA');
    expect(r2.merchant).toBe('Supermercados Nacional');
    expect(r2.category).toBe('Supermercado');

    const r3 = await CategorizationService.categorize('JUMBO LUPERON');
    expect(r3.merchant).toBe('Jumbo');
    expect(r3.category).toBe('Supermercado');

    const r4 = await CategorizationService.categorize('LA SIRENA CHURCHILL');
    expect(r4.merchant).toBe('La Sirena');
    expect(r4.category).toBe('Supermercado');

    const r5 = await CategorizationService.categorize('HIPERMERCADOS OLE SAN ISIDRO');
    expect(r5.merchant).toBe('Hipermercados Olé');
    expect(r5.category).toBe('Supermercado');
  });

  it('should correctly normalize Food & Delivery', async () => {
    const r1 = await CategorizationService.categorize('PEDIDOSYA *PIZZA');
    expect(r1.merchant).toBe('PedidosYa');
    expect(r1.category).toBe('Restaurantes & Delivery');

    const r2 = await CategorizationService.categorize('UBER EATS RESTAURANT');
    expect(r2.merchant).toBe('Uber Eats');
    expect(r2.category).toBe('Restaurantes & Delivery');

    const r3 = await CategorizationService.categorize('MCDONALDS TIRADENTES');
    expect(r3.merchant).toBe("McDonald's");
    expect(r3.category).toBe('Restaurantes & Delivery');
  });

  it('should correctly normalize Transport & Fuel', async () => {
    const r1 = await CategorizationService.categorize('UBER *TRIP HELP.UBER.COM');
    expect(r1.merchant).toBe('Uber');
    expect(r1.category).toBe('Transporte');

    const r2 = await CategorizationService.categorize('INDRIVE SANTO DOMINGO');
    expect(r2.merchant).toBe('InDrive');
    expect(r2.category).toBe('Transporte');

    const r3 = await CategorizationService.categorize('TOTALENERGIES 27 DE FEBRERO');
    expect(r3.merchant).toBe('TotalEnergies');
    expect(r3.category).toBe('Combustible');

    const r4 = await CategorizationService.categorize('ESTACION SUNIX LINCOLN');
    expect(r4.merchant).toBe('Sunix');
    expect(r4.category).toBe('Combustible');
  });

  it('should correctly normalize Health, Pharmacy & Services', async () => {
    const r1 = await CategorizationService.categorize('FARMACIA CAROL PIANTINI');
    expect(r1.merchant).toBe('Farmacia Carol');
    expect(r1.category).toBe('Salud & Farmacia');

    const r2 = await CategorizationService.categorize('CLARO DOMINICANA PAGOS');
    expect(r2.merchant).toBe('Claro Dominicana');
    expect(r2.category).toBe('Servicios');

    const r3 = await CategorizationService.categorize('EDEESTE FACTURACION');
    expect(r3.merchant).toBe('EdeEste');
    expect(r3.category).toBe('Servicios');
  });

  it('should correctly normalize Subscriptions & Tech', async () => {
    const r1 = await CategorizationService.categorize('NETFLIX.COM');
    expect(r1.merchant).toBe('Netflix');
    expect(r1.category).toBe('Suscripciones');

    const r2 = await CategorizationService.categorize('OPENAI *CHATGPT SUBSCRIPTION');
    expect(r2.merchant).toBe('OpenAI (ChatGPT)');
    expect(r2.category).toBe('Tecnología');
  });

  it('should respect explicit category if passed by caller', async () => {
    const r = await CategorizationService.categorize('SOME RANDOM STORE', 'Custom Store Name', 'Gastos Personales');
    expect(r.merchant).toBe('Custom Store Name');
    expect(r.category).toBe('Gastos Personales');
  });
});
