import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingModal } from './BookingModal';
import { UserContext } from '../../hooks/useUserContext';
import type { Flight, Quote, Hold } from '../../types';
import {
  createHold,
  createQuote,
  confirmHold,
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

const hold: Hold = {
  holdId: 'H-TEST',
  quoteId: 'Q-TEST',
  status: 'HELD',
  reservedUntil: '2099-10-01T00:15:00Z',
  createdAt: '2026-09-29T00:00:00Z',
  updatedAt: '2026-09-29T00:00:00Z',
};

describe('BookingModal confirmation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createQuote).mockResolvedValue(quote);
    vi.mocked(createHold).mockResolvedValue(hold);
    vi.mocked(confirmHold).mockResolvedValue({
      ...hold,
      status: 'CONFIRMED',
      externalBookingReference: 'GX-TEST-9000',
    });
  });

  it('keeps the modal open and renders the returned booking reference after confirmation', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <MemoryRouter>
        <UserContext.Provider
          value={{
            user: {
              user_id: 7,
              name: 'Demo Traveler',
              email: 'demo@example.com',
            },
            setUser: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <BookingModal
            isOpen
            onClose={onClose}
            flight={flight}
            onSuccess={onSuccess}
          />
        </UserContext.Provider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /get quote/i }));
    await screen.findByText('Q-TEST');

    fireEvent.click(screen.getByRole('button', { name: /place hold/i }));
    await screen.findByText('H-TEST');

    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

    await screen.findByText('Booking Confirmed');
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
});
