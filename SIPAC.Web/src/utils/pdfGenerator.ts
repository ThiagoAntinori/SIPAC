import { jsPDF } from 'jspdf';
import { MisTareasItem, OrdenTrabajo } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type OtPdfData = MisTareasItem | OrdenTrabajo;

export function generarOrdenTrabajoPdf(ot: OtPdfData, nombreOperario?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // ── CABECERA CORPORATIVA ──────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, y, pageWidth - 28, 26, 'F');

  doc.setFillColor(234, 88, 12); // orange-600 (detalle decorativo)
  doc.rect(14, y + 24, pageWidth - 28, 2, 'F');

  // Logo / Marca
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SITRAC', 22, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Sistema Integral de Trabajos y Abastecimiento para Consorcios', 22, y + 17);

  // N° OT en Cabecera (derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(ot.numeroOT || 'ORDEN DE TRABAJO', pageWidth - 22, y + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(254, 215, 170); // orange-200
  const fechaStr = format(new Date(ot.createdAt), "dd 'de' MMMM, yyyy - HH:mm'hs'", { locale: es });
  doc.text(`Emitida: ${fechaStr}`, pageWidth - 22, y + 17, { align: 'right' });

  y += 36;

  // ── DATOS PRINCIPALES (BOXES) ─────────────────────────────────────
  // Box 1: Unidad Funcional
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, y, (pageWidth - 32) / 2, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('UNIDAD FUNCIONAL (UF)', 20, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  const ufTexto = ot.unidadFuncionalDisplay || `Sector ${ot.sectorEscalera} Piso ${ot.piso || '-'} Depto ${ot.depto || '-'}`;
  doc.text(ufTexto, 20, y + 16);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sector / Escalera: ${ot.sectorEscalera || 'N/D'}`, 20, y + 23);
  doc.text(`Piso: ${ot.piso || 'PB'}  |  Departamento: ${ot.depto || '-'}`, 20, y + 28);

  // Box 2: Datos de Asignación y Estado
  const box2X = 14 + (pageWidth - 32) / 2 + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(box2X, y, (pageWidth - 32) / 2, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DATOS DE ASIGNACIÓN', box2X + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const operarioNombre = nombreOperario || (ot as any).responsableNombre || 'Personal asignado';
  doc.text(`Operario: ${operarioNombre}`, box2X + 6, y + 16);
  doc.text(`Rubro / Especialidad: ${ot.categoriaNombre || 'General'}`, box2X + 6, y + 22);

  // Estado con color distintivo
  doc.setFont('helvetica', 'bold');
  doc.text('Estado: ', box2X + 6, y + 28);
  if (ot.estado === 'Finalizado') {
    doc.setTextColor(5, 150, 105); // emerald-600
  } else if (ot.estado === 'En Proceso') {
    doc.setTextColor(2, 132, 199); // sky-600
  } else if (ot.estado.includes('Aprobacion')) {
    doc.setTextColor(217, 119, 6); // amber-600
  } else if (ot.estado === 'Suspendido') {
    doc.setTextColor(124, 58, 237); // violet-600
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text(ot.estado.toUpperCase(), box2X + 22, y + 28);

  y += 42;

  // ── SECCIÓN: PROBLEMA REPORTADO ───────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. PROBLEMA REPORTADO POR EL MORADOR / ENCARGADO', 14, y);
  y += 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  const problemaLines = doc.splitTextToSize(ot.problemaReportado || 'Sin descripción detallada.', pageWidth - 36);
  const probBoxHeight = Math.max(18, problemaLines.length * 5 + 8);
  doc.roundedRect(14, y, pageWidth - 28, probBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(problemaLines, 18, y + 7);

  y += probBoxHeight + 8;

  // ── SECCIÓN: SOLUCIÓN REALIZADA O MOTIVO DE SUSPENSIÓN ─────────────
  if (ot.solucionRealizada) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. TRABAJO Y SOLUCIÓN REALIZADA EN CAMPO', 14, y);
    y += 4;

    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    const solLines = doc.splitTextToSize(ot.solucionRealizada, pageWidth - 36);
    const solBoxHeight = Math.max(18, solLines.length * 5 + 8);
    doc.roundedRect(14, y, pageWidth - 28, solBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.text(solLines, 18, y + 7);

    y += solBoxHeight + 8;
  }

  if (ot.motivoSuspension) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('2. MOTIVO DE SUSPENSIÓN / IMPEDIMENTO INFORMADO', 14, y);
    y += 4;

    doc.setFillColor(254, 242, 242); // rose-50
    doc.setDrawColor(254, 205, 211); // rose-200
    const suspLines = doc.splitTextToSize(ot.motivoSuspension, pageWidth - 36);
    const suspBoxHeight = Math.max(18, suspLines.length * 5 + 8);
    doc.roundedRect(14, y, pageWidth - 28, suspBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(159, 18, 57); // rose-800
    doc.text(suspLines, 18, y + 7);

    y += suspBoxHeight + 8;
  }

  // ── SECCIÓN: OBSERVACIONES ADICIONALES (SI HAY) ───────────────────
  if (ot.observaciones) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('OBSERVACIONES / NOTAS:', 14, y);
    y += 4;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const obsLines = doc.splitTextToSize(ot.observaciones, pageWidth - 28);
    doc.text(obsLines, 14, y);
    y += obsLines.length * 4.5 + 8;
  }

  // ── RECUADRO PARA FIRMAS DE CONFORMIDAD ───────────────────────────
  const signatureY = Math.max(y + 10, 225);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);

  // Línea firma operario
  doc.line(24, signatureY + 20, 88, signatureY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Firma Operario Responsable', 56, signatureY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Aclaración / Legajo', 56, signatureY + 29, { align: 'center' });

  // Línea firma morador / encargado
  doc.line(pageWidth - 88, signatureY + 20, pageWidth - 24, signatureY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Firma y Conformidad Morador', pageWidth - 56, signatureY + 25, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('DNI / Aclaración', pageWidth - 56, signatureY + 29, { align: 'center' });

  // ── FOOTER LEGAL / MARCA ──────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const generadoStr = `Documento generado offline desde Portal Operario SITRAC • ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`;
  doc.text(generadoStr, pageWidth / 2, 285, { align: 'center' });

  // Descarga del PDF
  const filename = `${ot.numeroOT || 'OT'}_${ot.unidadFuncionalDisplay?.replace(/[^a-zA-Z0-9]/g, '_') || 'UF'}.pdf`;
  doc.save(filename);
}
