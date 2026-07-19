import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Handover } from '../types';
import { ensureDate } from '../lib/utils';

export const exportToExcel = (handovers: Handover[], professionalsMap: Record<string, string>) => {
  const dataToExport = handovers.map(h => {
    const isCancelled = h.status === 'Cancelada';
    return {
      'Status': h.status || 'Publicada',
      'Paciente': (isCancelled ? '[CANCELADO] ' : '') + h.patientName,
      'Data Passagem': format(ensureDate(h.handoverDate), "dd/MM/yyyy"),
      'Turno': h.shift,
      'Data Registro': format(ensureDate(h.createdAt), "dd/MM/yyyy HH:mm"),
      'Profissional (Nome)': (h.professionalId && professionalsMap[h.professionalId]) || h.professionalName || '-',
      'Profissional (Email)': h.professionalEmail,
      'NEWS2 Escore': h.news2Score !== undefined ? h.news2Score : '-',
      'NEWS2 Classificação': h.news2Classification || '-',
      'Evacuação': h.hadEvacuation ? 'Sim' : 'Não',
      'Precaução': h.precautions || '-',
      'Ventilação': h.ventilation || '-',
      'Medicação SOS': h.tookSOSMedication ? 'Sim' : 'Não',
      'Nome SOS': h.sosMedicationName || '-',
      'Intercorrência': h.hadComplication ? 'Sim' : 'Não',
      'Relato Intercorrência': h.complicationDescription || '-',
      'Observações': (isCancelled ? `[CANCELADO] Motivo: ${h.cancellationReason || 'Não informado'} | ` : '') + (h.observations || '-'),
      'Cancelado Por': isCancelled ? (h.cancelledByName || h.cancelledByEmail || '-') : '-',
      'Data Cancelamento': isCancelled && h.cancelledAt ? format(ensureDate(h.cancelledAt), "dd/MM/yyyy HH:mm") : '-',
      'Motivo Cancelamento': isCancelled ? (h.cancellationReason || '-') : '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Passagens');
  XLSX.writeFile(workbook, `historico_passagens_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};

export const exportToPDF = (handovers: Handover[], professionalsMap: Record<string, string>, startDate?: string, endDate?: string) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const cellTexts: Record<string, string[]> = {};
  
  // Header
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("RELATÓRIO DE PASSAGEM DE PLANTÃO", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("MEDISHIFT - ENFERMAGEM DIGITAL", 14, 28);
  
  let periodText = 'GERAL';
  if (startDate && endDate) {
    if (startDate === endDate) {
      periodText = format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy');
    } else {
      periodText = `${format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy')}`;
    }
  } else if (startDate) {
    periodText = `DESDE ${format(new Date(startDate + 'T00:00:00'), 'dd/MM/yyyy')}`;
  } else if (endDate) {
    periodText = `ATÉ ${format(new Date(endDate + 'T00:00:00'), 'dd/MM/yyyy')}`;
  }

  doc.text(`PERÍODO: ${periodText}`, 14, 34);
  
  doc.setTextColor(200, 200, 200);
  doc.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 60, 34);

  const tableColumn = [
    "Data", 
    "Paciente", 
    "Turno", 
    "Profissional", 
    "Email Registro",
    "Disp.", 
    "Prec.",
    "Vent.",
    "Evac.", 
    "SOS", 
    "Interc.",
    "NEWS2",
    "Observações/Evolução"
  ];
  
  const tableRows = handovers.map(h => {
    const isCancelled = h.status === 'Cancelada';
    let notes = [
      h.sosMedicationName ? `SOS:\n${h.sosMedicationName}` : '',
      h.hadComplication ? `INTERCORRÊNCIA:\n${h.complicationDescription}` : '',
      h.observations ? `OBSERVAÇÕES/EVOLUÇÃO:\n${h.observations}` : ''
    ].filter(t => t).join('\n\n');

    if (isCancelled) {
      const cancelDate = h.cancelledAt ? format(ensureDate(h.cancelledAt), "dd/MM/yyyy HH:mm") : '-';
      const cancelInfo = `[CANCELADO] por ${h.cancelledByName || h.cancelledByEmail} em ${cancelDate}\nMOTIVO DO CANCELAMENTO: ${h.cancellationReason || 'Não informado'}`;
      notes = `${cancelInfo}${notes ? '\n\n' + notes : ''}`;
    }

    const scoreVal = h.news2Score !== undefined ? h.news2Score : '-';
    const classVal = h.news2Classification ? `${h.news2Classification}` : '';
    const news2Text = h.news2Score !== undefined ? `${scoreVal}\n${classVal}` : '-';

    return [
      format(ensureDate(h.handoverDate), "dd/MM/yyyy") + (isCancelled ? '\n(CANCELADA)' : ''),
      (isCancelled ? '[CANCELADA] ' : '') + (h.patientName?.toUpperCase() || '-'),
      h.shift,
      ((h.professionalId && professionalsMap[h.professionalId]) || h.professionalName || h.professionalEmail || '-').split(' ')[0].toUpperCase(),
      h.professionalEmail || '-',
      h.deviceTypes?.length ? h.deviceTypes.join(', ') : 'NÃO',
      h.precautions || '-',
      h.ventilation || '-',
      h.hadEvacuation ? 'SIM' : 'NÃO',
      h.tookSOSMedication ? 'SIM' : 'NÃO',
      h.hadComplication ? 'SIM' : 'NÃO',
      news2Text,
      notes || 'SEM OBSERVAÇÕES'
    ];
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    styles: { 
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [14, 165, 233], // brand color
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center',
      textColor: 255
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' }, // Data
      1: { cellWidth: 26 }, // Paciente
      2: { cellWidth: 13, halign: 'center' }, // Turno
      3: { cellWidth: 17 }, // Profissional
      4: { cellWidth: 18 }, // Email Registro
      5: { cellWidth: 15, halign: 'center' }, // Disp.
      6: { cellWidth: 16 }, // Prec.
      7: { cellWidth: 16 }, // Vent.
      8: { cellWidth: 10, halign: 'center' }, // Evac
      9: { cellWidth: 10, halign: 'center' }, // SOS
      10: { cellWidth: 10, halign: 'center' }, // Interc
      11: { cellWidth: 15, halign: 'center' }, // NEWS2
      12: { cellWidth: 'auto' } // Observações
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    margin: { top: 45, left: 10, right: 10, bottom: 20 },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const h = handovers[data.row.index];
        if (h) {
          if (h.status === 'Cancelada') {
            data.cell.styles.textColor = [185, 28, 28]; // Darker red (red-700)
            data.cell.styles.fillColor = [254, 242, 242]; // Light red (red-50)
          } else if (data.column.index === 11 && h.news2Score !== undefined) {
            // Style NEWS2 cell nicely according to warning levels
            if (h.news2Classification === 'ALTO') {
              data.cell.styles.fillColor = [254, 226, 226]; // red-100
              data.cell.styles.textColor = [185, 28, 28]; // red-700
              data.cell.styles.fontStyle = 'bold';
            } else if (h.news2Classification === 'MÉDIO') {
              data.cell.styles.fillColor = [254, 243, 199]; // amber-100
              data.cell.styles.textColor = [180, 83, 9]; // amber-800
              data.cell.styles.fontStyle = 'bold';
            } else if (h.news2Classification === 'BAIXO-MÉDIO') {
              data.cell.styles.fillColor = [254, 249, 195]; // yellow-100
              data.cell.styles.textColor = [161, 98, 7]; // yellow-800
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [209, 250, 229]; // emerald-100
              data.cell.styles.textColor = [6, 95, 70]; // emerald-800
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 12) {
        const cellKey = `${data.pageNumber}_${data.row.index}_${data.column.index}`;
        cellTexts[cellKey] = [...data.cell.text];
        data.cell.text = []; // Clear original text to draw with styled bold parts in didDrawCell
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 12) {
        const cellKey = `${data.pageNumber}_${data.row.index}_${data.column.index}`;
        const lines = cellTexts[cellKey] || [];
        const h = handovers[data.row.index];
        const isCancelled = h && h.status === 'Cancelada';

        if (!lines.length || (lines.length === 1 && lines[0] === 'SEM OBSERVAÇÕES')) {
          if (lines[0] === 'SEM OBSERVAÇÕES') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            if (isCancelled) {
              doc.setTextColor(185, 28, 28);
            } else {
              doc.setTextColor(100, 116, 139); // slate-500
            }
            const paddingLeft = data.cell.padding('left') || 2;
            const paddingTop = data.cell.padding('top') || 2;
            doc.text('SEM OBSERVAÇÕES', data.cell.x + paddingLeft, data.cell.y + paddingTop + 2.2);
          }
          return;
        }

        const paddingLeft = data.cell.padding('left') || 2;
        const paddingTop = data.cell.padding('top') || 2;
        const paddingBottom = data.cell.padding('bottom') || 2;
        
        const usableHeight = data.cell.height - paddingTop - paddingBottom;
        const linesCount = lines.length;
        
        // Calculate dynamic line height to fit perfectly
        const lineHeight = linesCount > 0 ? (usableHeight / linesCount) : 0;
        const fontSizeInMm = (data.cell.styles.fontSize || 7) / 2.834646;
        
        let currentY = data.cell.y + paddingTop + (lineHeight - fontSizeInMm) / 2 + fontSizeInMm - 0.2;
        const startX = data.cell.x + paddingLeft;

        lines.forEach((line) => {
          const prefixes = [
            "SOS:",
            "SOS",
            "INTERCORRÊNCIA:",
            "INTERCORRÊNCIA",
            "OBSERVAÇÕES/EVOLUÇÃO:",
            "OBSERVAÇÕES/EVOLUÇÃO",
            "[CANCELADO]",
            "MOTIVO DO CANCELAMENTO:"
          ];
          const matchedPrefix = prefixes.find(p => line.startsWith(p));

          if (isCancelled) {
            doc.setTextColor(185, 28, 28);
          } else {
            doc.setTextColor(15, 23, 42); // slate-900
          }

          doc.setFontSize(7);

          if (matchedPrefix) {
            // Draw bold prefix
            doc.setFont('helvetica', 'bold');
            doc.text(matchedPrefix, startX, currentY);
            
            const prefixWidth = doc.getTextWidth(matchedPrefix);
            
            // Draw normal text
            doc.setFont('helvetica', 'normal');
            const normalText = line.substring(matchedPrefix.length);
            doc.text(normalText, startX + prefixWidth, currentY);
          } else {
            // Regular text line
            doc.setFont('helvetica', 'normal');
            doc.text(line, startX, currentY);
          }
          
          currentY += lineHeight;
        });
      }
    },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const str = `Página ${data.pageNumber} de ${(doc as any).internal.getNumberOfPages()}`;
      doc.text(str, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
    }
  });

  doc.save(`historico_detalhado_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
