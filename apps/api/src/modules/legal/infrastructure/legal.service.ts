import crypto from 'crypto';
import type { LegalAcceptanceSource, LegalDocumentType } from '@prisma/client';
import { config } from '../../../config';
import { prisma } from '../../../config/database';
import { AppError } from '../../../errors/app-error';

export const CURRENT_LEGAL_VERSION = '2026-08-28.1';
export const GOOGLE_DISCLOSURE_VERSION = '2026-08-28.1';
export const REQUIRED_LEGAL_TYPES: LegalDocumentType[] = ['TERMS', 'PRIVACY'];

interface LegalTemplate {
  type: LegalDocumentType;
  version: string;
  locale: string;
  title: string;
  slug: string;
  effectiveAt: Date;
  content: string;
}

function provider() {
  return {
    name: config.legalProviderName || 'Responsable de bills. (beta)',
    id: config.legalProviderId || 'Identificación disponible por el canal de contacto',
    email: config.legalContactEmail || 'privacidad@bills.do',
    address: config.legalContactAddress || 'Santo Domingo, República Dominicana',
  };
}

function templates(): LegalTemplate[] {
  const owner = provider();
  return [
    {
      type: 'TERMS',
      version: CURRENT_LEGAL_VERSION,
      locale: 'es-DO',
      title: 'Términos y condiciones de uso',
      slug: 'terms',
      effectiveAt: new Date('2026-08-28T00:00:00.000Z'),
      content: `# Términos y condiciones de uso

Vigentes desde el 28 de agosto de 2026. bills. es operado por ${owner.name}, identificación ${owner.id}, con domicilio de contacto en ${owner.address} y correo ${owner.email}.

## Servicio
bills. es una aplicación beta de organización y analítica financiera personal. Importa notificaciones autorizadas por el usuario, normaliza movimientos y presenta métricas informativas. No es un banco, entidad financiera, contador, asesor fiscal ni asesor de inversión. Los registros oficiales de la entidad bancaria prevalecen y el usuario debe verificar cualquier diferencia.

## Elegibilidad y cuenta
El servicio está dirigido a personas de 18 años o más en República Dominicana. El usuario debe proporcionar información correcta, proteger su sesión y conectar únicamente cuentas de correo propias o que esté autorizado a gestionar.

## Uso permitido
No se permite acceder a datos de terceros sin autorización, interferir con la seguridad, automatizar abuso, intentar eludir límites ni utilizar bills. para fraude o actividades contrarias a la ley.

## Beta, disponibilidad y cambios
La beta puede contener errores, interrupciones o parsers incompletos. Podemos corregir, limitar o suspender funciones por seguridad, mantenimiento o incumplimiento. Los cambios materiales a estos términos serán informados y requerirán nueva aceptación; no se aplicarán de forma discriminatoria.

## Terceros
El servicio depende de proveedores como Google, Supabase, Resend y las entidades emisoras de notificaciones. bills. no está afiliado ni respaldado por BHD, Qik u otro banco salvo acuerdo expreso. Cada tercero mantiene sus propios términos.

## Responsabilidad
bills. aplicará cuidado razonable en la prestación del servicio. En la medida permitida por la legislación aplicable, no responde por decisiones tomadas exclusivamente a partir de métricas informativas, interrupciones de terceros o datos bancarios incorrectos. Nada en estos términos excluye derechos irrenunciables del consumidor ni responsabilidad que legalmente no pueda limitarse.

## Propiedad intelectual
El usuario recibe una licencia personal, revocable y no transferible para utilizar la aplicación. La marca, interfaz y software permanecen bajo titularidad de sus respectivos propietarios. Los datos financieros del usuario no se convierten en propiedad de bills.

## Terminación y eliminación
El usuario puede desconectar Gmail o eliminar su cuenta. Podemos suspender acceso ante riesgo de seguridad o incumplimiento, procurando notificar cuando sea razonable. La eliminación se ejecuta conforme a la política publicada.

## Reclamaciones y ley aplicable
Las consultas y reclamaciones pueden enviarse a ${owner.email}. Se intentará una solución directa y el usuario conserva sus derechos ante Pro Consumidor y los tribunales competentes de República Dominicana. No se impone arbitraje exclusivo.
`,
    },
    {
      type: 'PRIVACY',
      version: CURRENT_LEGAL_VERSION,
      locale: 'es-DO',
      title: 'Política de privacidad',
      slug: 'privacy',
      effectiveAt: new Date('2026-08-28T00:00:00.000Z'),
      content: `# Política de privacidad

El responsable del tratamiento es ${owner.name}. Contacto: ${owner.email}. Domicilio: ${owner.address}.

## Datos tratados
Tratamos datos de cuenta y perfil, identificadores de sesión, bancos detectados, movimientos financieros normalizados, reglas de categorización, estado de conexiones, registros técnicos y evidencia de consentimientos. Con autorización separada de Gmail, consultamos mensajes de remitentes bancarios soportados y los datos mínimos necesarios para identificar movimientos.

## Finalidades
Usamos los datos para crear la cuenta, importar y clasificar movimientos, mostrar analítica, prevenir duplicados y abuso, mantener seguridad, atender solicitudes y mejorar la precisión de los parsers con información anonimizada o autorizada.

## Minimización y retención
El cuerpo de un correo procesado correctamente no se conserva. Un mensaje que no pueda procesarse puede conservarse cifrado por hasta 7 días para diagnóstico y recuperación controlada y luego se purga. Los tokens OAuth se almacenan cifrados y se eliminan al revocar la conexión o borrar la cuenta. Los datos normalizados permanecen mientras la cuenta esté activa. Las copias de respaldo cifradas pueden conservar datos eliminados por hasta 30 días antes de expirar y no se utilizan para reactivar una cuenta eliminada.

## Proveedores y transferencias
Podemos utilizar Google, Supabase, Resend, infraestructura de hosting y monitoreo como encargados tecnológicos. Esto puede implicar procesamiento fuera de República Dominicana. Se limita el acceso por finalidad, configuración contractual y controles de seguridad.

## Venta, publicidad y acceso humano
No vendemos datos personales o financieros ni usamos datos de Gmail para publicidad. El acceso humano a contenido de correo se restringe a seguridad, cumplimiento o soporte solicitado por el titular, cuando sea indispensable y esté permitido por la ley y las políticas de Google.

## Seguridad
Aplicamos cifrado de secretos, HTTPS en producción, separación por workspace, control de acceso, registros minimizados, rotación de credenciales y pruebas de aislamiento. Ningún sistema es infalible; investigaremos incidentes y notificaremos cuando corresponda.

## Derechos
El titular puede solicitar acceso, corrección, actualización, oposición o eliminación escribiendo a ${owner.email} después de verificar su identidad. bills. atenderá acceso dentro del plazo legal aplicable y las rectificaciones o supresiones procedentes dentro de un máximo operativo de 10 días hábiles, salvo obligación legal de conservación.

## Gmail y revocación
Conectar Gmail es opcional y separado del inicio de sesión. El usuario puede revocar la conexión desde bills. o desde su cuenta de Google. Revocar detiene nuevas sincronizaciones sin borrar automáticamente transacciones ya importadas; la cuenta completa puede eliminarse por separado.

## Menores y cambios
No está dirigido a menores de 18 años. Los cambios materiales se comunicarán y, cuando corresponda, requerirán nueva aceptación.
`,
    },
    {
      type: 'GOOGLE_API_DISCLOSURE',
      version: GOOGLE_DISCLOSURE_VERSION,
      locale: 'es-DO',
      title: 'Divulgación de acceso a Gmail',
      slug: 'google-api-disclosure',
      effectiveAt: new Date('2026-08-28T00:00:00.000Z'),
      content: `# Divulgación de acceso a Gmail

Conectar Gmail es opcional. bills. solicita acceso de solo lectura para buscar correos de remitentes bancarios compatibles, extraer movimientos y evitar duplicados. No enviamos, editamos ni eliminamos correos.

El contenido de un mensaje procesado correctamente no se conserva. Los fallidos pueden mantenerse cifrados hasta 7 días para diagnóstico y recuperación controlada. Los datos normalizados y metadatos técnicos se usan para prestar y proteger el servicio, no para publicidad, venta de datos ni perfiles comerciales.

El uso y transferencia de información recibida desde las API de Google se ajustará a la Google API Services User Data Policy, incluidos sus requisitos de Limited Use. No vendemos esta información, no la usamos para publicidad y no permitimos acceso humano salvo las excepciones expresamente permitidas por esa política. Puedes revocar el acceso en cualquier momento desde bills. o desde la configuración de seguridad de Google.
`,
    },
    {
      type: 'DATA_DELETION',
      version: CURRENT_LEGAL_VERSION,
      locale: 'es-DO',
      title: 'Eliminación de datos y cuenta',
      slug: 'data-deletion',
      effectiveAt: new Date('2026-08-28T00:00:00.000Z'),
      content: `# Eliminación de datos y cuenta

Puedes desconectar Gmail sin borrar tus transacciones, o eliminar completamente la cuenta desde la configuración autenticada.

Al eliminar la cuenta revocamos y borramos tokens, conexiones, eventos de ingesta, movimientos, reglas, perfil y membresías personales. La operación no puede deshacerse. Se conserva únicamente un registro irreversible y pseudonimizado de que la eliminación se completó. Las copias de respaldo cifradas pueden tardar hasta 30 días en expirar y no se utilizan para restaurar la cuenta.

También puedes solicitar eliminación escribiendo a ${owner.email}. Será necesario verificar tu identidad. Las solicitudes procedentes se completarán dentro del plazo legal aplicable y del plazo comunicado al confirmar la solicitud.
`,
    },
  ];
}

function digest(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function evidenceHash(value?: string) {
  if (!value) return null;
  const salt = config.legalAuditSalt || config.ingestionEncryptionKey || 'bills-local-development';
  return crypto.createHmac('sha256', salt).update(value).digest('hex');
}

export class LegalService {
  private static catalogReady: Promise<void> | null = null;

  public static catalog() {
    return templates();
  }

  public static async ensureCatalog() {
    if (this.catalogReady) return this.catalogReady;
    this.catalogReady = this.writeCatalog().catch((error) => {
      this.catalogReady = null;
      throw error;
    });
    return this.catalogReady;
  }

  private static async writeCatalog() {
    const catalog = templates();
    await prisma.$transaction(async (tx) => {
      for (const item of catalog) {
        await tx.legalDocument.updateMany({
          where: { type: item.type, locale: item.locale, NOT: { version: item.version } },
          data: { isCurrent: false },
        });
        await tx.legalDocument.upsert({
          where: {
            type_version_locale: {
              type: item.type,
              version: item.version,
              locale: item.locale,
            },
          },
          create: {
            type: item.type,
            version: item.version,
            locale: item.locale,
            title: item.title,
            slug: item.slug,
            contentHash: digest(item.content),
            isCurrent: true,
            effectiveAt: item.effectiveAt,
          },
          update: {
            title: item.title,
            slug: item.slug,
            contentHash: digest(item.content),
            isCurrent: true,
            effectiveAt: item.effectiveAt,
          },
        });
      }
    });
  }

  public static async current(profileId?: string) {
    await this.ensureCatalog();
    const documents = await prisma.legalDocument.findMany({
      where: { isCurrent: true, locale: 'es-DO' },
      orderBy: { type: 'asc' },
    });
    const acceptedIds = profileId
      ? new Set(
          (
            await prisma.legalAcceptance.findMany({
              where: { profileId, legalDocumentId: { in: documents.map((document) => document.id) } },
              select: { legalDocumentId: true },
            })
          ).map((acceptance) => acceptance.legalDocumentId)
        )
      : new Set<string>();
    const content = new Map(templates().map((item) => [`${item.type}:${item.version}`, item.content]));
    return documents.map((document) => ({
      id: document.id,
      type: document.type,
      version: document.version,
      locale: document.locale,
      title: document.title,
      slug: document.slug,
      effectiveAt: document.effectiveAt,
      contentHash: document.contentHash,
      content: content.get(`${document.type}:${document.version}`) || '',
      required: REQUIRED_LEGAL_TYPES.includes(document.type),
      accepted: acceptedIds.has(document.id),
    }));
  }

  public static async hasCurrentRequired(profileId: string) {
    const documents = await this.current(profileId);
    return documents.filter((document) => document.required).every((document) => document.accepted);
  }

  public static async accept(
    profileId: string,
    requestedDocuments: Array<{ type: LegalDocumentType; version: string }>,
    evidence: { ip?: string; userAgent?: string; source: LegalAcceptanceSource; locale: string }
  ) {
    const current = await this.current(profileId);
    for (const requiredType of REQUIRED_LEGAL_TYPES) {
      const expected = current.find((document) => document.type === requiredType);
      const requested = requestedDocuments.find((document) => document.type === requiredType);
      if (!expected || requested?.version !== expected.version) {
        throw new AppError(409, 'LEGAL_DOCUMENT_OUTDATED', 'Review the current legal documents.');
      }
    }

    const selected = current.filter((document) =>
      requestedDocuments.some(
        (requested) => requested.type === document.type && requested.version === document.version
      )
    );
    await prisma.$transaction(
      selected.map((document) =>
        prisma.legalAcceptance.upsert({
          where: {
            profileId_legalDocumentId: { profileId, legalDocumentId: document.id },
          },
          create: {
            profileId,
            legalDocumentId: document.id,
            source: evidence.source,
            locale: evidence.locale,
            ipHash: evidenceHash(evidence.ip),
            userAgentHash: evidenceHash(evidence.userAgent),
          },
          update: {},
        })
      )
    );
    return this.current(profileId);
  }

  public static async recordGoogleConsent(
    profileId: string,
    inboxConnectionId: string,
    scopes: string[]
  ) {
    await this.ensureCatalog();
    await prisma.integrationConsent.create({
      data: {
        profileId,
        inboxConnectionId,
        provider: 'GOOGLE',
        scopes,
        disclosureVersion: GOOGLE_DISCLOSURE_VERSION,
      },
    });
  }

  public static async revokeGoogleConsent(inboxConnectionId: string) {
    await prisma.integrationConsent.updateMany({
      where: { inboxConnectionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
