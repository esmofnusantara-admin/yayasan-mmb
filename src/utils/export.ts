import { jsPDF } from 'jspdf';
import { Staff, PublicField, StaffSalary } from '../types';

export function exportToCSV(data: any[], headers: string[], keys: string[], filename: string) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      keys.map(key => {
        const val = row[key];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        // Wrap in quotes if it contains commas, newlines, or quotes
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportSlipToPDF(
  staff: Staff, 
  publicFields: PublicField[] = [], 
  salaryConfig?: StaffSalary,
  profile?: any,
  paidAmount: number = 0
) {
  const fieldsToUse = publicFields && publicFields.length > 0 ? publicFields : [
    { id: '1', name: 'Tunjangan Jabatan', type: 'allowance', property: 'allowancePosition' },
    { id: '2', name: 'Tunjangan Perumahan', type: 'allowance', property: 'allowanceHousing' },
    { id: '3', name: 'Tunjangan Transport', type: 'allowance', property: 'allowanceTransport' },
    { id: '4', name: 'Tunjangan Komunikasi', type: 'allowance', property: 'allowanceComm' },
    { id: '5', name: 'Premi BPJS Allowance', type: 'allowance', property: 'bpjsAllowance' },
    { id: '6', name: 'Bonus & THR / Keagamaan', type: 'allowance', property: 'thr' },
    { id: '7', name: 'Pajak PPH21 Bruto', type: 'deduction', property: 'taxDeduction' },
    { id: '8', name: 'Iuran BPJS Karyawan', type: 'deduction', property: 'bpjsDeduction' },
    { id: '9', name: 'Kasbon / Angsuran', type: 'deduction', property: 'kasbonDeduction' }
  ] as PublicField[];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette
  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [79, 70, 229]; // Indigo
  const textDark = [30, 41, 59]; // Slate 800
  const textLight = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50

  // 1. Header (Corporate Organization Style)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  const orgName = (profile?.name || 'YAYASAN EVANGELICAL STUDENT MOVEMENT (ESM)').toUpperCase();
  doc.text(orgName, 20, 22);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  
  const orgAddress = profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10103';
  const orgNpwp = profile?.npwp ? `NPWP: ${profile.npwp}` : 'NPWP: 01.234.567.8-012.000';
  const orgPhone = profile?.phone ? `Telp: ${profile.phone}` : 'Telp: (021) 8888-ESM';
  const orgEmail = profile?.email ? `Email: ${profile.email}` : 'Email: info@yayasan-esm.org';
  
  doc.text(`${orgAddress} • ${orgNpwp}`, 20, 27);
  doc.text(`${orgPhone} • ${orgEmail}`, 20, 32);
  
  // Double Divider lines for Kop Surat Formal
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(0.6);
  doc.line(20, 35, 190, 35);
  doc.setLineWidth(0.2);
  doc.line(20, 36.2, 190, 36.2);
  
  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('SLIP GAJI RESMI KARYAWAN', 20, 45);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentDate = new Date();
  const dateStr = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  
  const docNo = `No. Dokumen: SLIP/${staff.nik}/${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  doc.text(`Periode Pelayanan: ${dateStr}`, 20, 50);
  doc.text(docNo, 110, 50);

  // Metadata Box / Grid (Adjusted compact height as NPWP Lembaga is removed from Col 2)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(20, 55, 170, 26, 2, 2, 'FD');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  // Col 1 metadata
  doc.text('A. DATA PENERIMA MANFAAT', 25, 61);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Nama Lengkap :  ${staff.name}`, 25, 67);
  doc.text(`NIK Karyawan  :  ${staff.nik}`, 25, 73);
  
  // Col 2 metadata
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('B. POSISI & STRUKTURAL YAYASAN', 110, 61);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Jabatan Pokok :  ${staff.position}`, 110, 67);
  doc.text(`Divisi / Sektor :  ${staff.division}`, 110, 73);

  // Salaries & Deductions Sections side-by-side
  const formatIDR = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  // Gather left items (Allowances / Debet)
  const leftItems: { label: string; amount: number }[] = [];
  const baseSalary = salaryConfig ? salaryConfig.salaryBase : staff.salaryBase;
  leftItems.push({ label: 'Gaji Pokok Utama (Base)', amount: baseSalary });

  let totalGross = baseSalary;
  if (salaryConfig) {
    salaryConfig.components.forEach(comp => {
      if (comp.amount > 0 && comp.type === 'allowance') {
        leftItems.push({ label: comp.name, amount: comp.amount });
        totalGross += comp.amount;
      }
    });
  } else {
    const publicFieldIds = new Set(fieldsToUse.map(pf => pf.id));

    fieldsToUse.filter(f => f.type === 'allowance').forEach(field => {
      let value = 0;
      if (field.property) {
        value = Number(staff[field.property as keyof Staff]) || 0;
      } else {
        const found = staff.customFields?.find(cf => cf.id === field.id);
        value = found ? found.amount : 0;
      }
      if (value > 0) {
        leftItems.push({ label: field.name, amount: value });
        totalGross += value;
      }
    });

    if (staff.customFields) {
      staff.customFields.filter(f => f.type === 'allowance' && !publicFieldIds.has(f.id)).forEach(f => {
        leftItems.push({ label: f.name, amount: f.amount });
        totalGross += f.amount;
      });
    }
  }

  // Gather right items (Deductions / Kredit)
  const rightItems: { label: string; amount: number }[] = [];
  let totalDeds = 0;
  if (salaryConfig) {
    salaryConfig.components.forEach(comp => {
      if (comp.amount > 0 && comp.type === 'deduction') {
        rightItems.push({ label: comp.name, amount: comp.amount });
        totalDeds += comp.amount;
      }
    });
  } else {
    const publicFieldIds = new Set(fieldsToUse.map(pf => pf.id));

    fieldsToUse.filter(f => f.type === 'deduction').forEach(field => {
      let value = 0;
      if (field.property) {
        value = Number(staff[field.property as keyof Staff]) || 0;
      } else {
        const found = staff.customFields?.find(cf => cf.id === field.id);
        value = found ? found.amount : 0;
      }
      if (value > 0) {
        rightItems.push({ label: field.name, amount: value });
        totalDeds += value;
      }
    });

    if (staff.customFields) {
      staff.customFields.filter(f => f.type === 'deduction' && !publicFieldIds.has(f.id)).forEach(f => {
        rightItems.push({ label: f.name, amount: f.amount });
        totalDeds += f.amount;
      });
    }
  }

  // Symmetrical Side-by-Side Drawing
  let y = 92;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  doc.text('1. GAJI & TUNJANGAN (DEBET)', 20, y);
  doc.text('2. POTONGAN & IURAN (KREDIT)', 110, y);

  y += 2.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(20, y, 100, y);
  doc.line(110, y, 190, y);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  const maxRows = Math.max(leftItems.length, rightItems.length);
  let currentY = y;

  for (let i = 0; i < maxRows; i++) {
    currentY += 5.5;

    // Left Column allowance (aligning content inside grid x:20 to x:100)
    if (i < leftItems.length) {
      const item = leftItems[i];
      doc.text(item.label, 21, currentY);
      // No +/- prepended signs
      doc.text(formatIDR(item.amount), 99, currentY, { align: 'right' });
    }

    // Right Column deductions (aligning content inside grid x:110 to x:190)
    if (i < rightItems.length) {
      const item = rightItems[i];
      doc.text(item.label, 111, currentY);
      // No +/- prepended signs
      doc.text(formatIDR(item.amount), 189, currentY, { align: 'right' });
    }
  }

  // Draw Line for Totals
  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(20, currentY, 190, currentY);

  // Totals side-by-side
  currentY += 4.5;
  doc.setFont('Helvetica', 'bold');
  doc.text('TOTAL DEBET (BRUTO)', 21, currentY);
  doc.text(formatIDR(totalGross), 99, currentY, { align: 'right' });

  doc.text('TOTAL KREDIT (POTONGAN)', 111, currentY);
  doc.text(formatIDR(totalDeds), 189, currentY, { align: 'right' });

  currentY += 2.5;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(20, currentY, 190, currentY);

  const netSalary = totalGross - totalDeds;
  const remaining = Math.max(0, netSalary - paidAmount);

  // Take Home Pay - Elegant Formal Black & White Box (as per requirement 6)
  let ySum = currentY + 7;
  const isLunas = (remaining <= 0);
  const boxHeight = isLunas ? 12 : 23;

  // Draw clean B&W double border/sleek container outlines
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(15, 23, 42); // slate-900 border
  doc.setLineWidth(0.4);
  doc.rect(20, ySum, 170, boxHeight, 'D'); // Outline only

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TAKE-HOME PAY (TOTAL GAJI BERSIH DITERIMA)', 25, ySum + 7.5);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(formatIDR(netSalary), 185, ySum + 7.5, { align: 'right' });

  // Status Realisasi: if unpaid/termin display it. If fully lunas (paid), delete it entirely (as per requirement 5)
  if (!isLunas) {
    let statusLabel = '';
    let paymentDetail = '';
    if (paidAmount === 0) {
      statusLabel = 'BELUM DIBAYAR';
      paymentDetail = `SISA KEKURANGAN: ${formatIDR(netSalary)}`;
    } else {
      statusLabel = 'PEMBAYARAN TERMIN GANTUNG';
      paymentDetail = `SUDAH DIBAYARKAN: ${formatIDR(paidAmount)}   •   SISA KEKURANGAN: ${formatIDR(remaining)}`;
    }

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('STATUS REALISASI CAIR  :', 25, ySum + 13.5);

    doc.setFont('Helvetica', 'bold');
    doc.text(statusLabel, 64, ySum + 13.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(paymentDetail, 25, ySum + 18.5);
  }

  // Signatures / Footers
  // Added substantial spacing between THP and signatures block (as per requirement 8)
  let ySign = ySum + boxHeight + 25; 

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  
  const formattedToday = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Dikeluarkan di Jakarta, ${formattedToday}`, 25, ySign);
  doc.text('Petugas verifikasi keuangan,', 25, ySign + 5);
  doc.text('Penerima gaji struktural,', 130, ySign + 5);

  // Render Bendahara uploaded signature (Requirement 7)
  if (profile?.signatureUrl && profile.signatureUrl.startsWith('data:image')) {
    try {
      doc.addImage(profile.signatureUrl, 'PNG', 25, ySign + 7, 35, 13);
    } catch (e) {
      console.error('Failed to draw signature image onto PDF:', e);
    }
  }

  ySign += 22;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('BENDAHARA YAYASAN', 25, ySign);
  doc.text(staff.name.toUpperCase(), 130, ySign);

  // Underline signature rows
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.line(25, ySign + 1, 65, ySign + 1);
  doc.line(130, ySign + 1, 170, ySign + 1);

  // Download PDF file
  doc.save(`slip_gaji_${staff.nik}_${staff.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}
