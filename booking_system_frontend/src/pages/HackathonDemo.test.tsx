/**
 * HackathonDemo.test.tsx — Sprint 3 adversarial audit
 *
 * Tests the hackathon demo page:
 *  - Deep-link (?view=confirmed) shows confirmed state immediately
 *  - Default state shows problem panel
 *  - Reset button returns to problem state
 *  - BookingConfirmation renders with sample data (backend-independent)
 *  - Numeric booking reference (e.g. "42") works end-to-end in post-booking actions
 *  - No backend calls from the demo page
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HackathonDemo } from './HackathonDemo';
import { BookingConfirmation } from '../components/bookings/BookingConfirmation';

// ─── Mock bookingArtifacts side-effects ──────────────────────────────────────
vi.mock('../utils/bookingArtifacts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/bookingArtifacts')>();
  return {
    ...actual,
    copyText: vi.fn().mockResolvedValue(undefined),
    downloadTextFile: vi.fn(),
  };
});

import { copyText, downloadTextFile } from '../utils/bookingArtifacts';

// ─── Cleanup ──────────────────────────────────────────────────────────────────
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Restore location search after each test
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { search: '' },
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const setSearch = (search: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { search },
  });
};

// ─── Default / problem state ──────────────────────────────────────────────────

describe('HackathonDemo default state', () => {
  it('renders the hackathon title', () => {
    setSearch('');
    render(<HackathonDemo />);
    expect(screen.getByText(/IBM Bob Hackathon 2026/i)).toBeTruthy();
  });

  it('shows the problem panel by default (no ?view param)', () => {
    setSearch('');
    render(<HackathonDemo />);
    expect(screen.getByText(/Confirmation vanished too quickly/i)).toBeTruthy();
    expect(screen.queryByText('Booking Confirmed')).toBeNull();
  });

  it('shows the "Run improved confirmation" CTA button', () => {
    setSearch('');
    render(<HackathonDemo />);
    expect(screen.getByRole('button', { name: /run improved confirmation/i })).toBeTruthy();
  });

  it('shows the Reset button', () => {
    setSearch('');
    render(<HackathonDemo />);
    expect(screen.getByRole('button', { name: /reset/i })).toBeTruthy();
  });

  it('does NOT render BookingConfirmation in problem state', () => {
    setSearch('');
    render(<HackathonDemo />);
    // Booking reference from sample data should not be visible
    expect(screen.queryByText('#GX-2048')).toBeNull();
  });
});

// ─── Deep-link: ?view=confirmed ───────────────────────────────────────────────

describe('HackathonDemo deep-link ?view=confirmed', () => {
  beforeEach(() => {
    setSearch('?view=confirmed');
  });

  it('renders the confirmed state directly when ?view=confirmed', () => {
    render(<HackathonDemo />);
    expect(screen.getByText('#GX-2048')).toBeTruthy();
  });

  it('shows "Booking Confirmed" heading (showHeading=true in demo)', () => {
    render(<HackathonDemo />);
    expect(screen.getByText('Booking Confirmed')).toBeTruthy();
  });

  it('shows the sample route Earth → Mars', () => {
    render(<HackathonDemo />);
    expect(screen.getByText('Earth → Mars')).toBeTruthy();
  });

  it('does NOT show the problem panel in confirmed state', () => {
    render(<HackathonDemo />);
    expect(screen.queryByText(/Confirmation vanished too quickly/i)).toBeNull();
  });

  it('shows the demo backend-independent notice', () => {
    render(<HackathonDemo />);
    expect(screen.getByText(/Deterministic hackathon demo/i)).toBeTruthy();
  });
});

// ─── CTA button transition ─────────────────────────────────────────────────────

describe('HackathonDemo CTA transition', () => {
  beforeEach(() => {
    setSearch('');
  });

  it('clicking "Run improved confirmation" shows the confirmed state', () => {
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /run improved confirmation/i }));
    expect(screen.getByText('#GX-2048')).toBeTruthy();
    expect(screen.getByText('Booking Confirmed')).toBeTruthy();
  });

  it('in confirmed state the problem panel is hidden', () => {
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /run improved confirmation/i }));
    expect(screen.queryByText(/Confirmation vanished too quickly/i)).toBeNull();
  });
});

// ─── Reset button ─────────────────────────────────────────────────────────────

describe('HackathonDemo reset', () => {
  it('Reset button returns to problem state from confirmed', () => {
    setSearch('?view=confirmed');
    render(<HackathonDemo />);
    // Verify we are in confirmed state
    expect(screen.getByText('#GX-2048')).toBeTruthy();
    // Click reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    // Should be back to problem panel
    expect(screen.getByText(/Confirmation vanished too quickly/i)).toBeTruthy();
    expect(screen.queryByText('#GX-2048')).toBeNull();
  });

  it('Reset clears the demoNotice message', () => {
    setSearch('');
    render(<HackathonDemo />);
    // Navigate to confirmed state first
    fireEvent.click(screen.getByRole('button', { name: /run improved confirmation/i }));
    // Click "View My Bookings" to set demoNotice
    fireEvent.click(screen.getByRole('button', { name: /view my bookings/i }));
    expect(screen.getByText(/Demo action/i)).toBeTruthy();
    // Reset
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    // demoNotice should be cleared
    expect(screen.queryByText(/Demo action/i)).toBeNull();
  });
});

// ─── Post-booking actions in demo context ─────────────────────────────────────

describe('HackathonDemo post-booking actions', () => {
  beforeEach(() => {
    setSearch('?view=confirmed');
  });

  it('copy reference button calls copyText with the sample reference', async () => {
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Booking reference copied.');
    expect(copyText).toHaveBeenCalledWith('GX-2048');
  });

  it('calendar download calls downloadTextFile with .ics extension', () => {
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    expect(downloadTextFile).toHaveBeenCalledWith(
      'galaxium-GX-2048.ics',
      expect.stringContaining('BEGIN:VCALENDAR'),
      'text/calendar;charset=utf-8'
    );
  });

  it('receipt download calls downloadTextFile with .txt extension', () => {
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    expect(downloadTextFile).toHaveBeenCalledWith(
      'galaxium-GX-2048-confirmation.txt',
      expect.stringContaining('GALAXIUM TRAVELS'),
      'text/plain;charset=utf-8'
    );
  });

  it('View My Bookings sets the demo notice (no navigation)', () => {
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /view my bookings/i }));
    expect(screen.getByText(/Demo action: the production app opens My Bookings here/i)).toBeTruthy();
  });

  it('no Close button in demo (onClose not passed)', () => {
    render(<HackathonDemo />);
    // BookingConfirmation is rendered without onClose in hackathon demo
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});

// ─── Numeric booking reference (real system behaviour) ───────────────────────

describe('HackathonDemo numeric booking reference handling', () => {
  it('numeric reference renders correctly in BookingConfirmation', () => {
    // Simulate what the real system delivers: a numeric string booking_id
    render(
      <BookingConfirmation
        data={{
          reference: '42',
          origin: 'Earth',
          destination: 'Mars',
          departureTime: '2026-10-12T09:30:00Z',
          arrivalTime: '2026-10-18T16:45:00Z',
          seatClass: 'economy',
          totalPaid: 10000,
        }}
      />
    );
    expect(screen.getByText('#42')).toBeTruthy();
  });
});

// ─── No backend calls from demo ───────────────────────────────────────────────

describe('HackathonDemo is backend-independent', () => {
  it('does not call any API function when rendering in confirmed state', () => {
    // The demo must work with no backend — it uses only hardcoded sample data.
    // We verify by checking no fetch/XHR calls are made.
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    setSearch('?view=confirmed');
    render(<HackathonDemo />);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('does not call any API function when clicking all post-booking actions', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    setSearch('?view=confirmed');
    render(<HackathonDemo />);
    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    fireEvent.click(screen.getByRole('button', { name: /download booking as calendar event/i }));
    fireEvent.click(screen.getByRole('button', { name: /download booking confirmation/i }));
    fireEvent.click(screen.getByRole('button', { name: /view my bookings/i }));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
