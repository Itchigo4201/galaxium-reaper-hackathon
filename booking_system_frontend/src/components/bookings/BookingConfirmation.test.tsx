import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { BookingConfirmation } from './BookingConfirmation';
import type { BookingConfirmationData } from '../../utils/bookingArtifacts';

// ─── Module mock ─────────────────────────────────────────────────────────────
//
// We hoist this mock above all imports. copyText and downloadTextFile are the
// only functions that reach outside pure logic (clipboard / DOM / Blob), so we
// replace only them; the rest of the module's real implementations remain.
//
vi.mock('../../utils/bookingArtifacts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/bookingArtifacts')>();
  return {
    ...actual,
    copyText: vi.fn(),
    downloadTextFile: vi.fn(),
  };
});

// Import the mocked functions AFTER the mock is declared (Vitest hoisting takes care of order).
import { copyText, downloadTextFile } from '../../utils/bookingArtifacts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const data: BookingConfirmationData = {
  reference: 'GX-2048',
  origin: 'Earth',
  destination: 'Mars',
  departureTime: '2026-10-12T09:30:00Z',
  arrivalTime: '2026-10-18T16:45:00Z',
  seatClass: 'galaxium',
  totalPaid: 12450,
};

// ─── Cleanup ──────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('BookingConfirmation rendering', () => {
  it('renders the booking reference', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.getByText('#GX-2048')).toBeTruthy();
  });

  it('renders origin and destination', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.getAllByText('Earth → Mars')).toHaveLength(1);
  });

  it('renders the total paid amount', () => {
    render(<BookingConfirmation data={data} />);
    // formatCurrency with minimumFractionDigits: 0 → $12,450
    const amounts = screen.getAllByText('$12,450');
    expect(amounts.length).toBeGreaterThan(0);
  });

  it('renders all three action buttons', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.getAllByRole('button', { name: /copy booking reference/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /download booking as calendar event/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /download booking confirmation/i })).toHaveLength(1);
  });

  it('does not render Close or View My Bookings if callbacks not provided', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    expect(screen.queryByRole('button', { name: /view my bookings/i })).toBeNull();
  });

  it('renders Close button when onClose is provided', () => {
    render(<BookingConfirmation data={data} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('renders View My Bookings button when onViewBookings is provided', () => {
    render(<BookingConfirmation data={data} onViewBookings={vi.fn()} />);
    expect(screen.getByRole('button', { name: /view my bookings/i })).toBeTruthy();
  });

  it('renders both Close and View My Bookings when both provided', () => {
    render(<BookingConfirmation data={data} onClose={vi.fn()} onViewBookings={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /view my bookings/i })).toBeTruthy();
  });

  it('does NOT render a heading when showHeading is false (default)', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.queryByText('Booking Confirmed')).toBeNull();
  });

  it('renders the "Booking Confirmed" heading when showHeading is true', () => {
    render(<BookingConfirmation data={data} showHeading />);
    expect(screen.getByText('Booking Confirmed')).toBeTruthy();
  });

  it('renders the "Your seat is booked" subtext', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.getByText('Your seat is booked')).toBeTruthy();
  });

  it('renders an aria-live region for status messages', () => {
    render(<BookingConfirmation data={data} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('status message region is empty on initial render', () => {
    render(<BookingConfirmation data={data} />);
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');
  });

  it('renders Seat Class label for galaxium', () => {
    render(<BookingConfirmation data={data} />);
    expect(screen.getByText('Galaxium Class')).toBeTruthy();
  });

  it('renders Seat Class label for economy', () => {
    render(<BookingConfirmation data={{ ...data, seatClass: 'economy' }} />);
    expect(screen.getByText('Economy')).toBeTruthy();
  });

  it('renders Seat Class label for business', () => {
    render(<BookingConfirmation data={{ ...data, seatClass: 'business' }} />);
    expect(screen.getByText('Business')).toBeTruthy();
  });

  it('displays zero totalPaid without crashing', () => {
    render(<BookingConfirmation data={{ ...data, totalPaid: 0 }} />);
    expect(screen.getAllByText('$0').length).toBeGreaterThan(0);
  });

  it('renders a reference containing special characters without crashing', () => {
    render(<BookingConfirmation data={{ ...data, reference: 'GX/2048;test' }} />);
    expect(screen.getByText('#GX/2048;test')).toBeTruthy();
  });
});

// ─── Copy action ─────────────────────────────────────────────────────────────

describe('BookingConfirmation copy action', () => {
  beforeEach(() => {
    vi.mocked(copyText).mockResolvedValue(undefined);
  });

  it('calls copyText with the booking reference', async () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await waitFor(() => expect(copyText).toHaveBeenCalledWith('GX-2048'));
  });

  it('shows "Copied" button label on success', async () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Copied');
  });

  it('shows "Booking reference copied." status message on success', async () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Booking reference copied.');
  });

  it('shows error status message when copyText rejects', async () => {
    vi.mocked(copyText).mockRejectedValueOnce(new Error('Permission denied'));
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Could not copy the booking reference.');
  });

  it('button label reverts after calendar action clears the copy status', async () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Copied');
    // Clicking calendar clears the "copied" status
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    await screen.findByText('Calendar event downloaded.');
    // Copy button should revert back to "Copy Reference" label (no longer showing "Copied")
    expect(screen.queryByText('Copied')).toBeNull();
    expect(screen.getByRole('button', { name: /copy booking reference/i })).toBeTruthy();
  });

  it('can copy the reference multiple times', async () => {
    render(<BookingConfirmation data={data} />);
    const copyBtn = screen.getByRole('button', { name: /copy booking reference/i });

    fireEvent.click(copyBtn);
    await screen.findByText('Booking reference copied.');

    // Status changes, revert by clicking another action
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    await screen.findByText('Booking confirmation downloaded.');

    // Click copy again
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Booking reference copied.');
    expect(copyText).toHaveBeenCalledTimes(2);
  });
});

// ─── Calendar action ──────────────────────────────────────────────────────────

describe('BookingConfirmation calendar action', () => {
  it('calls downloadTextFile with correct .ics filename', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    expect(downloadTextFile).toHaveBeenCalledWith(
      'galaxium-GX-2048.ics',
      expect.stringContaining('BEGIN:VCALENDAR'),
      'text/calendar;charset=utf-8'
    );
  });

  it('shows "Calendar event downloaded." status', async () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    await screen.findByText('Calendar event downloaded.');
  });

  it('passes correct DTSTART in calendar content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    const calendarContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(calendarContent).toContain('DTSTART:20261012T093000Z');
  });

  it('passes correct DTEND in calendar content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    const calendarContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(calendarContent).toContain('DTEND:20261018T164500Z');
  });

  it('includes booking reference in calendar content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    const calendarContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(calendarContent).toContain('#GX-2048');
  });

  it('includes route in calendar content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    const calendarContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(calendarContent).toContain('Earth to Mars');
  });

  it('includes seat class in calendar content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    const calendarContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(calendarContent).toContain('Galaxium Class');
  });

  it('includes total paid in calendar content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    const calendarContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(calendarContent).toContain('$12450.00');
  });

  it('can be clicked multiple times (repeated downloads)', () => {
    render(<BookingConfirmation data={data} />);
    const btn = screen.getByRole('button', { name: /download booking as calendar event/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(downloadTextFile).toHaveBeenCalledTimes(3);
  });
});

// ─── Receipt action ───────────────────────────────────────────────────────────

describe('BookingConfirmation receipt action', () => {
  it('calls downloadTextFile with correct .txt filename', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    expect(downloadTextFile).toHaveBeenCalledWith(
      'galaxium-GX-2048-confirmation.txt',
      expect.stringContaining('GALAXIUM TRAVELS'),
      'text/plain;charset=utf-8'
    );
  });

  it('shows "Booking confirmation downloaded." status', async () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    await screen.findByText('Booking confirmation downloaded.');
  });

  it('passes correct route in receipt content', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    const receiptContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(receiptContent).toContain('Route: Earth -> Mars');
  });

  it('passes correct booking reference in receipt', () => {
    render(<BookingConfirmation data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    const receiptContent = vi.mocked(downloadTextFile).mock.calls[0][1];
    expect(receiptContent).toContain('#GX-2048');
  });

  it('uses safe filename for weird reference', () => {
    render(<BookingConfirmation data={{ ...data, reference: 'GX/2048:test' }} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    expect(downloadTextFile).toHaveBeenCalledWith(
      'galaxium-GX-2048-test-confirmation.txt',
      expect.any(String),
      'text/plain;charset=utf-8'
    );
  });

  it('uses safe filename for weird reference in calendar too', () => {
    render(<BookingConfirmation data={{ ...data, reference: 'GX/2048:test' }} />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    expect(downloadTextFile).toHaveBeenCalledWith(
      'galaxium-GX-2048-test.ics',
      expect.any(String),
      'text/calendar;charset=utf-8'
    );
  });
});

// ─── Close / View Bookings ────────────────────────────────────────────────────

describe('BookingConfirmation close and navigation', () => {
  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<BookingConfirmation data={data} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onViewBookings when View My Bookings is clicked', () => {
    const onViewBookings = vi.fn();
    render(<BookingConfirmation data={data} onViewBookings={onViewBookings} />);
    fireEvent.click(screen.getByRole('button', { name: /view my bookings/i }));
    expect(onViewBookings).toHaveBeenCalledTimes(1);
  });

  it('onClose does not trigger onViewBookings', () => {
    const onClose = vi.fn();
    const onViewBookings = vi.fn();
    render(<BookingConfirmation data={data} onClose={onClose} onViewBookings={onViewBookings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onViewBookings).not.toHaveBeenCalled();
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

describe('BookingConfirmation accessibility', () => {
  it('all three action buttons have aria-label attributes', () => {
    render(<BookingConfirmation data={data} />);
    const copyBtn = screen.getByRole('button', { name: /copy booking reference/i });
    const calBtn = screen.getByRole('button', { name: /download booking as calendar event/i });
    const receiptBtn = screen.getByRole('button', { name: /download booking confirmation/i });
    expect(copyBtn.getAttribute('aria-label')).toBeTruthy();
    expect(calBtn.getAttribute('aria-label')).toBeTruthy();
    expect(receiptBtn.getAttribute('aria-label')).toBeTruthy();
  });

  it('status region has aria-live="polite"', () => {
    render(<BookingConfirmation data={data} />);
    const live = document.querySelector('[aria-live="polite"]');
    expect(live).toBeTruthy();
    expect(live!.getAttribute('aria-live')).toBe('polite');
  });

  it('all buttons have type="button" to prevent accidental form submission', () => {
    render(<BookingConfirmation data={data} onClose={vi.fn()} onViewBookings={vi.fn()} />);
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.getAttribute('type')).toBe('button');
    });
  });
});
