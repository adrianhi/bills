import { downloadBlob } from './download-blob';

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

type ShareCapableNavigator = Navigator & {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

const shareNavigator = (): ShareCapableNavigator | null => (typeof navigator === 'undefined' ? null : (navigator as ShareCapableNavigator));

export function canShareFiles(file: File): boolean {
  const nav = shareNavigator();
  return typeof nav?.share === 'function' && typeof nav?.canShare === 'function' && nav.canShare({ files: [file] });
}

export function supportsFileShare(): boolean {
  const nav = shareNavigator();
  return typeof nav?.share === 'function' && typeof nav?.canShare === 'function';
}

/**
 * Comparte el archivo mediante Web Share API cuando el navegador acepta archivos;
 * si no (o si el sistema de compartir falla), cae a la descarga tradicional.
 * Devuelve el resultado para que la UI pueda informar al usuario.
 */
export async function shareOrDownloadFile(blob: Blob, filename: string, title: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  const nav = shareNavigator();
  if (nav && canShareFiles(file)) {
    try {
      await nav.share!({ files: [file], title });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}
