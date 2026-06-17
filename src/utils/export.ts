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
  paidAmount: number = 0,
  treasurerName?: string
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
  
  const orgName = (profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase();
  doc.text(orgName, 20, 22);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  
  const orgAddress = profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10103';
  const orgNpwp = profile?.npwp ? `NPWP: ${profile.npwp}` : 'NPWP: 01.234.567.8-012.000';
  const orgPhone = profile?.phone ? `Telp: ${profile.phone}` : 'Telp: (021) 8888-MMB';
  const orgEmail = profile?.email ? `Email: ${profile.email}` : 'Email: info@yayasan-mmb.org';
  
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
  doc.text('Bendahara yayasan,', 25, ySign + 5);
  doc.text('Penerima,', 130, ySign + 5);

  // Render Bendahara uploaded signature (Requirement 7)
  if (profile?.signatureUrl && profile.signatureUrl.startsWith('data:image')) {
    try {
      doc.addImage(profile.signatureUrl, 'PNG', 25, ySign + 7, 35, 13);
    } catch (e) {
      console.error('Failed to draw signature image onto PDF:', e);
    }
  }

  ySign += 27; // Shifted slightly down to ensure signature/stamp does not overlap names
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const printedTreasurerName = treasurerName ? treasurerName.toUpperCase() : 'BENDAHARA YAYASAN';
  doc.text(printedTreasurerName, 25, ySign);
  doc.text(staff.name.toUpperCase(), 130, ySign);

  // Underline signature rows
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.line(25, ySign + 1, 65, ySign + 1);
  doc.line(130, ySign + 1, 170, ySign + 1);

  // Download PDF file
  doc.save(`slip_gaji_${staff.nik}_${staff.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function exportLedgerToPDF(data: any[], profile?: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [79, 70, 229]; // Indigo
  const textDark = [30, 41, 59]; // Slate 800
  const textLight = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50
  const borderLight = [226, 232, 240]; // Slate 200

  // Track dynamic pages
  let currentPage = 1;
  
  const drawKopSurat = (pageIndex: number) => {
    // 1. Title/Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const orgName = (profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase();
    doc.text(orgName, 15, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    const orgAddress = profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10103';
    const orgNpwp = profile?.npwp ? `NPWP: ${profile.npwp}` : 'NPWP: 01.234.567.8-012.000';
    const orgPhone = profile?.phone ? `Telp: ${profile.phone}` : 'Telp: (021) 8888-MMB';
    const orgEmail = profile?.email ? `Email: ${profile.email}` : 'Email: info@yayasan-mmb.org';

    doc.text(`${orgAddress} • ${orgNpwp}`, 15, 22);
    doc.text(`${orgPhone} • ${orgEmail}`, 15, 26);

    // Double Divider lines
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.line(15, 28, 195, 28);
    doc.setLineWidth(0.15);
    doc.line(15, 29.1, 195, 29.1);

    // Page indicator
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`Halaman ${pageIndex}`, 195, 13, { align: 'right' });
  };

  // Initialize page 1 Header
  drawKopSurat(1);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN JURNAL UMUM KAS', 15, 36);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  const formattedToday = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Dicetak pada: ${formattedToday} WIB`, 15, 41);

  // Calculate stats
  let totalDebit = 0;
  let totalKredit = 0;
  data.forEach((tx: any) => {
    if (tx.type === 'Pemasukan') {
      totalDebit += tx.amount || 0;
    } else if (tx.type === 'Pengeluaran') {
      totalKredit += tx.amount || 0;
    }
  });
  const netBalance = totalDebit - totalKredit;

  const formatIDR = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Draw Summary Mini Cards
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, 45, 180, 16, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.2);
  doc.rect(15, 45, 180, 16, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('TOTAL PEMASUKAN (DEBIT)', 20, 50);
  doc.text('TOTAL PENGELUARAN (KREDIT)', 80, 50);
  doc.text('SALDO NETTO KAS', 140, 50);

  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(formatIDR(totalDebit), 20, 55);
  doc.setTextColor(239, 68, 68); // red-500
  doc.text(formatIDR(totalKredit), 80, 55);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(formatIDR(netBalance), 140, 55);

  let y = 67;

  // Let's declare our columns details
  // Col widths: ID: 22, Tanggal: 18, Kategori: 27, Keterangan: 63, Debit: 25, Kredit: 25
  const colX = {
    id: 15,
    date: 37,
    category: 55,
    desc: 82,
    debit: 145,
    kredit: 170
  };

  const drawTableHeader = (yHeader: number) => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, yHeader, 180, 7.5, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('ID TRANS', colX.id + 1, yHeader + 5);
    doc.text('TANGGAL', colX.date + 1, yHeader + 5);
    doc.text('KATEGORI', colX.category + 1, yHeader + 5);
    doc.text('URAIAN / KAS KELUAR-MASUK', colX.desc + 1, yHeader + 5);
    doc.text('DEBIT (Rp)', colX.debit + 1, yHeader + 5);
    doc.text('KREDIT (Rp)', colX.kredit + 1, yHeader + 5);
  };

  drawTableHeader(y);
  y += 7.5;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);

  const rowHeight = 7.5;
  const bottomMargin = 20;

  data.forEach((tx: any, index: number) => {
    // Check page overflow
    if (y + rowHeight > 297 - bottomMargin) {
      doc.addPage();
      currentPage++;
      drawKopSurat(currentPage);
      y = 35;
      drawTableHeader(y);
      y += 7.5;
    }

    // Row zebra stripes
    if (index % 2 === 1) {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(15, y, 180, rowHeight, 'F');
    }

    // Draw bottom border line
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.setLineWidth(0.15);
    doc.line(15, y + rowHeight, 195, y + rowHeight);

    // Text color
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    // Truncate strings to prevent overlap
    const idStr = String(tx.id || '').substring(0, 10);
    const dateStr = String(tx.date || '').substring(0, 10);
    const categoryStr = String(tx.category || '').substring(0, 15);
    const descStr = String(tx.description || '').substring(0, 48);

    doc.setFont('Helvetica', 'bold');
    doc.text(idStr, colX.id + 1, y + 4.8);
    doc.setFont('Helvetica', 'normal');
    doc.text(dateStr, colX.date + 1, y + 4.8);
    doc.text(categoryStr, colX.category + 1, y + 4.8);
    doc.text(descStr, colX.desc + 1, y + 4.8);

    const isDebit = tx.type === 'Pemasukan';
    const amountVal = (tx.amount || 0).toLocaleString('id-ID');

    if (isDebit) {
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // green
      doc.text(amountVal, colX.debit + 1, y + 4.8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text('-', colX.kredit + 1, y + 4.8);
    } else {
      doc.text('-', colX.debit + 1, y + 4.8);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(239, 68, 68); // red
      doc.text(amountVal, colX.kredit + 1, y + 4.8);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    }

    y += rowHeight;
  });

  // Footer/Sign-off block
  if (y + 35 > 297 - bottomMargin) {
    doc.addPage();
    currentPage++;
    drawKopSurat(currentPage);
    y = 35;
  }

  y += 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  
  const placeDateStr = `Dikeluarkan di Yogyakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(placeDateStr, 15, y);
  doc.text('Bendahara Keuangan Yayasan,', 15, y + 5);

  // Sign image if uploaded
  if (profile?.signatureUrl && profile.signatureUrl.startsWith('data:image')) {
    try {
      doc.addImage(profile.signatureUrl, 'PNG', 15, y + 7, 35, 13);
    } catch (e) {
      console.error('Failed to draw signature on ledger PDF:', e);
    }
  }

  y += 24;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('BENDAHARA YAYASAN', 15, y);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(15, y + 1, 60, y + 1);

  // Save document
  doc.save(`laporan_jurnal_kas_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportLetterToPDF(letter: any, profile?: any, structures?: any[]) {
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

  // 1. Draw Kop Surat exactly matching user's requested layout
  // 1a. Draw logo (either custom uploaded brand logo or red logo emblem vector fallback)
  if (profile?.logoUrl && (profile.logoUrl.startsWith('data:image') || profile.logoUrl.startsWith('http') || profile.logoUrl.length > 50)) {
    try {
      doc.addImage(profile.logoUrl, 'PNG', 16, 11, 20, 0);
    } catch (err) {
      console.warn('Failed to add custom logo image to kop surat PDF:', err);
      doc.setDrawColor(185, 28, 28); // #B91C1C
      doc.setLineWidth(0.4);
      doc.circle(26, 21, 10, 'S');
      doc.setLineWidth(0.18);
      doc.circle(26, 21, 8.5, 'S');
      doc.setLineWidth(0.5);
      doc.line(26, 15.5, 26, 26.5);
      doc.line(22, 19.5, 30, 19.5);
      doc.setFont('Times', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(185, 28, 28);
      doc.text('MMB', 26, 25.5, { align: 'center' });
    }
  } else {
    doc.setDrawColor(185, 28, 28); // #B91C1C
    doc.setLineWidth(0.4);
    doc.circle(26, 21, 10, 'S');
    doc.setLineWidth(0.18);
    doc.circle(26, 21, 8.5, 'S');
    doc.setLineWidth(0.5);
    doc.line(26, 15.5, 26, 26.5); // vertical line
    doc.line(22, 19.5, 30, 19.5); // horizontal line
    doc.setFont('Times', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28);
    doc.text('MMB', 26, 25.5, { align: 'center' });
  }

  // 1b. Header text column aligned/centered relative to the page (with a dynamic offset for the left logo)
  const headerX = 114; // balanced center

  const kopTitleText = (profile?.kopTitle || profile?.name || 'YAYASAN MURID MUDA BERMISI').toUpperCase();
  const kopMottoText = profile?.kopMotto || 'Kabar baik. Pemuridan. Misi.';
  const pAddress = profile?.address || 'Link. Pal. Asem, RT.01/RW.07, Panggung Rawi, Kec. Jombang, Kota Cilegon, Banten 42412';
  const pEmail = profile?.email || 'esmofnusantara@gmail.com';
  const pPhone = profile?.phone || '+62 812 961 066 11';
  const pWebsite = profile?.website || '';

  // Row 1: EVANGELICAL STUDENT MOVEMENT
  doc.setFont('Helvetica', 'bolditalic');
  doc.setFontSize(16.5);
  doc.setTextColor(15, 23, 42);
  doc.text(kopTitleText, headerX, 17, { align: 'center' });

  // Row 2: Kabar baik. Pemuridan. Misi.
  doc.setFont('Times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(kopMottoText, headerX, 22, { align: 'center' });

  // Row 3: Alamat
  doc.setFont('Times', 'bold'); // matching image's subtle heavy font weight
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(pAddress, headerX, 26.5, { align: 'center' });

  // Row 4: email & Telephone (with optional website)
  doc.setFont('Times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const contactParts = [];
  if (pEmail) contactParts.push(`email : ${pEmail}`);
  if (pPhone) contactParts.push(`Telepon : ${pPhone}`);
  if (pWebsite) contactParts.push(`Website : ${pWebsite}`);
  const contactText = contactParts.join('        ');
  doc.text(contactText, headerX, 30.5, { align: 'center' });

  // 1c. Symmetrical elegant double-line divider
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.1);
  doc.line(20, 33, 190, 33);
  doc.setLineWidth(0.3);
  doc.line(20, 34, 190, 34);

  // --- Start Letter Body (using Times font as in standard formal letters) ---
  doc.setFont('Times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);

  // Indonesian date formatter
  const formatIndonesianDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const months = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        return `${day < 10 ? '0' + day : day} ${months[monthIndex]} ${year}`;
      }
    } catch (e) {
      // ignore
    }
    return dateStr;
  };

  const getCityFromAddress = (addressStr: string): string => {
    if (!addressStr) return 'Cilegon';
    const lower = addressStr.toLowerCase();
    if (lower.includes('cilegon')) return 'Cilegon';
    if (lower.includes('yogyakarta') || lower.includes('jogja')) return 'Yogyakarta';
    if (lower.includes('solo') || lower.includes('surakarta')) return 'Surakarta';
    if (lower.includes('semarang')) return 'Semarang';
    if (lower.includes('jakarta')) return 'Jakarta';
    if (lower.includes('bandung')) return 'Bandung';
    
    // Fallback extraction
    const kotaIndex = lower.indexOf('kota ');
    if (kotaIndex !== -1) {
      const sub = addressStr.substring(kotaIndex + 5).trim();
      const firstWord = sub.split(/[\s,]+/)[0];
      if (firstWord) return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    }
    return 'Cilegon';
  };

  const city = getCityFromAddress(pAddress);
  const cleanDateStr = formatIndonesianDate(letter.date || new Date().toISOString().substring(0, 10));
  const finalPlaceDate = letter.signPlaceDate || `${city}, ${cleanDateStr}`;
  doc.setFont('Times', 'normal');
  doc.text(finalPlaceDate, 185, 45, { align: 'right' });

  // 3. Serial Number and Subject block matching standard left margin 25mm
  doc.text(`Nomor   :  ${letter.letterNumber || '005/MMB/TPP/VI/2026'}`, 25, 53);
  doc.text(`Perihal   :  ${letter.subject || 'Ucapan Terima Kasih atas Dukungan Pelayanan'}`, 25, 58.5);

  // 4. Recipient block aligned at left margin 25mm
  doc.text('Kepada Yth.', 25, 70);
  
  // Format recipient lines cleanly with left margin 25mm (split/newline is fully supported)
  const recipientRaw = letter.recipient || 'Pdt. Jeffrey Siauw, D.Th.\nLead Pastor Gracelife Community Church';
  const recipientLines = recipientRaw.split('\n');
  let recipientY = 75.5;
  
  recipientLines.forEach((line: string) => {
    doc.text(line, 25, recipientY);
    recipientY += 5.5;
  });

  doc.text('di Tempat', 25, recipientY + 1);

  // 5. Salutation and paragraphs content wrapping with Left margin 25mm, Right margin 25mm (Width = 160mm)
  let y = recipientY + 14;
  doc.text('Dengan hormat,', 25, y);
  
  y += 8;

  const contentText = letter.content || 
    'Puji syukur kepada Tuhan atas dukungan dan perhatian yang diberikan kepada pelayanan MMB.\n\nMelalui surat ini, kami mengucapkan terima kasih atas komitmen Gracelife Community Church untuk melanjutkan dukungan dana pelayanan bagi Sdr. Yusuf Raja Tamba selama periode Juni 2026 – Mei 2027.\n\nKami menerima dan menghargai dukungan tersebut. Kiranya Tuhan membalas setiap kebaikan and terus memberkati pelayanan serta jemaat Gracelife Community Church.\n\nTerima kasih atas kemitraan dalam pekerjaan Tuhan.';

  doc.setLineHeightFactor(1.6); // set comfortable line height factor globally for body text

  const paragraphs = contentText.split('\n');
  
  paragraphs.forEach((para: string) => {
    const cleanPara = para.trim();
    if (!cleanPara) {
      y += 2.5; // smaller spacing for blank lines
      return;
    }
    // Using exactly 160 width for standard margins of 2.5 cm on left, 2.5 cm on right (210 - 25 - 25 = 160)
    const lines = doc.splitTextToSize(cleanPara, 160);
    
    // Group lines to draw as a block per page to get flawless full justification natively from jsPDF
    let pageLines: string[] = [];
    lines.forEach((line: string, index: number) => {
      // Check page overflow boundaries (297 - 35 = 262)
      if (y > 262) {
        if (pageLines.length > 0) {
          const startY = y - (pageLines.length * 6);
          doc.text(pageLines, 25, startY, { align: 'justify', maxWidth: 160 });
          pageLines = [];
        }
        doc.addPage();
        y = 40; // 40 mm top margin
      }
      pageLines.push(line);
      y += 6;
    });
    
    if (pageLines.length > 0) {
      const startY = y - (pageLines.length * 6);
      doc.text(pageLines, 25, startY, { align: 'justify', maxWidth: 160 });
    }
    
    y += 3.5; // space between paragraphs
  });

  // 6. Double Signature block
  // Ensure we don't overflow the page, if so add a new page (needs 45mm space)
  if (y + 45 > 267) {
    doc.addPage();
    y = 40;
  }

  y += 10;
  const signatureY = y;

  const leftType = letter.signLeftType || 'Ketua';
  const rightType = letter.signRightType || 'Sekretaris';
  const showStamp = letter.showStamp !== false;

  // Resolve dynamic names from structures of high organizational levels
  const ketuaNode = structures?.find(n => n?.id === 'ketua' || n?.id === 'ketua_yayasan') || structures?.find(n => n?.title?.toLowerCase().includes('ketua'));
  const ketuaNameResolved = ketuaNode?.name || 'Fernandes';

  const sekretarisNode = structures?.find(n => n?.id === 'sekretaris') || structures?.find(n => n?.title?.toLowerCase().includes('sekretaris'));
  const sekretarisNameResolved = sekretarisNode?.name || 'Yusuf Raja Tamba';

  const bendaharaNode = structures?.find(n => n?.id === 'bendahara') || structures?.find(n => n?.title?.toLowerCase().includes('bendahara'));
  const bendaharaNameResolved = bendaharaNode?.name || 'Angelina';

  const leftName = letter.signLeftName || (
    leftType === 'Ketua' || leftType === 'ketua' ? ketuaNameResolved : 
    leftType === 'Sekretaris' || leftType === 'sekretaris' ? sekretarisNameResolved : 
    leftType === 'Bendahara' || leftType === 'bendahara' ? bendaharaNameResolved : ''
  );
  const leftTitle = letter.signLeftTitle || (
    leftType === 'Ketua' || leftType === 'ketua' ? 'Ketua Yayasan' : 
    leftType === 'Sekretaris' || leftType === 'sekretaris' ? 'Sekretaris Yayasan' : 
    leftType === 'Bendahara' || leftType === 'bendahara' ? 'Bendahara Yayasan' : ''
  );

  const rightName = letter.signRightName || (
    rightType === 'Ketua' || rightType === 'ketua' ? ketuaNameResolved : 
    rightType === 'Sekretaris' || rightType === 'sekretaris' ? sekretarisNameResolved : 
    rightType === 'Bendahara' || rightType === 'bendahara' ? bendaharaNameResolved : ''
  );
  const rightTitle = letter.signRightTitle || (
    rightType === 'Ketua' || rightType === 'ketua' ? 'Ketua Yayasan' : 
    rightType === 'Sekretaris' || rightType === 'sekretaris' ? 'Sekretaris Yayasan' : 
    rightType === 'Bendahara' || rightType === 'bendahara' ? 'Bendahara Yayasan' : ''
  );

  const stampY = signatureY + 11;

  // Symmetrical coordinates within standard 2.5cm left, 2.5cm right margin area:
  // Center of Left is 70
  // Center of Right is 150
  
  // Custom function to resolve loaded profile signatures dynamically by Type/Title/Name matching
  function resolveSignatureImg(type: string, title: string, name: string, prof: any) {
    const tType = String(type || '').toLowerCase();
    const tTitle = String(title || '').toLowerCase();
    const tName = String(name || '').toLowerCase();

    // 0. Check customSignatures list in profile
    if (prof?.customSignatures && Array.isArray(prof.customSignatures)) {
      const match = prof.customSignatures.find((cs: any) => {
        const csName = String(cs.name || '').toLowerCase();
        const csTitle = String(cs.title || '').toLowerCase();
        return (tName && csName.includes(tName)) || (tTitle && csTitle.includes(tTitle));
      });
      if (match && match.signatureUrl) {
        return match.signatureUrl;
      }
    }

    if (tName.includes('fernandes') || tName.includes('fernandes')) {
      return prof?.signatureChairmanUrl || '';
    }
    if (tName.includes('faisal') || tName.includes('johannes lie') || tName.includes('lie') || tName.includes('yusuf')) {
      return prof?.signatureSecretaryUrl || '';
    }
    if (tName.includes('ruth') || tName.includes('sarah') || tName.includes('sitorus') || tName.includes('angelina')) {
      return prof?.signatureTreasurerUrl || prof?.signatureUrl || '';
    }

    if (tType.includes('ketua') || tTitle.includes('ketua') || tType === 'ketuapembina' || tTitle.includes('pembina')) {
      return prof?.signatureChairmanUrl || '';
    }
    if (tType.includes('sekretaris') || tTitle.includes('sekretaris') || tType.includes('secretary')) {
      return prof?.signatureSecretaryUrl || '';
    }
    if (tType.includes('bendahara') || tTitle.includes('bendahara') || tType.includes('treasurer')) {
      return prof?.signatureTreasurerUrl || prof?.signatureUrl || '';
    }

    if (tType === 'ketua') return prof?.signatureChairmanUrl || '';
    if (tType === 'sekretaris') return prof?.signatureSecretaryUrl || '';
    if (tType === 'bendahara') return prof?.signatureTreasurerUrl || prof?.signatureUrl || '';

    return '';
  }

  const isRightActive = rightType !== 'None' && rightType !== 'none';

  if (leftType !== 'None' && leftType !== 'none') {
    doc.setFont('Times', 'normal');
    doc.setFontSize(10.5);
    
    // If Right signature is active, print leftTitle as the label above the left signature block
    // If Right signature is NOT active, print finalPlaceDate as the label above the left signature block
    const leftLabelText = isRightActive ? `${leftTitle},` : finalPlaceDate;
    doc.text(leftLabelText, 70, signatureY, { align: 'center' });

    // Draw Left Signature - either image or vector fallback representing professional line ink
    let signatureLeftImg = resolveSignatureImg(leftType, leftTitle, leftName, profile);

    if (signatureLeftImg && (signatureLeftImg.startsWith('data:image') || signatureLeftImg.startsWith('http') || signatureLeftImg.length > 50)) {
      try {
        doc.addImage(signatureLeftImg, 'PNG', 55, stampY - 8, 30, 15);
      } catch (err) {
        console.warn('Failed to draw custom left signature image:', err);
      }
    } else {
      // Draw handdrawn ink stroke vector for Left
      doc.setDrawColor(15, 23, 42); // slate 900
      doc.setLineWidth(0.45);
      doc.line(56, stampY + 3, 65, stampY - 4);
      doc.line(65, stampY - 4, 70, stampY + 6);
      doc.line(70, stampY + 6, 76, stampY - 7);
      doc.line(62, stampY - 1, 84, stampY - 1);
      doc.line(68, stampY - 1, 82, stampY + 5);
    }
  }

  if (isRightActive) {
    doc.setFont('Times', 'normal');
    doc.setFontSize(10.5);
    
    // Above the Right signature block, print finalPlaceDate (e.g. Cilegon, 12 Juni 2026)!
    doc.text(finalPlaceDate, 150, signatureY, { align: 'center' });

    // Draw Right Signature - either image or vector fallback
    let signatureRightImg = resolveSignatureImg(rightType, rightTitle, rightName, profile);

    if (signatureRightImg && (signatureRightImg.startsWith('data:image') || signatureRightImg.startsWith('http') || signatureRightImg.length > 50)) {
      try {
        doc.addImage(signatureRightImg, 'PNG', 135, stampY - 8, 30, 15);
      } catch (err) {
        console.warn('Failed to draw custom right signature image:', err);
      }
    } else {
      // Draw handdrawn ink stroke vector for Right
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.45);
      doc.line(136, stampY + 2, 144, stampY - 5);
      doc.line(144, stampY - 5, 150, stampY + 7);
      doc.line(150, stampY + 7, 158, stampY - 3);
      doc.line(132, stampY, 164, stampY);
    }
  }

  // Draw official stamp
  if (showStamp) {
    const stampTarget = letter.stampTarget || 'left';
    const stampSize = letter.stampSize || 22;
    const stampOffsetX = Number(letter.stampOffsetX) || 0;
    const stampOffsetY = Number(letter.stampOffsetY) || 0;

    let targetCenterX = 70;
    if (stampTarget === 'right') {
      targetCenterX = 150;
    } else if (stampTarget === 'center') {
      targetCenterX = 110;
    }

    // Shift left slightly to make it overlap 1/4 of the signature instead of covers it entirely
    if (stampTarget === 'left' || stampTarget === 'right') {
      targetCenterX -= 12; // Shifted left to override only 1/4 of signature
    }

    const finalStampX = targetCenterX + stampOffsetX;
    const finalStampY = stampY + stampOffsetY;

    if (profile?.stampUrl && (profile.stampUrl.startsWith('data:image') || profile.stampUrl.startsWith('http') || profile.stampUrl.length > 50)) {
      try {
        const drawX = finalStampX - (stampSize / 2);
        const drawY = finalStampY - (stampSize / 2);
        doc.addImage(profile.stampUrl, 'PNG', drawX, drawY, stampSize, stampSize);
      } catch (e) {
        console.warn('Failed to draw uploaded stampUrl image:', e);
      }
    } else {
      // Legacy vector official blue round ink stamp fallback (using dynamic variables!)
      const radius = stampSize / 2;
      doc.setDrawColor(37, 99, 235); // Stamp Blue/Indigo
      doc.setLineWidth(0.45);
      doc.circle(finalStampX, finalStampY, radius, 'S');
      doc.setLineWidth(0.18);
      doc.circle(finalStampX, finalStampY, radius * 0.85, 'S');
      
      // Text inside stamp relative to dynamic radius and center
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(Math.max(3, radius * 0.45));
      doc.setTextColor(37, 99, 235);
      doc.text('YAYASAN', finalStampX, finalStampY - (radius * 0.45), { align: 'center' });
      doc.setFontSize(Math.max(6, radius * 0.9));
      doc.text('MMB', finalStampX, finalStampY + (radius * 0.09), { align: 'center' });
      doc.setFontSize(Math.max(3, radius * 0.45));
      doc.text('CILEGON', finalStampX, finalStampY + (radius * 0.55), { align: 'center' });
    }
  }

  // Restore fonts to print final names with underlines
  doc.setFont('Times', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);

  // Bottom names and lines (shifted down dynamically to look close and unified as requested)
  if (leftType !== 'None' && leftType !== 'none') {
    doc.text(leftName, 70, signatureY + 26, { align: 'center' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(50, signatureY + 27, 90, signatureY + 27);
    
    // Bottom Titles
    doc.setFont('Times', 'normal');
    doc.setFontSize(9.5);
    doc.text(leftTitle, 70, signatureY + 31.5, { align: 'center' });
  }

  if (rightType !== 'None' && rightType !== 'none') {
    doc.setFont('Times', 'bold');
    doc.setFontSize(10.5);
    doc.text(rightName, 150, signatureY + 26, { align: 'center' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(130, signatureY + 27, 170, signatureY + 27);

    // Bottom Titles
    doc.setFont('Times', 'normal');
    doc.setFontSize(9.5);
    doc.text(rightTitle, 150, signatureY + 31.5, { align: 'center' });
  }

  // Draw additional signatures if present
  if (letter.additionalSignatures && Array.isArray(letter.additionalSignatures) && letter.additionalSignatures.length > 0) {
    const startAddY = signatureY + 42;
    doc.setFont('Times', 'normal');
    doc.setFontSize(10.5);
    
    const totalAdd = letter.additionalSignatures.length;
    letter.additionalSignatures.forEach((sig: any, idx: number) => {
      const colIdx = idx % 2;
      const rowIdx = Math.floor(idx / 2);
      const currentAddY = startAddY + (rowIdx * 38);
      
      // Determine vertical/horizontal alignment coordinates
      // If there is only 1 signature, place it at the center (X = 110).
      // If it is the last third element (length is odd e.g. 3) and occupies a row on its own, place it at center (X = 110).
      let xPos = colIdx === 0 ? 70 : 150;
      if (totalAdd === 1) {
        xPos = 110;
      } else if (idx === totalAdd - 1 && colIdx === 0) {
        xPos = 110;
      }
      
      // Draw Title
      doc.setFont('Times', 'normal');
      doc.setFontSize(10.5);
      doc.text(`${sig.title},`, xPos, currentAddY, { align: 'center' });
      
      // Resolve & Draw signature image
      const sigImg = resolveSignatureImg('', sig.title || '', sig.name || '', profile);
      if (sigImg && (sigImg.startsWith('data:image') || sigImg.startsWith('http') || sigImg.length > 50)) {
        try {
          doc.addImage(sigImg, 'PNG', xPos - 15, currentAddY + 4, 30, 15);
        } catch (err) {
          console.warn('Failed to draw additional signature image in PDF:', err);
        }
      } else {
        // Draw standard clean professional vector line for additional
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.3);
        doc.line(xPos - 5, currentAddY + 12, xPos + 5, currentAddY + 12);
      }
      
      // Draw Name underline
      doc.setFont('Times', 'bold');
      doc.setFontSize(10.5);
      doc.text(sig.name, xPos, currentAddY + 23, { align: 'center' });
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(xPos - 20, currentAddY + 24, xPos + 20, currentAddY + 24);
      
      // Draw sub-title
      doc.setFont('Times', 'normal');
      doc.setFontSize(8.5);
      doc.text(sig.title, xPos, currentAddY + 28, { align: 'center' });
    });
  }

  // Save the outward letter document
  const fileName = `surat_keluar_${letter.letterNumber ? letter.letterNumber.replace(/\//g, '_') : 'esm_official'}.pdf`;
  doc.save(fileName);
}

export function exportDashboardSummaryToPDF(birthdays: any[], pendingApprovals: any[], profile?: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [79, 70, 229]; // Indigo
  const textDark = [30, 41, 59]; // Slate 800
  const textLight = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50
  const borderLight = [226, 232, 240]; // Slate 200

  // 1. Header (Kop Surat)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const orgName = (profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase();
  doc.text(orgName, 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  const orgAddress = profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10103';
  const orgPhone = profile?.phone ? `Telp: ${profile.phone}` : 'Telp: (021) 8888-MMB';
  const orgEmail = profile?.email ? `Email: ${profile.email}` : 'Email: info@yayasan-mmb.org';
  doc.text(`${orgAddress} • ${orgPhone} • ${orgEmail}`, 15, 22);

  // Divider lines
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.line(15, 25, 195, 25);

  // Document Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('RINGKASAN EKSEKUTIF BULANAN & ANTRIAN APPROVAL', 15, 33);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  const monthName = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const formattedToday = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Periode: ${monthName}  •  Dicetak pada: ${formattedToday} WIB`, 15, 38);

  let y = 44;

  // SECTION A: BIRTHDAYS
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(15, y, 180, 6, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`A. DAFTAR ULANG TAHUN ANGGOTA BULAN ${monthName.toUpperCase()} (${birthdays.length} ANGGOTA)`, 18, y + 4.2);

  y += 6;

  // Birthday table headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.text('NO', 18, y + 4.2);
  doc.text('NAMA LENGKAP', 26, y + 4.2);
  doc.text('PANGGILAN', 75, y + 4.2);
  doc.text('KOMPONEN', 105, y + 4.2);
  doc.text('WILAYAH', 135, y + 4.2);
  doc.text('TANGGAL LAHIR', 165, y + 4.2);

  y += 6.5;

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  if (birthdays.length === 0) {
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.rect(15, y, 180, 8, 'S');
    doc.setFont('Helvetica', 'italic');
    doc.text('Tidak ada anggota yang berulang tahun di bulan ini.', 20, y + 5);
    y += 8;
  } else {
    birthdays.forEach((m, idx) => {
      // Row zebra stripes
      if (idx % 2 === 1) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, y, 180, 6.5, 'F');
      }

      // Border bottom
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.setLineWidth(0.15);
      doc.line(15, y + 6.5, 195, y + 6.5);

      doc.setFontSize(7);
      doc.text(String(idx + 1), 18, y + 4.5);
      doc.text(m.fullName || '', 26, y + 4.5);
      doc.text(m.nickName || '', 75, y + 4.5);
      doc.text(m.component || '', 105, y + 4.5);
      doc.text(m.region || '', 135, y + 4.5);
      
      let bDateStr = m.birthDate || '';
      try {
        const dParts = bDateStr.split('-');
        if (dParts.length === 3) {
          bDateStr = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
        }
      } catch (e) { }

      doc.text(bDateStr, 165, y + 4.5);
      y += 6.5;
    });
  }

  y += 8;

  // Check if we need a new page for Section B
  if (y + 40 > 280) {
    doc.addPage();
    y = 20;
  }

  // SECTION B: PENDING APPROVALS
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(15, y, 180, 6, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`B. ANTREAN VERIFIKASI APPROVAL CENTER (${pendingApprovals.length} PENGAJUAN PENDING)`, 18, y + 4.2);

  y += 6;

  // Approval table headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.text('MODUL', 18, y + 4.2);
  doc.text('JUDUL AKOMODASI / PROGRAM', 40, y + 4.2);
  doc.text('DIPOSKAN OLEH', 105, y + 4.2);
  doc.text('TANGGAL', 140, y + 4.2);
  doc.text('ANGGARAN / NOMINAL', 165, y + 4.2);

  y += 6.5;

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  if (pendingApprovals.length === 0) {
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.rect(15, y, 180, 8, 'S');
    doc.setFont('Helvetica', 'italic');
    doc.text('Semua pengajuan telah diselesaikan (Antrean bersih).', 20, y + 5);
    y += 8;
  } else {
    pendingApprovals.forEach((app, idx) => {
      // Check page overflow inside list
      if (y + 10 > 280) {
        doc.addPage();
        y = 20;
        // redraw header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(15, y, 180, 6.5, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('MODUL', 18, y + 4.2);
        doc.text('JUDUL AKOMODASI / PROGRAM', 40, y + 4.2);
        doc.text('DIPOSKAN OLEH', 105, y + 4.2);
        doc.text('TANGGAL', 140, y + 4.2);
        doc.text('ANGGARAN / NOMINAL', 165, y + 4.2);
        y += 6.5;
      }

      // Row zebra stripes
      if (idx % 2 === 1) {
        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.rect(15, y, 180, 7.5, 'F');
      }

      // Border bottom
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.setLineWidth(0.15);
      doc.line(15, y + 7.5, 195, y + 7.5);

      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(app.module || '', 18, y + 4.8);
      
      const titleStr = `${app.title || ''} (${app.description || ''})`.substring(0, 48);
      doc.text(titleStr, 40, y + 4.8);
      doc.text(app.requestedBy || '', 105, y + 4.8);
      doc.text(app.requestedAt || '', 140, y + 4.8);

      const amtVal = app.amount ? `Rp ${app.amount.toLocaleString('id-ID')}` : '-';
      doc.setFont('Helvetica', 'bold');
      doc.text(amtVal, 165, y + 4.8);
      doc.setFont('Helvetica', 'normal');

      y += 7.5;
    });
  }

  // Footer/Signatures block
  if (y + 35 > 280) {
    doc.addPage();
    y = 20;
  }

  y += 12;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Cilegon, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 15, y);
  doc.text('Petugas Administrasi Pusat,', 15, y + 4.5);

  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('SEKRETARIAT YAYASAN MMB', 15, y);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.25);
  doc.line(15, y + 1, 65, y + 1);

  // Save PDF
  doc.save(`ringkasan_dashboard_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportFinanceReportPDF(transactions: any[], profile: any, startDate: string, endDate: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42];
  const secondaryColor = [79, 70, 229];
  const textDark = [30, 41, 59];
  const textLight = [100, 116, 139];
  const borderLight = [226, 232, 240];

  // 1. Kop Surat
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text((profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase(), 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`${profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat'}  •  Telp: ${profile?.phone || '+62-812-3456'}  •  ${profile?.email || 'info@muridmudabermisi.or.id'}`, 15, 22);

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.line(15, 24, 195, 24);

  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN JURNAL REKAPITULASI KEUANGAN & KAS', 15, 31);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Rentang Analisis: ${startDate || 'Awal'} s.d. ${endDate || 'Akhir'}  •  Dicetak: ${new Date().toLocaleDateString('id-ID')} WIB`, 15, 35);

  // Financial Stats Box
  const approvedTx = transactions.filter(t => t.status === 'Approved');
  const totalIn = approvedTx.filter(t => t.type?.toLowerCase() === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOut = approvedTx.filter(t => t.type?.toLowerCase() === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIn - totalOut;

  doc.setFillColor(248, 250, 252);
  doc.rect(15, 39, 180, 15, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 39, 180, 15, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(74, 85, 104);
  doc.text('TOTAL DEBIT (INCOME)', 20, 44);
  doc.text('TOTAL KREDIT (EXPENSE)', 80, 44);
  doc.text('SALDO NETTO (CHASHFLOW)', 140, 44);

  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Green
  doc.text(`Rp ${totalIn.toLocaleString('id-ID')}`, 20, 50);
  doc.setTextColor(239, 68, 68); // Red
  doc.text(`Rp ${totalOut.toLocaleString('id-ID')}`, 80, 50);
  doc.setTextColor(net >= 0 ? 37 : 220, net >= 0 ? 99 : 38, net >= 0 ? 235 : 38); // Green / Red
  doc.text(`Rp ${net.toLocaleString('id-ID')}`, 140, 50);

  let y = 60;

  // Table Headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TANGGAL', 18, y + 4.2);
  doc.text('KATEGORI', 40, y + 4.2);
  doc.text('DESKRIPSI', 75, y + 4.2);
  doc.text('PIHAK RELASI', 130, y + 4.2);
  doc.text('TIPE', 165, y + 4.2);
  doc.text('NOMINAL', 180, y + 4.2);

  y += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  if (transactions.length === 0) {
    doc.text('Tidak ada transaksi terekam dalam parameter ini.', 20, y + 5);
  } else {
    transactions.slice(0, 24).forEach((t, idx) => {
      // Row render
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(15, y + 6, 195, y + 6);

      doc.setFontSize(7);
      doc.text(t.date || '', 18, y + 4.2);
      doc.text(t.category || '', 40, y + 4.2);
      doc.text((t.description || '').substring(0, 32), 75, y + 4.2);
      doc.text((t.sourceOrRecipient || '').substring(0, 20), 130, y + 4.2);
      doc.text(t.type?.toLowerCase() === 'income' ? 'DEBIT' : 'KREDIT', 165, y + 4.2);
      doc.text(t.amount.toLocaleString('id-ID'), 180, y + 4.2);

      y += 6;
    });
  }

  // Footer Signatures
  y += 15;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Pengurus Keuangan Yayasan,`, 140, y);
  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Bendahara Umum', 140, y);
  
  doc.save(`laporan_keuangan_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportActivitiesReportPDF(meetings: any[], groups: any[], profile: any) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42];
  const textDark = [30, 41, 59];
  const textLight = [100, 116, 139];
  const borderLight = [226, 232, 240];

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase(), 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`${profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat'}  •  Telp: ${profile?.phone || '+62-812-3456'}`, 15, 22);

  doc.setDrawColor(30, 41, 59);
  doc.line(15, 24, 195, 24);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN KEGIATAN KAJIAN & KELOMPOK KECIL (KTB)', 15, 31);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} WIB  •  Total Kelompok Aktif: ${groups.length}`, 15, 35);

  let y = 42;

  // Table Headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TANGGAL LOG', 18, y + 4.2);
  doc.text('KELOMPOK', 45, y + 4.2);
  doc.text('MATERI KAJIAN', 85, y + 4.2);
  doc.text('KEKOSONGAN / HADIR', 150, y + 4.2);

  y += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  if (meetings.length === 0) {
    doc.text('Tidak ada catatan log pertemuan yang terekam.', 20, y + 5);
  } else {
    meetings.slice(0, 24).forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(15, y + 6, 195, y + 6);

      const groupName = groups.find(g => g.id === m.groupId)?.name || m.groupId;

      doc.setFontSize(7);
      doc.text(m.date || '', 18, y + 4.2);
      doc.text(groupName, 45, y + 4.2);
      doc.text(m.materialName || '', 85, y + 4.2);
      doc.text(`${m.attendance?.length || 0} Anggota Hadir`, 150, y + 4.2);

      y += 6;
    });
  }

  // Footer Signatures
  y += 15;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Sekretariat Pembinaan KTB,`, 140, y);
  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Sekretaris Yayasan', 140, y);

  doc.save(`laporan_kegiatan_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportStaffReportPDF(staffs: any[], profile: any, structures?: any[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42];
  const textDark = [30, 41, 59];
  const textLight = [100, 116, 139];
  const borderLight = [226, 232, 240];

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase(), 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`${profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat'}  •  NPWP: ${profile?.npwp || '01.234.567.8'}`, 15, 22);

  doc.setDrawColor(30, 41, 59);
  doc.line(15, 24, 195, 24);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN REKAPITULASI DATA STAF & JABATAN', 15, 31);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} WIB  •  Total Staf Aktif: ${staffs.length}`, 15, 35);

  let y = 42;

  // Table Headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NIK', 18, y + 4.2);
  doc.text('NAMA STAF', 35, y + 4.2);
  doc.text('JABATAN', 80, y + 4.2);
  doc.text('DIVISI', 120, y + 4.2);
  doc.text('STATUS', 155, y + 4.2);
  doc.text('TANGGAL GABUNG', 172, y + 4.2);

  y += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  staffs.forEach((s, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 6, 'F');
    }
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(15, y + 6, 195, y + 6);

    doc.setFontSize(7);
    doc.text(s.nik || '', 18, y + 4.2);
    doc.text(s.name || '', 35, y + 4.2);
    doc.text(s.position || '', 80, y + 4.2);
    doc.text(s.division || '', 120, y + 4.2);
    doc.text(s.status || '', 155, y + 4.2);
    doc.text(s.joinedDate || '', 172, y + 4.2);

    y += 6;
  });

  // Footer Signatures
  y += 15;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Direktur Personalia & SDM,`, 140, y);
  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const ketuaNode = structures?.find(n => n?.id === 'ketua' || n?.title?.toLowerCase().includes('ketua') || n?.id === 'ketua_yayasan');
  const ketuaNameResolved = ketuaNode?.name || 'Dr. (H.C.) Dr. Joseph Sinaga';
  doc.text(ketuaNameResolved, 140, y);

  doc.save(`laporan_staf_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportMemberReportPDF(members: any[], profile: any, structures?: any[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42];
  const textDark = [30, 41, 59];
  const textLight = [100, 116, 139];
  const borderLight = [226, 232, 240];

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase(), 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`${profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat'}  •  Website: ${profile?.website || 'www.muridmudabermisi.or.id'}`, 15, 22);

  doc.setDrawColor(30, 41, 59);
  doc.line(15, 24, 195, 24);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN REGISTRASI ANGGOTA & BINAAN', 15, 31);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} WIB  •  Total Anggota Terdaftar: ${members.length}`, 15, 35);

  let y = 42;

  // Table Headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ID ANGGOTA', 18, y + 4.2);
  doc.text('NAMA LENGKAP', 42, y + 4.2);
  doc.text('KOMPONEN', 95, y + 4.2);
  doc.text('WILAYAH', 125, y + 4.2);
  doc.text('STATUS', 155, y + 4.2);
  doc.text('YANG MEMBINA', 170, y + 4.2);

  y += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  members.slice(0, 32).forEach((m, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 6, 'F');
    }
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(15, y + 6, 195, y + 6);

    doc.setFontSize(7);
    doc.text(m.id || '', 18, y + 4.2);
    doc.text(m.fullName || '', 42, y + 4.2);
    doc.text(m.component || '', 95, y + 4.2);
    doc.text(m.region || '', 125, y + 4.2);
    doc.text(m.statusKeaktifan || '', 155, y + 4.2);
    doc.text(m.mentor || 'Tidak terekam', 170, y + 4.2);

    y += 6;
  });

  // Footer Signatures
  y += 15;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Sekretariat Binaan Siswa & Anggota,`, 140, y);
  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Sekretaris Yayasan', 140, y);

  doc.save(`laporan_anggota_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportPartnerReportPDF(partners: any[], donations: any[], profile: any, structures?: any[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42];
  const textDark = [30, 41, 59];
  const textLight = [100, 116, 139];
  const borderLight = [226, 232, 240];

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text((profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase(), 15, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`${profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat'}  •  Telp: ${profile?.phone || '+62-812'}`, 15, 22);

  doc.setDrawColor(30, 41, 59);
  doc.line(15, 24, 195, 24);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN REKAPITULASI KEMITRAAN & DONATUR MITRA', 15, 31);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} WIB  •  Total Mitra: ${partners.length}`, 15, 35);

  let y = 42;

  // Table Headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 6.5, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NAMA DONATUR/MITRA', 18, y + 4.2);
  doc.text('TIPE MITRA', 75, y + 4.2);
  doc.text('STATUS', 105, y + 4.2);
  doc.text('KOMITMEN DONASI', 130, y + 4.2);
  doc.text('FREKUENSI', 170, y + 4.2);

  y += 6.5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  partners.forEach((p, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y, 180, 6, 'F');
    }
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(15, y + 6, 195, y + 6);

    doc.setFontSize(7);
    doc.text(p.name || '', 18, y + 4.2);
    doc.text(p.partnerType || '', 75, y + 4.2);
    doc.text(p.status || '', 105, y + 4.2);
    doc.text(`Rp ${(p.commitmentAmount || 0).toLocaleString('id-ID')}`, 130, y + 4.2);
    doc.text(p.frequency || '', 170, y + 4.2);

    y += 6;
  });

  // Footer Signatures
  y += 15;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text(`Hubungan Mitra & Fundraising,`, 140, y);
  y += 18;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  const ketuaNode = structures?.find(n => n?.id === 'ketua' || n?.title?.toLowerCase().includes('ketua') || n?.id === 'ketua_yayasan');
  const ketuaNameResolved = ketuaNode?.name || 'Dr. (H.C.) Dr. Joseph Sinaga';
  doc.text(ketuaNameResolved, 140, y);

  doc.save(`laporan_kemitraan_${new Date().toISOString().substring(0, 10)}.pdf`);
}

export function exportActivityDetailToPDF(
  activity: any,
  rundowns: any[],
  preparations: any[],
  transactions: any[],
  profile?: any,
  structures?: any[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [15, 23, 42]; // Slate 900
  const secondaryColor = [79, 70, 229]; // Indigo
  const textDark = [30, 41, 59]; // Slate 800
  const textLight = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50
  const borderLight = [226, 232, 240]; // Slate 200

  let currentPage = 1;
  const formatIDR = (num: number) => 'Rp ' + (num || 0).toLocaleString('id-ID');

  const drawKopSurat = (pageIndex: number) => {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    const orgName = (profile?.name || 'YAYASAN MURID MUDA BERMISI (MMB)').toUpperCase();
    doc.text(orgName, 15, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    const orgAddress = profile?.address || 'Jl. Diponegoro No. 84, Menteng, Jakarta Pusat, DKI Jakarta 10103';
    const orgNpwp = profile?.npwp ? `NPWP: ${profile.npwp}` : 'NPWP: 01.234.567.8-012.000';
    const orgPhone = profile?.phone ? `Telp: ${profile.phone}` : 'Telp: (021) 8888-MMB';
    const orgEmail = profile?.email ? `Email: ${profile.email}` : 'Email: info@yayasan-mmb.org';

    doc.text(`${orgAddress} • ${orgNpwp}`, 15, 22);
    doc.text(`${orgPhone} • ${orgEmail}`, 15, 26);

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.line(15, 28, 195, 28);
    doc.setLineWidth(0.15);
    doc.line(15, 29.1, 195, 29.1);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text(`Halaman ${pageIndex}`, 195, 13, { align: 'right' });
  };

  drawKopSurat(1);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('LAPORAN DETAIL REKAPITULASI & KEUANGAN KEGIATAN', 15, 36);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  const formattedToday = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Dicetak pada: ${formattedToday} WIB`, 15, 41);

  let y = 46;

  const checkPageOverflow = (neededHeight: number) => {
    if (y + neededHeight > 275) {
      doc.addPage();
      currentPage++;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(textLight[0], textLight[1], textLight[2]);
      doc.text(`Laporan Rincian Acara: ${activity.title}  •  Halaman ${currentPage}`, 15, 12);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(15, 14, 195, 14);
      y = 20;
    }
  };

  // 1. INFO KEGIATAN
  checkPageOverflow(50);
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, y, 180, 42, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.25);
  doc.rect(15, y, 180, 42, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('I. PROFIL & INFORMASI KEGIATAN', 20, y + 6);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);

  doc.text(`Nama Kegiatan`, 20, y + 13);
  doc.setFont('Helvetica', 'bold');
  doc.text(`: ${activity.title || '-'}`, 50, y + 13);

  doc.setFont('Helvetica', 'normal');
  doc.text(`Tema Kegiatan`, 20, y + 19);
  doc.text(`: ${activity.theme ? `"${activity.theme}"` : '-'}`, 50, y + 19);

  doc.text(`Penanggung Jawab`, 20, y + 25);
  doc.text(`: ${activity.ministers || '-'}`, 50, y + 25);

  doc.text(`Waktu & Tempat`, 20, y + 31);
  doc.text(`: ${activity.time || '-'} @ ${activity.place || '-'}`, 50, y + 31);

  doc.text(`Deskripsi`, 20, y + 37);
  doc.text(`: ${activity.description || 'Tidak ada catatan deskripsi tambahan'}`, 50, y + 37);

  y += 46;
  checkPageOverflow(26);

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.rect(15, y, 180, 20, 'F');
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.25);
  doc.rect(15, y, 180, 20, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('ESTIMASI ANGGARAN (TAKSASI)', 20, y + 6);
  doc.text('SALDO KAS KANTONG AKTIF', 85, y + 6);
  doc.text('STATUS KEUANGAN', 145, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(formatIDR(activity.budgetEstimated || 0), 20, y + 12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(formatIDR(activity.budgetWalletBalance || 0), 85, y + 12);

  const isSurplus = (activity.budgetWalletBalance || 0) >= (activity.budgetEstimated || 0);
  if (isSurplus) {
    doc.setTextColor(16, 185, 129);
    doc.text('Cukup / Terpenuhi', 145, y + 12);
  } else {
    doc.setTextColor(239, 68, 68);
    doc.text('Kekurangan Dana', 145, y + 12);
  }

  y += 24;

  // 2. STRUKTUR PANITIA
  checkPageOverflow(20);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('II. STRUKTUR PANITIA & PENGURUS KEGIATAN', 15, y);
  y += 4;

  const members = activity.committeeMembers || [];
  if (members.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('Belum ada panitia atau pengurus yang ditunjuk untuk kegiatan ini.', 15, y);
    y += 8;
  } else {
    checkPageOverflow(8);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('JABATAN / PERAN PANITIA', 18, y + 4.2);
    doc.text('NAMA PENGURUS', 80, y + 4.2);
    doc.text('KONTAK / TELEPON', 140, y + 4.2);

    y += 6.5;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(7.5);

    members.forEach((m: any, idx: number) => {
      checkPageOverflow(6);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(15, y + 6, 195, y + 6);

      doc.text(m.role || '', 18, y + 4.2);
      doc.text(m.name || '', 80, y + 4.2);
      doc.text(m.contact || '-', 140, y + 4.2);

      y += 6;
    });
    y += 3;
  }

  // 3. PERSYARATAN / AGENDA PERSIAPAN
  checkPageOverflow(20);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('III. LAPORAN AGENDA PERSIAPAN & STATUS PEKERJAAN', 15, y);
  y += 4;

  if (preparations.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('Tidak ada daftar agenda persiapan atau task yang dicatatkan.', 15, y);
    y += 8;
  } else {
    checkPageOverflow(8);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('PEKERJAAN / DETAIL TASK', 18, y + 4.2);
    doc.text('TENGGAT', 85, y + 4.2);
    doc.text('P.I.C.', 115, y + 4.2);
    doc.text('STATUS', 145, y + 4.2);
    doc.text('DANA (Rp)', 165, y + 4.2);

    y += 6.5;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(7);

    preparations.forEach((item: any, idx: number) => {
      checkPageOverflow(6);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(15, y + 6, 195, y + 6);

      doc.text(String(item.task || '').substring(0, 48), 18, y + 4.2);
      doc.text(item.date || '-', 85, y + 4.2);
      doc.text(item.pic || '-', 115, y + 4.2);
      doc.text(item.status || 'Pending', 145, y + 4.2);
      
      const amtText = item.needsFunding ? formatIDR(item.requiredAmount || 0) : 'Tanpa Dana';
      doc.text(amtText, 165, y + 4.2);

      y += 6;
    });
    y += 3;
  }

  // 4. RUNDOWN ACARA
  checkPageOverflow(20);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('IV. RUNDOWN ACARA / AGENDA HARI-H', 15, y);
  y += 4;

  if (rundowns.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('Tidak ada susunan rundown acara yang terekam.', 15, y);
    y += 8;
  } else {
    checkPageOverflow(8);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('WAKTU', 18, y + 4.2);
    doc.text('ACARA / KEGIATAN', 40, y + 4.2);
    doc.text('PENANGGUNG JAWAB (P.I.C)', 140, y + 4.2);

    y += 6.5;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(7);

    rundowns.forEach((item: any, idx: number) => {
      checkPageOverflow(6);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(15, y + 6, 195, y + 6);

      doc.text(item.time || '', 18, y + 4.2);
      doc.text(String(item.activity || '').substring(0, 60), 40, y + 4.2);
      doc.text(item.pic || '-', 140, y + 4.2);

      y += 6;
    });
    y += 3;
  }

  // 5. REKAPITULASI JURNAL TRANSAKSI KEUANGAN
  checkPageOverflow(20);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('V. REKAPITULASI LAPORAN JURNAL TRANSAKSI KEUANGAN', 15, y);
  y += 4;

  if (transactions.length === 0) {
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textLight[0], textLight[1], textLight[2]);
    doc.text('Belum ada transaksi debet atau kredit yang terekam pada kantong kegiatan ini.', 15, y);
    y += 8;
  } else {
    const colTxX = {
      id: 15,
      date: 37,
      desc: 60,
      in: 135,
      out: 165
    };

    checkPageOverflow(8);
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('ID TRANS', colTxX.id + 1, y + 4.2);
    doc.text('TANGGAL', colTxX.date + 1, y + 4.2);
    doc.text('URAIAN LAPORAN KEUANGAN', colTxX.desc + 1, y + 4.2);
    doc.text('MASUK DEBET (Rp)', colTxX.in + 1, y + 4.2);
    doc.text('KELUAR KREDIT (Rp)', colTxX.out + 1, y + 4.2);

    y += 6.5;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFontSize(7);

    transactions.forEach((tx: any, idx: number) => {
      checkPageOverflow(6);
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, 'F');
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.line(15, y + 6, 195, y + 6);

      const idText = String(tx.id || '').substring(0, 10);
      doc.text(idText, colTxX.id + 1, y + 4.2);
      doc.text(tx.date || '-', colTxX.date + 1, y + 4.2);
      doc.text(String(tx.description || '').substring(0, 50), colTxX.desc + 1, y + 4.2);

      const isDebit = tx.type === 'In' || tx.type === 'Pemasukan' || tx.type === 'Transfer_From_Main';
      const amtVal = (tx.amount || 0).toLocaleString('id-ID');

      if (isDebit) {
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(amtVal, colTxX.in + 1, y + 4.2);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text('-', colTxX.out + 1, y + 4.2);
      } else {
        doc.text('-', colTxX.in + 1, y + 4.2);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(239, 68, 68);
        doc.text(amtVal, colTxX.out + 1, y + 4.2);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      }

      y += 6;
    });
    y += 3;
  }

  // Footer / Signatures
  checkPageOverflow(35);
  y += 10;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  
  // Deteksi kota penulisan secara dinamis dari alamat profil lembaga
  let cityOfIssuance = 'Yogyakarta';
  if (profile?.address) {
    const addrLower = profile.address.toLowerCase();
    if (addrLower.includes('jakarta')) {
      cityOfIssuance = 'Jakarta';
    } else if (addrLower.includes('sleman')) {
      cityOfIssuance = 'Sleman';
    } else if (addrLower.includes('bantul')) {
      cityOfIssuance = 'Bantul';
    } else if (addrLower.includes('bandung')) {
      cityOfIssuance = 'Bandung';
    } else if (addrLower.includes('surabaya')) {
      cityOfIssuance = 'Surabaya';
    } else if (addrLower.includes('semarang')) {
      cityOfIssuance = 'Semarang';
    } else if (addrLower.includes('solo') || addrLower.includes('surakarta')) {
      cityOfIssuance = 'Surakarta';
    } else {
      const parts = profile.address.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        const potentialCity2 = parts[parts.length - 3];
        const potentialCity1 = parts[parts.length - 2];
        if (potentialCity2 && !potentialCity2.toLowerCase().includes('kecamatan') && !potentialCity2.toLowerCase().includes('kelurahan') && potentialCity2.length < 30) {
          cityOfIssuance = potentialCity2.replace(/(kota|kabupaten|kab\.)/gi, '').trim();
        } else if (potentialCity1) {
          cityOfIssuance = potentialCity1.replace(/\d+/g, '').replace(/(provinsi|dki|d.i|di|diy|daerah istimewa)/gi, '').trim();
        }
      }
    }
  }

  const placeDateStr = `Dikeluarkan di ${cityOfIssuance}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(placeDateStr, 15, y);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(`Penanggung Jawab Kegiatan: ${activity.ministers || '-'}`, 15, y + 5);

  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('*Dokumen laporan rekapitulasi data dan keuangan ini diterbitkan secara sah dan divalidasi langsung oleh sistem ERP Yayasan.', 15, y + 10);

  doc.save(`laporan_kegiatan_${activity.title ? activity.title.replace(/\s+/g, '_').toLowerCase() : 'detail'}.pdf`);
}



