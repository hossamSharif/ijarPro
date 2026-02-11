import QRCode from 'qrcode';
import type { ZatcaTlvData } from '@/lib/types/zatca';
import { encodeTlvBase64 } from './tlv-encoder';

export function generateZatcaBase64(data: ZatcaTlvData): string {
  return encodeTlvBase64(data);
}

export async function generateQrDataUrl(data: ZatcaTlvData): Promise<string> {
  const base64 = encodeTlvBase64(data);
  return QRCode.toDataURL(base64, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
  });
}

export async function generateQrCanvas(
  canvas: HTMLCanvasElement,
  data: ZatcaTlvData
): Promise<void> {
  const base64 = encodeTlvBase64(data);
  await QRCode.toCanvas(canvas, base64, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
  });
}
