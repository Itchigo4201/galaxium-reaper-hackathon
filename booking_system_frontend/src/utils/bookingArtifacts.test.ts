import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  buildBookingCalendar,
  buildBookingReceipt,
  calendarFilename,
  receiptFilename,
  seatClassLabel,
  copyText,
  downloadTextFile,
  type BookingConfirmationData,
} from './bookingArtifacts';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const booking: BookingConfirmationData = {
  reference: 'GX-2048',
  origin: 'Earth',
  destination: 'Mars',
  departureTime: '2026-10-12T09:30:00Z',
  arrivalTime: '2026-10-18T16:45:00Z',
  seatClass: 'galaxium',
  totalPaid: 12450,
};

// ─── seatClassLabel ──────────────────────────────────────────────────────────

describe('seatClassLabel', () => {
  it('returns Economy for economy', () => {
    expect(seatClassLabel('economy')).toBe('Economy');
  });

  it('returns Business for business', () => {
    expect(seatClassLabel('business')).toBe('Business');
  });

  it('returns Galaxium Class for galaxium', () => {
    expect(seatClassLabel('galaxium')).toBe('Galaxium Class');
  });
});

// ─── buildBookingCalendar ────────────────────────────────────────────────────

describe('buildBookingCalendar', () => {
  it('creates an RFC-style calendar event with the booking details', () => {
    const calendar = buildBookingCalendar(booking);

    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('DTSTART:20261012T093000Z');
    expect(calendar).toContain('DTEND:20261018T164500Z');
    expect(calendar).toContain('Booking reference: #GX-2048');
    expect(calendar).toContain('Seat class: Galaxium Class');
    expect(calendar).toContain('END:VCALENDAR');
  });

  it('uses CRLF line endings throughout', () => {
    const calendar = buildBookingCalendar(booking);
    // All lines must end with \r\n (RFC 5545 requirement)
    const lines = calendar.split('\r\n');
    expect(lines.length).toBeGreaterThan(5);
    // No bare \n (without preceding \r) — detect by splitting on \n alone
    const bareNewlines = calendar.split('\n').length - calendar.split('\r\n').length;
    expect(bareNewlines).toBe(0);
  });

  it('ends with a trailing CRLF (empty last line)', () => {
    const calendar = buildBookingCalendar(booking);
    expect(calendar.endsWith('\r\n')).toBe(true);
  });

  it('includes required iCal structural fields', () => {
    const calendar = buildBookingCalendar(booking);
    expect(calendar).toContain('VERSION:2.0');
    expect(calendar).toContain('CALSCALE:GREGORIAN');
    expect(calendar).toContain('METHOD:PUBLISH');
    expect(calendar).toContain('BEGIN:VEVENT');
    expect(calendar).toContain('END:VEVENT');
    expect(calendar).toContain('DTSTAMP:');
    expect(calendar).toContain('SUMMARY:');
    expect(calendar).toContain('DESCRIPTION:');
    expect(calendar).toContain('LOCATION:');
    expect(calendar).toContain('UID:');
  });

  it('embeds route and seat class in SUMMARY', () => {
    const calendar = buildBookingCalendar(booking);
    expect(calendar).toContain('SUMMARY:Galaxium Travels: Earth to Mars');
  });

  it('encodes total paid with 2 decimal places in description', () => {
    const calendar = buildBookingCalendar(booking);
    expect(calendar).toContain('Total paid: $12450.00');
  });

  it('escapes commas in origin/destination fields', () => {
    const b: BookingConfirmationData = {
      ...booking,
      origin: 'Paris, France',
      destination: 'New York, USA',
    };
    const calendar = buildBookingCalendar(b);
    // SUMMARY should have escaped commas
    expect(calendar).toContain('Paris\\, France to New York\\, USA');
    // LOCATION should also have escaped comma
    expect(calendar).toContain('LOCATION:Paris\\, France');
  });

  it('escapes semicolons in reference', () => {
    const b: BookingConfirmationData = { ...booking, reference: 'GX;2048' };
    const calendar = buildBookingCalendar(b);
    expect(calendar).toContain('UID:GX\\;2048@galaxium-travels');
    expect(calendar).toContain('Booking reference: #GX\\;2048');
  });

  it('escapes backslashes in reference', () => {
    const b: BookingConfirmationData = { ...booking, reference: 'GX\\2048' };
    const calendar = buildBookingCalendar(b);
    expect(calendar).toContain('UID:GX\\\\2048@galaxium-travels');
  });

  it('escapes literal newlines in description text', () => {
    // This tests that if origin/destination contains a newline it gets escaped
    const b: BookingConfirmationData = { ...booking, origin: 'Earth\nOrbit' };
    const calendar = buildBookingCalendar(b);
    // The \n in the origin should become \n (escaped) in SUMMARY and LOCATION
    expect(calendar).toContain('Earth\\nOrbit');
  });

  it('throws on malformed departure date', () => {
    const b: BookingConfirmationData = { ...booking, departureTime: 'not-a-date' };
    expect(() => buildBookingCalendar(b)).toThrow('Invalid booking date: not-a-date');
  });

  it('throws on malformed arrival date', () => {
    const b: BookingConfirmationData = { ...booking, arrivalTime: 'INVALID' };
    expect(() => buildBookingCalendar(b)).toThrow('Invalid booking date: INVALID');
  });

  it('handles economy seat class in calendar', () => {
    const b: BookingConfirmationData = { ...booking, seatClass: 'economy' };
    const calendar = buildBookingCalendar(b);
    expect(calendar).toContain('Seat class: Economy');
  });

  it('handles business seat class in calendar', () => {
    const b: BookingConfirmationData = { ...booking, seatClass: 'business' };
    const calendar = buildBookingCalendar(b);
    expect(calendar).toContain('Seat class: Business');
  });

  it('uses the departure location as LOCATION', () => {
    const calendar = buildBookingCalendar(booking);
    expect(calendar).toContain('LOCATION:Earth');
  });

  it('formats DTSTART and DTEND correctly for UTC', () => {
    // 2026-10-12T09:30:00Z → 20261012T093000Z
    const calendar = buildBookingCalendar(booking);
    expect(calendar).toContain('DTSTART:20261012T093000Z');
    expect(calendar).toContain('DTEND:20261018T164500Z');
  });

  it('does not contain raw dashes or colons in DTSTART/DTEND values', () => {
    const calendar = buildBookingCalendar(booking);
    // DTSTART:20261012T093000Z — no raw dashes or colons in the date value
    const dtstart = calendar.match(/DTSTART:(.+)/)?.[1];
    const dtend = calendar.match(/DTEND:(.+)/)?.[1];
    expect(dtstart).not.toMatch(/[-:]/);
    expect(dtend).not.toMatch(/[-:]/);
  });

  it('has DTSTAMP in valid iCal date format', () => {
    const calendar = buildBookingCalendar(booking);
    // DTSTAMP should be like 20260101T000000Z
    expect(calendar).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('includes the route in the SUMMARY', () => {
    const calendar = buildBookingCalendar(booking);
    expect(calendar).toContain('Earth to Mars');
  });
});

// ─── buildBookingReceipt ─────────────────────────────────────────────────────

describe('buildBookingReceipt', () => {
  it('creates a readable confirmation receipt', () => {
    const receipt = buildBookingReceipt(booking);

    expect(receipt).toContain('Booking Reference: #GX-2048');
    expect(receipt).toContain('Route: Earth -> Mars');
    expect(receipt).toContain('Seat Class: Galaxium Class');
    expect(receipt).toContain('Total Paid: $12450.00');
  });

  it('includes branding header', () => {
    const receipt = buildBookingReceipt(booking);
    expect(receipt).toContain('GALAXIUM TRAVELS');
    expect(receipt).toContain('Booking Confirmation');
  });

  it('includes separator line', () => {
    const receipt = buildBookingReceipt(booking);
    expect(receipt).toContain('====================');
  });

  it('includes thank-you footer', () => {
    const receipt = buildBookingReceipt(booking);
    expect(receipt).toContain('Thank you for traveling with Galaxium Travels.');
  });

  it('uses correct route arrow separator', () => {
    const receipt = buildBookingReceipt(booking);
    expect(receipt).toContain('Earth -> Mars');
  });

  it('formats totalPaid with 2 decimal places', () => {
    const b: BookingConfirmationData = { ...booking, totalPaid: 1000 };
    const receipt = buildBookingReceipt(b);
    expect(receipt).toContain('Total Paid: $1000.00');
  });

  it('formats totalPaid with cents', () => {
    const b: BookingConfirmationData = { ...booking, totalPaid: 999.99 };
    const receipt = buildBookingReceipt(b);
    expect(receipt).toContain('Total Paid: $999.99');
  });

  it('handles economy seat class', () => {
    const b: BookingConfirmationData = { ...booking, seatClass: 'economy' };
    const receipt = buildBookingReceipt(b);
    expect(receipt).toContain('Seat Class: Economy');
  });

  it('handles business seat class', () => {
    const b: BookingConfirmationData = { ...booking, seatClass: 'business' };
    const receipt = buildBookingReceipt(b);
    expect(receipt).toContain('Seat Class: Business');
  });

  it('handles references with special characters in receipt', () => {
    const b: BookingConfirmationData = { ...booking, reference: 'GX/2048;test' };
    const receipt = buildBookingReceipt(b);
    // Receipt does not escape — plain text
    expect(receipt).toContain('Booking Reference: #GX/2048;test');
  });
});

// ─── calendarFilename / receiptFilename ──────────────────────────────────────

describe('filenames', () => {
  it('uses safe filenames for downloads', () => {
    expect(calendarFilename('GX/20:48')).toBe('galaxium-GX-20-48.ics');
    expect(receiptFilename('GX/20:48')).toBe('galaxium-GX-20-48-confirmation.txt');
  });

  it('preserves alphanumeric characters and hyphens', () => {
    expect(calendarFilename('GX-2048')).toBe('galaxium-GX-2048.ics');
    expect(receiptFilename('GX-2048')).toBe('galaxium-GX-2048-confirmation.txt');
  });

  it('preserves underscores', () => {
    expect(calendarFilename('GX_2048')).toBe('galaxium-GX_2048.ics');
  });

  it('replaces spaces with hyphens', () => {
    expect(calendarFilename('GX 2048 REF')).toBe('galaxium-GX-2048-REF.ics');
  });

  it('replaces dots with hyphens', () => {
    expect(calendarFilename('ref.2048')).toBe('galaxium-ref-2048.ics');
  });

  it('replaces multiple special chars', () => {
    expect(calendarFilename('GX/20:48!@#')).toBe('galaxium-GX-20-48---.ics');
  });

  it('handles empty reference', () => {
    expect(calendarFilename('')).toBe('galaxium-.ics');
    expect(receiptFilename('')).toBe('galaxium--confirmation.txt');
  });

  it('handles unicode characters', () => {
    // Unicode chars: each CJK character is one code point → one '-' replacement
    // 'GX中文' → 'GX--' → 'galaxium-GX--.ics'
    const result = calendarFilename('GX\u4e2d\u6587');
    expect(result).toBe('galaxium-GX--.ics');
  });
});

// ─── copyText ────────────────────────────────────────────────────────────────

describe('copyText', () => {
  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await copyText('GX-2048');
    expect(writeText).toHaveBeenCalledWith('GX-2048');
  });

  it('resolves successfully when clipboard.writeText resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyText('test-ref')).resolves.toBeUndefined();
  });

  it('propagates clipboard rejection', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyText('test-ref')).rejects.toThrow('Permission denied');
  });

  it('falls back to execCommand when clipboard API is absent and throws on failure', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    // jsdom either throws 'document.execCommand is not a function' (not implemented)
    // or returns false (some builds), in which case our code throws 'Clipboard copy is not available'.
    // Either way, the promise must reject.
    await expect(copyText('test-ref')).rejects.toThrow();
  });
});

// ─── downloadTextFile ────────────────────────────────────────────────────────

describe('downloadTextFile', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-id');
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });

    // Stub out appendChild/remove to avoid jsdom DOM issues
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    // click on link won't do anything in jsdom — just mock it
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob URL and revokes it after click', () => {
    // Spy on HTMLAnchorElement click to prevent navigation
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('test.txt', 'hello world', 'text/plain');

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-id');
    clickSpy.mockRestore();
  });

  it('sets the correct download filename attribute', () => {
    let capturedLink: HTMLAnchorElement | null = null;
    appendChildSpy.mockImplementation((node: Node) => {
      capturedLink = node as HTMLAnchorElement;
      return node;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('my-booking.ics', 'BEGIN:VCALENDAR', 'text/calendar');

    expect(capturedLink).not.toBeNull();
    expect(capturedLink!.download).toBe('my-booking.ics');
  });

  it('sets rel=noopener on the download link', () => {
    let capturedLink: HTMLAnchorElement | null = null;
    appendChildSpy.mockImplementation((node: Node) => {
      capturedLink = node as HTMLAnchorElement;
      return node;
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('test.ics', '', 'text/calendar');

    expect(capturedLink!.rel).toBe('noopener');
  });

  it('removes the link from the document after click', () => {
    const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('test.txt', 'content', 'text/plain');

    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('can be called multiple times (repeated clicks)', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadTextFile('a.ics', 'A', 'text/calendar');
    downloadTextFile('b.ics', 'B', 'text/calendar');
    downloadTextFile('c.ics', 'C', 'text/calendar');

    expect(createObjectURL).toHaveBeenCalledTimes(3);
    expect(revokeObjectURL).toHaveBeenCalledTimes(3);
  });
});
