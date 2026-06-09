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

export function exportSlipToPDF(staff: Staff, publicFields: PublicField[] = [], salaryConfig?: StaffSalary) {
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
  const primaryColor = [12, 74, 96]; // Dark slate cyan/teal
  const secondaryColor = [79, 70, 229]; // Indigo
  const textDark = [30, 41, 59]; // Slate 800
  const textLight = [100, 116, 139]; // Slate 500
  const lightBg = [248, 250, 252]; // Slate 50

  // 1. Header (Corporate / Yayasan ESM style)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('YAYASAN EL-SHADDAI MITRA (ESM)', 20, 25);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('Kompleks Perkantoran Yayasan ESM • Email: info@yayasan-esm.org • Telp: (021) 8888-ESM', 20, 31);
  
  // Divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);
  
  // Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('SLIP GAJI BULANAN KARYAWAN', 20, 46);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const currentDate = new Date();
  const dateStr = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  doc.text(`Periode Cetak: ${dateStr}`, 20, 52);

  // Metadata Box / Grid
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(20, 58, 170, 34, 3, 3, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  // Col 1 metadata
  doc.text('DATA KARYAWAN', 25, 65);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nama Lengkap :  ${staff.name}`, 25, 71);
  doc.text(`NIK Karyawan  :  ${staff.nik}`, 25, 77);
  doc.text(`Status Kerja   :  ${staff.status}`, 25, 83);
  
  // Col 2 metadata
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('STRUKTUR ORGANISASI', 110, 65);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Jabatan / Posisi :  ${staff.position}`, 110, 71);
  doc.text(`Divisi Struktur   :  ${staff.division}`, 110, 77);
  doc.text(`NPWP Verifikasi  :  ${currentDate.getFullYear()}A-0120`, 110, 83);

  // Salaries & Deductions Sections
  const formatIDR = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;
  
  // A. Penerimaan List
  let y = 104;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(12, 74, 96); // Slate Teal
  doc.text('A. RINCIAN GAJI & TUNJANGAN (PENERIMAAN)', 20, y);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  const addRow = (label: string, value: number, isAddition: boolean) => {
    y += 6;
    doc.text(label, 25, y);
    const prefix = isAddition ? '+' : '-';
    doc.text(`${prefix}${formatIDR(value)}`, 150, y);
  };
  
  const baseSalary = salaryConfig ? salaryConfig.salaryBase : staff.salaryBase;
  addRow('Gaji Pokok Base', baseSalary, true);

  let totalGross = baseSalary;
  let totalDeds = 0;

  if (salaryConfig) {
    salaryConfig.components.forEach(comp => {
      if (comp.amount > 0 && comp.type === 'allowance') {
        addRow(comp.name, comp.amount, true);
        totalGross += comp.amount;
      }
    });
  } else {
    const publicFieldIds = new Set(fieldsToUse.map(pf => pf.id));

    // Render configured public allowances
    fieldsToUse.filter(f => f.type === 'allowance').forEach(field => {
      let value = 0;
      if (field.property) {
        value = Number(staff[field.property as keyof Staff]) || 0;
      } else {
        const found = staff.customFields?.find(cf => cf.id === field.id);
        value = found ? found.amount : 0;
      }
      if (value > 0) {
        addRow(field.name, value, true);
        totalGross += value;
      }
    });

    // Custom individual allowances
    if (staff.customFields) {
      staff.customFields.filter(f => f.type === 'allowance' && !publicFieldIds.has(f.id)).forEach(f => {
        addRow(`${f.name} (Tambahan Mandiri)`, f.amount, true);
        totalGross += f.amount;
      });
    }
  }

  // Draw Line for Gross Total
  y += 5;
  doc.setDrawColor(241, 245, 249);
  doc.line(25, y, 185, y);
  
  y += 5;
  doc.setFont('Helvetica', 'bold');
  doc.text('TOTAL SELURUH PENERIMAAN (BRUTO)', 25, y);
  doc.text(formatIDR(totalGross), 150, y);

  // B. Potongan List
  y += 12;
  doc.setTextColor(153, 27, 27); // Dark Red
  doc.text('B. RINCIAN POTONGAN SLIP GAJI', 20, y);
  
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  
  if (salaryConfig) {
    salaryConfig.components.forEach(comp => {
      if (comp.amount > 0 && comp.type === 'deduction') {
        addRow(comp.name, comp.amount, false);
        totalDeds += comp.amount;
      }
    });
  } else {
    const publicFieldIds = new Set(fieldsToUse.map(pf => pf.id));

    // Render configured public deductions
    fieldsToUse.filter(f => f.type === 'deduction').forEach(field => {
      let value = 0;
      if (field.property) {
        value = Number(staff[field.property as keyof Staff]) || 0;
      } else {
        const found = staff.customFields?.find(cf => cf.id === field.id);
        value = found ? found.amount : 0;
      }
      if (value > 0) {
        addRow(field.name, value, false);
        totalDeds += value;
      }
    });

    // Custom deductions
    if (staff.customFields) {
      staff.customFields.filter(f => f.type === 'deduction' && !publicFieldIds.has(f.id)).forEach(f => {
        addRow(`${f.name} (Potongan Mandiri)`, f.amount, false);
        totalDeds += f.amount;
      });
    }
  }

  // Draw Line for Deductions Total
  y += 5;
  doc.setDrawColor(241, 245, 249);
  doc.line(25, y, 185, y);

  // Deductions Total calculation
  if (salaryConfig) {
    // Already calculated within the component mapping
  } else {
    const publicFieldIds = new Set(fieldsToUse.map(pf => pf.id));
    totalDeds = fieldsToUse.filter(f => f.type === 'deduction').reduce((sum, field) => {
      let value = 0;
      if (field.property) {
        value = Number(staff[field.property as keyof Staff]) || 0;
      } else {
        const found = staff.customFields?.find(cf => cf.id === field.id);
        value = found ? found.amount : 0;
      }
      return sum + value;
    }, 0) +
    (staff.customFields?.filter(f => f.type === 'deduction' && !publicFieldIds.has(f.id)).reduce((sum, f) => sum + f.amount, 0) || 0);
  }

  y += 5;
  doc.setFont('Helvetica', 'bold');
  doc.text('TOTAL SELURUH POTONGAN SLIP', 25, y);
  doc.text(formatIDR(totalDeds), 150, y);

  // Take Home Pay highlighted Box
  y += 12;
  doc.setFillColor(15, 23, 42); // slate 900
  doc.roundedRect(20, y, 170, 18, 3, 3, 'F');
  
  y += 11;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TAKE-HOME PAY (GAJI BERSIH DITERIMA)', 25, y);
  
  const netSalary = totalGross - totalDeds;
  doc.setTextColor(52, 211, 153); // emerald 400
  doc.setFontSize(13);
  doc.text(formatIDR(netSalary), 150, y);

  // Signatures / Footers
  y += 24;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('Dibuat & Diverifikasi Oleh,', 25, y);
  doc.text('Penerima Manfaat Gaji,', 130, y);
  
  y += 15;
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('Bendahara Yayasan ESM', 25, y);
  doc.text(staff.name, 130, y);

  // Signature lines
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(25, y + 1, 65, y + 1);
  doc.line(130, y + 1, 170, y + 1);

  // Footer text
  y += 8;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(textLight[0], textLight[1], textLight[2]);
  doc.text('Dokumen ini sah diterbitkan secara elektronik oleh Yayasan ESM dan diakui secara kontitusi.', 20, y);

  // Download PDF file
  doc.save(`slip_gaji_${staff.nik}_${staff.name.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}
