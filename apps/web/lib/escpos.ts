// apps/web/lib/escpos.ts
// Direct ESC/POS Hardware Printing Bridge for 80mm Thermal Printers
// Supports EPSON, Xprinter, Rongta, Posiflex, and standard POS-80 USB/Serial printers.

export const ESC = 0x1b;
export const GS = 0x1d;

export function hasBengali(str: string): boolean {
  return /[\u0980-\u09FF]/.test(str);
}

/**
 * Rasterizes Bangla text onto an off-screen HTML5 canvas and converts it to
 * standard ESC/POS GS v 0 1-bit monochrome bitmap bytes.
 * This guarantees crisp, native Bengali printing on all 80mm POS thermal printers
 * without requiring hardware character ROM code-pages.
 */
export function renderBanglaTextToRaster(
  text: string,
  options: {
    fontSize?: number;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    widthDots?: number;
  } = {},
): { widthBytes: number; heightDots: number; data: Uint8Array } | null {
  if (typeof document === 'undefined') return null;

  try {
    const widthDots = options.widthDots || 576; // Standard 80mm thermal printer = 576 dots
    const widthBytes = Math.ceil(widthDots / 8);
    const fontSize = options.fontSize || 24;
    const isBold = options.bold ?? true;
    const align = options.align || 'center';

    const canvas = document.createElement('canvas');
    canvas.width = widthDots;
    const heightDots = Math.max(32, Math.round(fontSize * 1.5));
    canvas.height = heightDots;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthDots, heightDots);

    // Black text
    ctx.fillStyle = '#000000';
    ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px 'Kalpurush', 'SolaimanLipi', 'Noto Sans Bengali', sans-serif`;
    ctx.textBaseline = 'middle';

    let x = 0;
    if (align === 'center') {
      ctx.textAlign = 'center';
      x = widthDots / 2;
    } else if (align === 'right') {
      ctx.textAlign = 'right';
      x = widthDots - 8;
    } else {
      ctx.textAlign = 'left';
      x = 8;
    }

    ctx.fillText(text, x, heightDots / 2);

    const imgData = ctx.getImageData(0, 0, widthDots, heightDots);
    const pixels = imgData.data;
    const totalBytes = widthBytes * heightDots;
    const bitmapData = new Uint8Array(totalBytes);

    for (let y = 0; y < heightDots; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const pxX = xByte * 8 + bit;
          if (pxX < widthDots) {
            const idx = (y * widthDots + pxX) * 4;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            // Luminance threshold: < 160 is dark (print dot = 1), >= 160 is light (0)
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum < 160) {
              byteVal |= 0x80 >> bit;
            }
          }
        }
        bitmapData[y * widthBytes + xByte] = byteVal;
      }
    }

    return { widthBytes, heightDots, data: bitmapData };
  } catch (err) {
    console.warn('Canvas rasterization failed:', err);
    return null;
  }
}

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init() {
    this.buffer.push(ESC, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  alignCenter() {
    this.buffer.push(ESC, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft() {
    this.buffer.push(ESC, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight() {
    this.buffer.push(ESC, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(enable = true) {
    this.buffer.push(ESC, 0x45, enable ? 0x01 : 0x00); // ESC E n
    return this;
  }

  textDoubleSize() {
    this.buffer.push(GS, 0x21, 0x11); // GS ! 0x11 (Double width + height)
    return this;
  }

  textNormal() {
    this.buffer.push(GS, 0x21, 0x00); // GS ! 0x00
    return this;
  }

  /**
   * Appends raster bitmap image data using standard ESC/POS GS v 0 command:
   * GS v 0 m xL xH yL yH d1...dk
   */
  rasterBitmap(widthBytes: number, heightDots: number, data: Uint8Array) {
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = heightDots & 0xff;
    const yH = (heightDots >> 8) & 0xff;

    // GS v 0 0 xL xH yL yH
    this.buffer.push(GS, 0x76, 0x30, 0x00, xL, xH, yL, yH);
    for (let i = 0; i < data.length; i++) {
      this.buffer.push(data[i]);
    }
    return this;
  }

  /**
   * Renders Bangla text as a raster bitmap to ensure crisp printing on 80mm thermal slips.
   */
  banglaLine(
    text: string,
    options: {
      fontSize?: number;
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
    } = {},
  ) {
    const raster = renderBanglaTextToRaster(text, options);
    if (raster) {
      this.rasterBitmap(raster.widthBytes, raster.heightDots, raster.data);
      this.buffer.push(0x0a); // LF
    } else {
      this.text(text);
      this.buffer.push(0x0a); // LF
    }
    return this;
  }

  text(str: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str = '') {
    if (hasBengali(str)) {
      return this.banglaLine(str);
    }
    this.text(str);
    this.buffer.push(0x0a); // LF
    return this;
  }

  dashedLine(length = 42) {
    this.line('-'.repeat(length));
    return this;
  }

  feed(lines = 3) {
    this.buffer.push(ESC, 0x64, lines); // ESC d n
    return this;
  }

  cut() {
    this.feed(3);
    this.buffer.push(GS, 0x56, 0x00); // GS V 0 (Full cut)
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

export function buildTokenSlipEscPos(token: {
  clinicNameBn: string;
  clinicNameEn: string;
  tokenNumber: string;
  serialNumber: number;
  mrn: string;
  patientName: string;
  doctorName: string;
  priority: string;
  time: string;
}): Uint8Array {
  const b = new EscPosBuilder();

  b.alignCenter()
    .bold(true)
    .line(token.clinicNameBn || 'এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার')
    .bold(false)
    .line(token.clinicNameEn || 'HPC Health & Pain Care Center, Jashore')
    .line('Cell: 01XXXXXXXXX · Jashore')
    .dashedLine()
    .bold(true)
    .line('PATIENT SERIAL TOKEN')
    .textDoubleSize()
    .line(`  ${token.tokenNumber}  `)
    .textNormal()
    .line(`Serial #${token.serialNumber} · [${token.priority.toUpperCase()}]`)
    .dashedLine()
    .alignLeft()
    .line(`MRN:     ${token.mrn}`)
    .line(`Patient: ${token.patientName}`)
    .line(`Doctor:  ${token.doctorName}`)
    .line(`Issued:  ${token.time}`)
    .dashedLine()
    .alignCenter()
    .line('অনুগ্রহ করে টোকেন ডাকলে কক্ষে প্রবেশ করুন।')
    .cut();

  return b.toBytes();
}

export function buildReceiptEscPos(receipt: {
  billNumber: string;
  patientName: string;
  mrn: string;
  items: Array<{ description: string; quantity: number; unitPriceTaka: number }>;
  subtotalTaka: number;
  discountTaka: number;
  totalTaka: number;
  paidTaka: number;
  dueTaka: number;
  paymentMethod: string;
  date: string;
}): Uint8Array {
  const b = new EscPosBuilder();

  b.alignCenter()
    .bold(true)
    .line('এইচপিসি হেলথ অ্যান্ড পেইন কেয়ার সেন্টার')
    .line('HPC Health & Pain Care Center, Jashore')
    .dashedLine()
    .line(`MONEY RECEIPT · ${receipt.billNumber}`)
    .alignLeft()
    .line(`Date:    ${receipt.date}`)
    .line(`Patient: ${receipt.patientName} (${receipt.mrn})`)
    .dashedLine();

  for (const it of receipt.items) {
    const title = it.description.slice(0, 24).padEnd(24, ' ');
    const price = `BDT ${it.unitPriceTaka * it.quantity}`.padStart(10, ' ');
    b.line(`${title}${price}`);
  }

  b.dashedLine()
    .alignRight()
    .line(`Subtotal: BDT ${receipt.subtotalTaka}`)
    .line(`Discount: -BDT ${receipt.discountTaka}`)
    .bold(true)
    .line(`Total Payable: BDT ${receipt.totalTaka}`)
    .bold(false)
    .line(`Paid (${receipt.paymentMethod}): BDT ${receipt.paidTaka}`);

  if (receipt.dueTaka > 0) {
    b.bold(true).line(`Due Balance: BDT ${receipt.dueTaka}`).bold(false);
  }

  b.dashedLine()
    .alignCenter()
    .line('Thank you for visiting HPC Jashore!')
    .cut();

  return b.toBytes();
}

// Web Serial API Direct Printer Connector (Chrome / Edge / Opera on Windows/Linux)
export async function printDirectWebSerial(bytes: Uint8Array): Promise<boolean> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
  }

  const port = await (navigator as any).serial.requestPort();
  await port.open({ baudRate: 9600 });
  const writer = port.writable.getWriter();
  await writer.write(bytes);
  writer.releaseLock();
  await port.close();
  return true;
}
