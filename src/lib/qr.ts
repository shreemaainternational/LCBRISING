import QRCode from 'qrcode';

const DEFAULT_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 2,
  width: 512,
  color: {
    dark: '#0F0F1A',
    light: '#FFFFFF',
  },
};

export async function renderQrSvg(data: string, opts: Partial<typeof DEFAULT_OPTIONS> = {}) {
  return QRCode.toString(data, {
    type: 'svg',
    ...DEFAULT_OPTIONS,
    ...opts,
  });
}

export async function renderQrPngBuffer(data: string, opts: Partial<typeof DEFAULT_OPTIONS> = {}) {
  return QRCode.toBuffer(data, {
    type: 'png',
    ...DEFAULT_OPTIONS,
    ...opts,
  });
}

export async function renderQrDataUrl(data: string, opts: Partial<typeof DEFAULT_OPTIONS> = {}) {
  return QRCode.toDataURL(data, {
    ...DEFAULT_OPTIONS,
    ...opts,
  });
}
