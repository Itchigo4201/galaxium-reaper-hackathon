import { describe, expect, it } from 'vitest';
import {
  buildBookingCalendar,
  buildBookingReceipt,
  calendarFilename,
  receiptFilename,
  type BookingConfirmationData,
} from './bookingArtifacts';

const booking: BookingConfirmationData = {
  reference: 'GX-2048',
  origin: 'Earth',
  destination: 'Mars',
  departureTime: '2026-10-12T09:30:00Z',
  arrivalTime: '2026-10-18T16:45:00Z',
  seatClass: 'galaxium',
  totalPaid: 12450,
};

describe('bookingArtifacts', () => {
  it('creates an RFC-style calendar event with the booking details', () => {
    const calendar = buildBookingCalendar(booking);

    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('DTSTART:20261012T093000Z');
    expect(calendar).toContain('DTEND:20261018T164500Z');
    expect(calendar).toContain('Booking reference: #GX-2048');
    expect(calendar).toContain('Seat class: Galaxium Class');
    expect(calendar).toContain('END:VCALENDAR');
  });

  it('creates a readable confirmation receipt', () => {
    const receipt = buildBookingReceipt(booking);

    expect(receipt).toContain('Booking Reference: #GX-2048');
    expect(receipt).toContain('Route: Earth -> Mars');
    expect(receipt).toContain('Seat Class: Galaxium Class');
    expect(receipt).toContain('Total Paid: $12450.00');
  });

  it('uses safe filenames for downloads', () => {
    expect(calendarFilename('GX/20:48')).toBe('galaxium-GX-20-48.ics');
    expect(receiptFilename('GX/20:48')).toBe('galaxium-GX-20-48-confirmation.txt');
  });
});
