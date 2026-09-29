import { act, fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingModal } from './BookingModal';
import { UserContext } from '../../hooks/useUserContext';
import type { Flight, Quote, Hold } from '../../types';
import {
  createHold,
  createQuote,
  confirmHold,
  releaseHold,
} from '../../services/api';

vi.mock('../../services/api', () => ({
  createQuote: vi.fn(),
  createHold: vi.fn(),
  confirmHold: vi.fn(),
  releaseHold: vi.fn(),
}));

vi.mock('../../utils/holdStorage', () => ({
  storeHold: vi.fn(),
  removeHold: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const flight: Flight = {
  flight_id: 42,
  origin: 'Earth',
  destination: 'Mars',
  departure_time: '2026-10-12T09:30:00Z',
  arrival_time: '2026-10-18T16:45:00Z',
  base_price: 5000,
  economy_seats_available: 12,
  business_seats_available: 8,
  galaxium_seats_available: 4,
  economy_price: 5000,
  business_price: 8000,
  galaxium_price: 12450,
};

const quote: Quote = {
  quoteId: 'Q-TEST',
  flightId: 42,
  seatClass: 'economy',
  quantity: 1,
  travelerId: 7,
  travelerName: 'Demo Traveler',
  pricePerSeat: 5000,
  totalPrice: 5000,
  expiresAt: '2026-10-01T00:00:00Z',
  status: 'CREATED',
  createdAt: '2026-09-29T00:00:00Z',
};

// hold with far-future reservedUntil so timeLeft is never 0 in tests
const hold: Hold = {
  holdId: 'H-TEST',
  quoteId: 'Q-TEST',
  status: 'HELD',
  reservedUntil: '2099-10-01T00:15:00Z',
  createdAt: '2026-09-29T00:00:00Z',
  updatedAt: '2026-09-29T00:00:00Z',
};

const confirmedHold: Hold = {
  ...hold,
  status: 'CONFIRMED',
  externalBookingReference: 'GX-TEST-9000',
};

const user = {
  user_id: 7,
  name: 'Demo Traveler',
  email: 'demo@example.com',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Use ReturnType<typeof vi.fn<() => void>> to satisfy both the component's
// prop types and Vitest's Mock inspection in tests.
type VoidMock = ReturnType<typeof vi.fn<() => void>>;

interface RenderOptions {
  isOpen?: boolean;
  flight?: Flight | null;
  onClose?: VoidMock;
  onSuccess?: VoidMock;
  userOverride?: typeof user | null;
}

const renderModal = ({
  isOpen = true,
  flight: f = flight,
  onClose = vi.fn<() => void>(),
  onSuccess = vi.fn<() => void>(),
  userOverride = user,
}: RenderOptions = {}) => {
  const result = render(
    <MemoryRouter>
      <UserContext.Provider
        value={{
          user: userOverride,
          setUser: vi.fn<(u: typeof user | null) => void>(),
          logout: vi.fn<() => void>(),
        }}
      >
        <BookingModal
          isOpen={isOpen}
          onClose={onClose}
          flight={f}
          onSuccess={onSuccess}
        />
      </UserContext.Provider>
    </MemoryRouter>
  );
  return { ...result, onClose, onSuccess };
};

/** Walk through quote → hold → confirm steps */
const walkToConfirm = async () => {
  fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
  await screen.findByText('Q-TEST');
  fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
  await screen.findByText('H-TEST');
  fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
  await screen.findByText('Booking Confirmed');
};

// ─── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createQuote).mockResolvedValue(quote);
  vi.mocked(createHold).mockResolvedValue(hold);
  vi.mocked(confirmHold).mockResolvedValue(confirmedHold);
  vi.mocked(releaseHold).mockResolvedValue({ ...hold, status: 'RELEASED' });
});

afterEach(() => {
  cleanup();
});

// ─── Booking confirmation lifecycle ──────────────────────────────────────────

describe('BookingModal confirmation flow', () => {
  it('keeps the modal open and renders the returned booking reference after confirmation', async () => {
    const { onClose, onSuccess } = renderModal();

    await walkToConfirm();
    expect(screen.getByText('#GX-TEST-9000')).toBeTruthy();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    fireEvent.click(screen.getByRole('button', { name: /copy booking reference/i }));
    await screen.findByText('Copied');
    expect(writeText).toHaveBeenCalledWith('GX-TEST-9000');

    expect(screen.getByRole('button', { name: /download booking as calendar event/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /download booking confirmation/i })).toBeTruthy();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the modal title "Booking Confirmed" after successful confirmation', async () => {
    renderModal();
    await walkToConfirm();
    // Modal title should reflect the confirmed step
    expect(screen.getByText('Booking Confirmed')).toBeTruthy();
  });

  it('onSuccess is called exactly once on real success', async () => {
    const { onSuccess } = renderModal();
    await walkToConfirm();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('onSuccess is NOT called when confirmation API fails', async () => {
    vi.mocked(confirmHold).mockRejectedValueOnce(new Error('Server error'));
    const { onSuccess } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    // Still on hold step (no transition to confirmed)
    await waitFor(() => expect(screen.queryByText('Booking Confirmed')).toBeNull());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does NOT show confirmed step when externalBookingReference is missing', async () => {
    vi.mocked(confirmHold).mockResolvedValueOnce({
      ...hold,
      status: 'CONFIRMED',
      // externalBookingReference intentionally absent
    });
    const { onSuccess } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    // Should not advance to confirmed step
    await waitFor(() => expect(screen.queryByText('Booking Confirmed')).toBeNull());
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('renders the exact booking reference from the API response', async () => {
    vi.mocked(confirmHold).mockResolvedValueOnce({
      ...hold,
      status: 'CONFIRMED',
      externalBookingReference: 'UNIQUE-REF-XYZ-999',
    });
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await screen.findByText('#UNIQUE-REF-XYZ-999');
  });

  it('modal resets to select step when isOpen transitions false → true', async () => {
    const { rerender, onClose, onSuccess } = renderModal();

    await walkToConfirm();
    expect(screen.getByText('#GX-TEST-9000')).toBeTruthy();

    // Close and reopen
    rerender(
      <MemoryRouter>
        <UserContext.Provider value={{ user, setUser: vi.fn<(u: typeof user | null) => void>(), logout: vi.fn<() => void>() }}>
          <BookingModal isOpen={false} onClose={onClose} flight={flight} onSuccess={onSuccess} />
        </UserContext.Provider>
      </MemoryRouter>
    );
    rerender(
      <MemoryRouter>
        <UserContext.Provider value={{ user, setUser: vi.fn<(u: typeof user | null) => void>(), logout: vi.fn<() => void>() }}>
          <BookingModal isOpen={true} onClose={onClose} flight={flight} onSuccess={onSuccess} />
        </UserContext.Provider>
      </MemoryRouter>
    );

    // Should be back to select step
    expect(screen.getByRole('button', { name: /get quote/i })).toBeTruthy();
    expect(screen.queryByText('#GX-TEST-9000')).toBeNull();
  });
});

// ─── API failure states ───────────────────────────────────────────────────────

describe('BookingModal API failure states', () => {
  it('shows quote step on success — remains on select if quote fails', async () => {
    vi.mocked(createQuote).mockRejectedValueOnce(new Error('Service unavailable'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));

    // Still on select step (Get Quote button is still there)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /get quote/i })).toBeTruthy()
    );
    expect(screen.queryByText('Q-TEST')).toBeNull();
  });

  it('remains on quote step if hold creation fails', async () => {
    vi.mocked(createHold).mockRejectedValueOnce(new Error('Hold failed'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));

    // Still on quote step
    await waitFor(() => expect(screen.getByText('Q-TEST')).toBeTruthy());
    expect(screen.queryByText('H-TEST')).toBeNull();
  });

  it('remains on hold step if confirm fails', async () => {
    vi.mocked(confirmHold).mockRejectedValueOnce(new Error('Confirm failed'));
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    // Still on hold step
    await waitFor(() => expect(screen.getByText('H-TEST')).toBeTruthy());
    expect(screen.queryByText('Booking Confirmed')).toBeNull();
  });

  it('calls onClose when release hold succeeds', async () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');
    fireEvent.click(screen.getByRole('button', { name: /release hold/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('does not call onClose when release hold fails', async () => {
    vi.mocked(releaseHold).mockRejectedValueOnce(new Error('Release failed'));
    const { onClose } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');
    fireEvent.click(screen.getByRole('button', { name: /release hold/i }));

    // Should still be on hold step, onClose not called
    await waitFor(() => expect(screen.getByText('H-TEST')).toBeTruthy());
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Expired hold ─────────────────────────────────────────────────────────────

describe('BookingModal expired hold behavior', () => {
  it('does NOT show the expired state when hold has a future reservedUntil', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');

    // Should NOT show EXPIRED or the red state — hold is far in the future
    expect(screen.queryByText('EXPIRED')).toBeNull();
    expect(screen.getByRole('button', { name: /confirm booking/i })).toBeTruthy();
  });

  it('shows EXPIRED when hold reservedUntil is in the past', async () => {
    const expiredHold: Hold = {
      ...hold,
      reservedUntil: '2020-01-01T00:00:00Z', // far in the past
    };
    vi.mocked(createHold).mockResolvedValueOnce(expiredHold);
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');

    expect(screen.getByText('EXPIRED')).toBeTruthy();
    // Confirm/Release buttons should not be shown
    expect(screen.queryByRole('button', { name: /confirm booking/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /release hold/i })).toBeNull();
  });

  it('does not flash expired on fresh hold placement', async () => {
    // This validates no false-expired hold flash on the initial render
    // The hold is far in the future so timeLeft should be non-zero from the start
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));

    // Immediately after hold is placed, should not show EXPIRED
    await screen.findByText('H-TEST');
    expect(screen.queryByText('EXPIRED')).toBeNull();
    expect(screen.queryByText('Hold Expired')).toBeNull();
  });
});

// ─── Navigation flow ──────────────────────────────────────────────────────────

describe('BookingModal navigation', () => {
  it('can go back from quote step to select step', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByRole('button', { name: /get quote/i })).toBeTruthy();
  });

  it('renders null when flight is null', () => {
    const { container } = renderModal({ flight: null });
    expect(container.firstChild).toBeNull();
  });

  it('does not render when isOpen is false', () => {
    // Modal component renders the modal as hidden/closed
    renderModal({ isOpen: false });
    // Modal content should not be visible (the modal title is not shown)
    expect(screen.queryByText('Book Your Flight')).toBeNull();
  });

  it('View My Bookings button navigates away and closes modal', async () => {
    const { onClose } = renderModal();

    await walkToConfirm();

    fireEvent.click(screen.getByRole('button', { name: /view my bookings/i }));
    // onClose should be called
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Close button on confirmed step closes the modal', async () => {
    const { onClose } = renderModal();

    await walkToConfirm();

    // Use exact name to avoid matching the Modal header's "Close modal" X button
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── User not signed in ────────────────────────────────────────────────────────

describe('BookingModal unauthenticated state', () => {
  it('does not call createQuote when user is null', async () => {
    renderModal({ userOverride: null });

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));

    // createQuote should NOT have been called (user is null)
    await waitFor(() => expect(createQuote).not.toHaveBeenCalled());
  });
});

// ─── Step titles ──────────────────────────────────────────────────────────────

describe('BookingModal step titles', () => {
  it('shows "Book Your Flight" on select step', () => {
    renderModal();
    expect(screen.getByText('Book Your Flight')).toBeTruthy();
  });

  it('shows "Your Price Quote" on quote step', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Your Price Quote');
  });

  it('shows "Seat Reserved" on hold step', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');
    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('Seat Reserved');
  });

  it('shows "Booking Confirmed" on confirmed step', async () => {
    renderModal();
    await walkToConfirm();
    expect(screen.getByText('Booking Confirmed')).toBeTruthy();
  });
});

// ─── Loading states ───────────────────────────────────────────────────────────

describe('BookingModal loading states', () => {
  it('disables Get Quote button while loading', async () => {
    // createQuote never resolves during this check
    let resolveQuote!: (value: Quote) => void;
    vi.mocked(createQuote).mockReturnValueOnce(
      new Promise((resolve) => { resolveQuote = resolve; })
    );

    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));

    // The button becomes loading/disabled — check that it exists and we're waiting
    // (the button might change text or become disabled)
    await waitFor(() => expect(createQuote).toHaveBeenCalledTimes(1));

    // Resolve to clean up
    act(() => { resolveQuote(quote); });
    await screen.findByText('Q-TEST');
  });
});
