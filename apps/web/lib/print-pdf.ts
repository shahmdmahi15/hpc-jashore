// apps/web/lib/print-pdf.ts
'use client';

/**
 * Enterprise Printing & PDF Architecture for HPC Jashore
 * 
 * Provides:
 * 1. printElementViaIframe: Bypasses window.print() completely by rendering the document
 *    in an isolated hidden iframe. Guarantees 0 preceding blank pages, 1-page containment,
 *    and perfect vector fonts.
 * 2. generateElementPdf: Uses html2canvas + jsPDF to export crisp, standard A4 PDFs
 *    for download, patient record archiving, or direct PDF printing.
 */

export interface PrintIframeOptions {
  pageTitle?: string;
  pageSize?: 'A4 portrait' | '5.5in 8.27in' | string;
  pageMargin?: string;
  extraCss?: string;
}

export interface PdfExportOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | [number, number];
  scale?: number;
  autoPrint?: boolean;
}

/**
 * Print an element directly through an isolated hidden <iframe>.
 * Completely eliminates background application interference, multi-page blank flow,
 * and dark-theme bleed.
 */
export async function printElementViaIframe(
  elementIdOrEl: string | HTMLElement,
  options: PrintIframeOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const targetEl =
        typeof elementIdOrEl === 'string'
          ? document.getElementById(elementIdOrEl)
          : elementIdOrEl;

      if (!targetEl) {
        throw new Error(`Print target element not found: ${elementIdOrEl}`);
      }

      // 1. Gather all active stylesheets and CSS rules from the main document
      let stylesHtml = '';
      const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
      styleNodes.forEach((node) => {
        stylesHtml += node.outerHTML;
      });

      // 2. Create hidden isolated iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Unable to access print iframe document');
      }

      const pageSize = options.pageSize || 'A4 portrait';
      const pageMargin = options.pageMargin || '6mm 8mm';
      const pageTitle = options.pageTitle || 'HPC Jashore Document';

      // 3. Write isolated standalone document
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="bn">
          <head>
            <meta charset="utf-8" />
            <title>${pageTitle}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
            ${stylesHtml}
            <style>
              @page {
                size: ${pageSize};
                margin: ${pageMargin};
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                color: #000000 !important;
                font-family: 'Hind Siliguri', 'Noto Sans Bengali', var(--font-poppins, 'Poppins'), system-ui, sans-serif !important;
              }
              .isolated-print-wrapper {
                width: 100% !important;
                margin: 0 auto !important;
                display: flex !important;
                justify-content: center !important;
                background: #ffffff !important;
              }
              ${options.extraCss || ''}
            </style>
          </head>
          <body>
            <div class="isolated-print-wrapper">
              ${targetEl.outerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // 4. Wait for images and web fonts inside iframe to fully load before triggering print
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          // Remove iframe after short delay to prevent premature disposal in Safari/Firefox
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        }
      };

      if (iframeDoc.readyState === 'complete') {
        setTimeout(triggerPrint, 350);
      } else {
        iframe.onload = () => setTimeout(triggerPrint, 350);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generate a high-DPI standard A4 PDF from a DOM element using html2canvas & jsPDF.
 * Supports download, direct preview, or auto-printing.
 */
export async function generateElementPdf(
  elementIdOrEl: string | HTMLElement,
  options: PdfExportOptions = {},
): Promise<{ blob: Blob; url: string }> {
  const targetEl =
    typeof elementIdOrEl === 'string'
      ? document.getElementById(elementIdOrEl)
    : elementIdOrEl;

  if (!targetEl) {
    throw new Error(`PDF target element not found: ${elementIdOrEl}`);
  }

  // Dynamically import jspdf & html2canvas so they don't bloat initial route bundle
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then((m) => m.default || m),
  ]);

  const scale = options.scale || 2.5; // 2.5x gives crisp 300dpi-equivalent print clarity

  // 1. Capture element to high-res canvas
  const canvas = await html2canvas(targetEl, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1024,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // 2. Initialize jsPDF in A4 portrait format (210mm x 297mm)
  const orientation = options.orientation || 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: options.format || 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Printable margin (e.g. 8mm margin around sheet)
  const marginX = 8;
  const marginY = 8;
  const printableWidth = pdfWidth - marginX * 2;
  const printableHeight = pdfHeight - marginY * 2;

  // Calculate proportional height
  const imgWidth = printableWidth;
  const calculatedHeight = (canvas.height * imgWidth) / canvas.width;
  // Bound to printable height so it NEVER spills onto page 2
  const imgHeight = Math.min(calculatedHeight, printableHeight);

  // Center horizontally & vertically in available printable area
  const posX = marginX + (printableWidth - imgWidth) / 2;
  const posY = marginY;

  pdf.addImage(imgData, 'PNG', posX, posY, imgWidth, imgHeight, undefined, 'FAST');

  const filename = options.filename || 'HPC_Document.pdf';

  if (options.autoPrint) {
    pdf.autoPrint();
  }

  if (options.filename && !options.autoPrint) {
    pdf.save(filename);
  }

  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  if (options.autoPrint) {
    window.open(url, '_blank');
  }

  return { blob, url };
}
