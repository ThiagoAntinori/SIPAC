import { jsPDF } from 'jspdf';
import { MisTareasItem, OrdenTrabajo } from '../types';
import { format } from 'date-fns';

type OtPdfData = MisTareasItem | OrdenTrabajo;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Dibuja una celda rectangular con borde negro y texto alineado a la izquierda */
function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  opts?: { labelBold?: boolean; valueBold?: boolean; fontSize?: number }
) {
  const fs = opts?.fontSize ?? 9;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, 'S');

  // Label (bold)
  doc.setFontSize(fs);
  doc.setFont('helvetica', opts?.labelBold !== false ? 'bold' : 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(label, x + 2, y + h / 2 + 1.5);

  // Value (normal)
  doc.setFont('helvetica', opts?.valueBold ? 'bold' : 'normal');
  const labelWidth = doc.getTextWidth(label);
  doc.text(value, x + 2 + labelWidth + 1, y + h / 2 + 1.5);
}

/** Dibuja una barra de título (fondo blanco, borde negro, texto centrado en bold) */
function drawSectionHeader(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  fontSize = 9
) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);
  doc.text(title, x + w / 2, y + h / 2 + fontSize * 0.18, { align: 'center' });
}

/** Dibuja un recuadro vacío (o con texto) de altura fija con borde negro */
function drawContentBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  lines?: string[]
) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, w, h, 'FD');

  if (lines && lines.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const lineH = 5;
    lines.forEach((line, i) => {
      const yLine = y + 5 + i * lineH;
      if (yLine + lineH <= y + h) {
        doc.text(line, x + 3, yLine);
      }
    });
  }
}

// ─── Generador principal ──────────────────────────────────────────────────────

export function generarOrdenTrabajoPdf(ot: OtPdfData, nombreOperario?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Dimensiones de página
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR; // 182

  let y = 14;

  // ── 1. ENCABEZADO INSTITUCIONAL ───────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Consorcio de Propietarios Barrio San Isidro', marginL, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Camino Morón y Panamericana', marginL, y);

  y += 4.5;
  doc.text('Boulogne, Buenos Aires', marginL, y);

  y += 8;

  // ── 2. TÍTULO CENTRAL ─────────────────────────────────────────────────────
  const titleH = 8;
  drawSectionHeader(doc, marginL, y, contentW, titleH, 'ORDEN DE TRABAJO', 10);
  y += titleH;

  // ── 3. GRILLA DE DATOS OPERATIVOS ─────────────────────────────────────────
  const rowH = 8;
  const col1W = contentW * 0.40; // ~40%
  const col2W = contentW - col1W; // ~60%

  // Fila 1: ORDEN Nº | SOLICITUD
  const ordenNum = ot.numeroOT || ot.idOt || '—';
  drawCell(doc, marginL, y, col1W, rowH, 'ORDEN Nº: ', ordenNum);
  drawCell(doc, marginL + col1W, y, col2W, rowH, 'SOLICITUD: ', ordenNum);
  y += rowH;

  // Fila 2: ASIG. A | FECHA
  const responsable =
    nombreOperario ||
    (ot as OrdenTrabajo).responsableNombre ||
    '—';
  const fechaOt = format(new Date(ot.createdAt), 'dd-MM-yy');
  drawCell(doc, marginL, y, col1W, rowH, 'ASIG. A: ', responsable);
  drawCell(doc, marginL + col1W, y, col2W, rowH, 'FECHA: ', fechaOt);
  y += rowH;

  // Fila 3: LUGAR (ancho completo)
  const esLocal = (ot.sectorEscalera || '').toUpperCase() === 'LOCAL';
  const lugarTxt = esLocal
    ? `LOCAL Nº ${ot.piso || '—'}`
    : `ESC ${ot.sectorEscalera || '—'}   ${ot.piso || '—'}°${ot.depto || '—'}`;
  drawCell(doc, marginL, y, contentW, rowH, 'LUGAR: ', lugarTxt);
  y += rowH;

  y += 5;

  // ── 4. BLOQUE "TRABAJO A REALIZARSE" ──────────────────────────────────────
  const taHdrH = 7;
  drawSectionHeader(doc, marginL, y, contentW, taHdrH, 'TRABAJO A REALIZARSE');
  y += taHdrH;

  const taBoxH = 50;
  const problemaText = ot.problemaReportado || '';
  const problemaLines = doc.splitTextToSize(problemaText, contentW - 6);
  drawContentBox(doc, marginL, y, contentW, taBoxH, problemaLines);
  y += taBoxH;

  y += 5;

  // ── 5. LÍNEA DE EJECUCIÓN ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(
    'FECHA Y HORA DEL TRABAJO: _____________________________________',
    marginL,
    y
  );
  y += 10;

  // ── 6. BLOQUE "OBSERVACIONES" ─────────────────────────────────────────────
  const obsHdrH = 7;
  drawSectionHeader(doc, marginL, y, contentW, obsHdrH, 'OBSERVACIONES');
  y += obsHdrH;

  const obsBoxH = 72;
  // El recuadro se deja en blanco para anotaciones manuales en terreno
  drawContentBox(doc, marginL, y, contentW, obsBoxH);
  y += obsBoxH;

  y += 10;

  // ── 7. PIE DE FIRMAS Y CONFORMIDAD ───────────────────────────────────────
  // Asegurar que las firmas no se superpongan al contenido anterior
  const firmasY = Math.max(y, 248);

  const firmaLineW = 65;
  const firmaLX = marginL + 5;                     // inicio línea izquierda
  const firmaRX = pageW - marginR - 5 - firmaLineW; // inicio línea derecha

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);

  // Línea izquierda
  doc.line(firmaLX, firmasY, firmaLX + firmaLineW, firmasY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('FIRMA DEL EJECUTANTE', firmaLX + firmaLineW / 2, firmasY + 4.5, {
    align: 'center',
  });

  // Línea derecha
  doc.line(firmaRX, firmasY, firmaRX + firmaLineW, firmasY);
  doc.text('FIRMA DEL PROPIETARIO', firmaRX + firmaLineW / 2, firmasY + 4.5, {
    align: 'center',
  });

  // Campos ESC / PISO / DTO bajo la firma del propietario
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const camposY = firmasY + 10;
  doc.text(
    'ESC: _________   PISO: _________   DTO: _________',
    firmaRX + firmaLineW,
    camposY,
    { align: 'right' }
  );

  // ── DESCARGA ─────────────────────────────────────────────────────────────
  const sector = (ot.sectorEscalera || 'X').replace(/[^a-zA-Z0-9]/g, '');
  const piso = (ot.piso || '0').replace(/[^a-zA-Z0-9]/g, '');
  const depto = (ot.depto || '').replace(/[^a-zA-Z0-9]/g, '');
  const idClean = (ot.idOt || ot.numeroOT || 'OT').replace(/[^a-zA-Z0-9\-]/g, '');
  const filename = `OT-${idClean}-${sector}-${piso}${depto}.pdf`;

  doc.save(filename);
}
