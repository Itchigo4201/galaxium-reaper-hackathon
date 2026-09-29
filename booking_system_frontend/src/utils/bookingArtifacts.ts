import type { SeatClass } from '../types';

export interface BookingConfirmationData {
  reference: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  seatClass: SeatClass;
  totalPaid: number;
}

export const seatClassLabel = (seatClass: SeatClass): string => {
  switch (seatClass) {
    case 'business':
      return 'Business';
    case 'galaxium':
      return 'Galaxium Class';
    default:
      return 'Economy';
  }
};

const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

const formatIcsDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid booking date: ${value}`);
  }

  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
};

const safeReference = (reference: string): string =>
  reference.replace(/[^a-zA-Z0-9_-]/g, '-');

export const buildBookingCalendar = (data: BookingConfirmationData): string => {
  const route = `${data.origin} to ${data.destination}`;
  const description = [
    `Booking reference: #${data.reference}`,
    `Seat class: ${seatClassLabel(data.seatClass)}`,
    `Total paid: $${data.totalPaid.toFixed(2)}`,
  ].join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Galaxium Travels//Booking Confirmation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(data.reference)}@galaxium-travels`,
    `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
    `DTSTART:${formatIcsDate(data.departureTime)}`,
    `DTEND:${formatIcsDate(data.arrivalTime)}`,
    `SUMMARY:${escapeIcsText(`Galaxium Travels: ${route}`)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(data.origin)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
};

export const buildBookingReceipt = (data: BookingConfirmationData): string =>
  [
    'GALAXIUM TRAVELS',
    'Booking Confirmation',
    '====================',
    '',
    `Booking Reference: #${data.reference}`,
    `Route: ${data.origin} -> ${data.destination}`,
    `Departure: ${new Date(data.departureTime).toLocaleString()}`,
    `Arrival: ${new Date(data.arrivalTime).toLocaleString()}`,
    `Seat Class: ${seatClassLabel(data.seatClass)}`,
    `Total Paid: $${data.totalPaid.toFixed(2)}`,
    '',
    'Thank you for traveling with Galaxium Travels.',
  ].join('\n');

export const calendarFilename = (reference: string): string =>
  `galaxium-${safeReference(reference)}.ics`;

export const receiptFilename = (reference: string): string =>
  `galaxium-${safeReference(reference)}-confirmation.txt`;

export const downloadTextFile = (
  filename: string,
  contents: string,
  mimeType: string
): void => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const copyText = async (value: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Clipboard copy is not available');
  }
};
