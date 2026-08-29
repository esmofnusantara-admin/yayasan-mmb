/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstitutionalProfile } from '../types';

export const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Gets the active cut-off day (1-31), prioritizing institutional profile, then localStorage, then default 7.
 */
export function getCutoffDay(profile?: InstitutionalProfile): number {
  if (profile?.cutoffDay && profile.cutoffDay >= 1 && profile.cutoffDay <= 31) {
    return profile.cutoffDay;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('esm_target_payroll_day');
    if (saved) {
      const num = Number(saved);
      if (num >= 1 && num <= 31) return num;
    }
  }
  return 7;
}

/**
 * Parses YYYY-MM-DD into UTC year, 0-indexed month, and day safely without local timezone shifts.
 */
export function parseDateUTC(dateStr: string): { year: number; month: number; day: number } {
  if (!dateStr) return { year: 0, month: 0, day: 0 };
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10) - 1, // 0-indexed
      day: parseInt(parts[2], 10)
    };
  }
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

/**
 * Gets the total number of days in a given month (0-indexed month).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface CutoffPeriodInfo {
  targetYear: number;
  targetMonth: number; // 0-indexed
  targetMonthName: string;
  prevYear: number;
  prevMonth: number; // 0-indexed
  prevMonthName: string;
  startDay: number;
  endDay: number;
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string;   // YYYY-MM-DD
  targetPayDateStr: string; // YYYY-MM-DD
  formattedRange: string;
  label: string;
}

/**
 * Computes the exact date range for a target period under a dynamic cut-off day.
 * Example: Target Juni 2026 (targetYear: 2026, targetMonth: 5) with cutoffDay: 7:
 * Start: 2026-05-08 (8 Mei 2026)
 * End: 2026-06-07 (7 Juni 2026)
 * Formatted: "8 Mei 2026 – 7 Juni 2026"
 */
export function getCutoffPeriodRange(targetYear: number, targetMonth: number, cutoffDay = 7): CutoffPeriodInfo {
  const safeCutoff = Math.max(1, Math.min(31, Math.round(cutoffDay)));
  
  // Previous month info
  const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
  const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth);

  const actualEndDay = Math.min(safeCutoff, daysInTargetMonth);
  const rawStartDay = safeCutoff + 1;
  
  let startDay = rawStartDay;
  let startMonth = prevMonth;
  let startYear = prevYear;

  // Handle boundary if startDay exceeds previous month length
  if (startDay > daysInPrevMonth) {
    startDay = 1;
    startMonth = targetMonth;
    startYear = targetYear;
  }

  const startDateStr = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const endDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`;
  const targetPayDateStr = endDateStr;

  const prevMonthName = INDO_MONTHS[prevMonth];
  const targetMonthName = INDO_MONTHS[targetMonth];

  const formattedRange = startYear === targetYear
    ? `${startDay} ${prevMonthName} – ${actualEndDay} ${targetMonthName} ${targetYear}`
    : `${startDay} ${prevMonthName} ${startYear} – ${actualEndDay} ${targetMonthName} ${targetYear}`;

  const label = `Periode ${targetMonthName} ${targetYear} (${startDay} ${prevMonthName} – ${actualEndDay} ${targetMonthName})`;

  return {
    targetYear,
    targetMonth,
    targetMonthName,
    prevYear,
    prevMonth,
    prevMonthName,
    startDay,
    endDay: actualEndDay,
    startDateStr,
    endDateStr,
    targetPayDateStr,
    formattedRange,
    label
  };
}

/**
 * Checks if a given date string (YYYY-MM-DD) falls within the cutoff period range.
 */
export function isDateInCutoffPeriod(
  dateStr: string,
  targetYear: number,
  targetMonth: number,
  cutoffDay = 7
): boolean {
  if (!dateStr) return false;
  const range = getCutoffPeriodRange(targetYear, targetMonth, cutoffDay);
  // Lexicographical string comparison works for standard ISO YYYY-MM-DD
  return dateStr >= range.startDateStr && dateStr <= range.endDateStr;
}

/**
 * Returns the target period { year, month } (0-indexed month) that a given date belongs to.
 * E.g. with cutoff 7:
 * 2026-06-05 -> belongs to June 2026 (month 5)
 * 2026-06-08 -> belongs to July 2026 (month 6)
 */
export function getPeriodForDate(dateStr: string, cutoffDay = 7): { year: number; month: number } {
  const { year, month, day } = parseDateUTC(dateStr);
  const safeCutoff = Math.max(1, Math.min(31, Math.round(cutoffDay)));
  
  if (day <= safeCutoff) {
    return { year, month };
  } else {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return { year: nextYear, month: nextMonth };
  }
}

/**
 * Returns the currently active payroll / accounting cycle based on current system date.
 */
export function getCurrentActiveCycle(cutoffDay = 7, refDate = new Date()): { year: number; month: number } {
  const currYear = refDate.getFullYear();
  const currMonth = refDate.getMonth();
  const currDay = refDate.getDate();
  const safeCutoff = Math.max(1, Math.min(31, Math.round(cutoffDay)));

  if (currDay <= safeCutoff) {
    return { year: currYear, month: currMonth };
  } else {
    const nextMonth = currMonth === 11 ? 0 : currMonth + 1;
    const nextYear = currMonth === 11 ? currYear + 1 : currYear;
    return { year: nextYear, month: nextMonth };
  }
}

/**
 * Returns a human-friendly label for the next upcoming pay date (e.g. "7 Juni 2026").
 */
export function getNextPayrollDate(cutoffDay = 7, refDate = new Date()): string {
  const safeCutoff = Math.max(1, Math.min(31, Math.round(cutoffDay)));
  const currYear = refDate.getFullYear();
  const currMonth = refDate.getMonth();
  const currDay = refDate.getDate();

  let payYear = currYear;
  let payMonth = currMonth;

  if (currDay > safeCutoff) {
    payMonth = currMonth === 11 ? 0 : currMonth + 1;
    payYear = currMonth === 11 ? currYear + 1 : currYear;
  }

  const daysInMonth = getDaysInMonth(payYear, payMonth);
  const actualDay = Math.min(safeCutoff, daysInMonth);

  return `${actualDay} ${INDO_MONTHS[payMonth]} ${payYear}`;
}
