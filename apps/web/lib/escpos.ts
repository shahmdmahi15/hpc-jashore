// apps/web/lib/escpos.ts
// Direct ESC/POS Hardware Printing Bridge for 80mm Thermal Printers
// Supports EPSON, Xprinter, Rongta, Posiflex, and standard POS-80 USB/Serial printers.

export const ESC = 0x1b;
export const GS = 0x1d;

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

  text(str: string) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  line(str = '') {
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
    const price = `৳${it.unitPriceTaka * it.quantity}`.padStart(10, ' ');
    b.line(`${title}${price}`);
  }

  b.dashedLine()
    .alignRight()
    .line(`Subtotal: ৳${receipt.subtotalTaka}`)
    .line(`Discount: -৳${receipt.discountTaka}`)
    .bold(true)
    .line(`Total Payable: ৳${receipt.totalTaka}`)
    .bold(false)
    .line(`Paid (${receipt.paymentMethod}): ৳${receipt.paidTaka}`);

  if (receipt.dueTaka > 0) {
    b.bold(true).line(`Due Balance: ৳${receipt.dueTaka}`).bold(false);
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
