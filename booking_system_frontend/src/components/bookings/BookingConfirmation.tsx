import { useState } from 'react';
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  DollarSign,
  Download,
  Plane,
  Rocket,
  Ticket,
} from 'lucide-react';
import { calculateDuration, formatCurrency, formatDate } from '../../utils/formatters';
import {
  buildBookingCalendar,
  buildBookingReceipt,
  calendarFilename,
  copyText,
  downloadTextFile,
  receiptFilename,
  seatClassLabel,
  type BookingConfirmationData,
} from '../../utils/bookingArtifacts';

interface BookingConfirmationProps {
  data: BookingConfirmationData;
  onViewBookings?: () => void;
  onClose?: () => void;
  showHeading?: boolean;
}

export const BookingConfirmation = ({
  data,
  onViewBookings,
  onClose,
  showHeading = false,
}: BookingConfirmationProps) => {
  const [statusMessage, setStatusMessage] = useState('');

  const SeatIcon =
    data.seatClass === 'business' ? Crown : data.seatClass === 'galaxium' ? Rocket : Plane;

  const handleCopy = async () => {
    try {
      await copyText(data.reference);
      setStatusMessage('Booking reference copied.');
    } catch {
      setStatusMessage('Could not copy the booking reference.');
    }
  };

  const handleCalendar = () => {
    downloadTextFile(
      calendarFilename(data.reference),
      buildBookingCalendar(data),
      'text/calendar;charset=utf-8'
    );
    setStatusMessage('Calendar event downloaded.');
  };

  const handleReceipt = () => {
    downloadTextFile(
      receiptFilename(data.reference),
      buildBookingReceipt(data),
      'text/plain;charset=utf-8'
    );
    setStatusMessage('Booking confirmation downloaded.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="rounded-full border border-alien-green/30 bg-alien-green/15 p-4">
          <CheckCircle2 size={40} className="text-alien-green" />
        </div>
        <div className="text-center">
          <p className="text-sm text-star-white/60">Your seat is booked</p>
          {showHeading && <h3 className="mt-1 text-3xl font-black">Booking Confirmed</h3>}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-alien-green/30 bg-alien-green/10 p-3">
        <Ticket size={16} className="text-alien-green" />
        <span className="text-xs text-star-white/60">Booking Reference</span>
        <span className="ml-auto font-mono font-bold text-alien-green">#{data.reference}</span>
      </div>

      <div className="glass-card space-y-3 bg-white/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Plane size={16} className="text-space-blue" />
          <h3 className="font-bold text-star-white">
            {data.origin} → {data.destination}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Detail
            icon={CalendarPlus}
            label="Departure"
            value={formatDate(data.departureTime, 'MMM dd, HH:mm')}
          />
          <Detail
            icon={CalendarPlus}
            label="Arrival"
            value={formatDate(data.arrivalTime, 'MMM dd, HH:mm')}
          />
          <Detail
            icon={Clock}
            label="Duration"
            value={calculateDuration(data.departureTime, data.arrivalTime)}
          />
          <Detail
            icon={SeatIcon}
            label="Seat Class"
            value={seatClassLabel(data.seatClass)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-cosmic-gradient p-4">
        <div className="flex items-center gap-2">
          <DollarSign className="text-white" size={20} />
          <span className="font-semibold text-white">Total Paid</span>
        </div>
        <span className="text-xl font-bold text-white">{formatCurrency(data.totalPaid)}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ActionButton
          icon={statusMessage === 'Booking reference copied.' ? Check : Copy}
          label={statusMessage === 'Booking reference copied.' ? 'Copied' : 'Copy Reference'}
          ariaLabel="Copy booking reference"
          onClick={handleCopy}
        />
        <ActionButton
          icon={CalendarPlus}
          label="Add to Calendar"
          ariaLabel="Download booking as calendar event"
          onClick={handleCalendar}
        />
        <ActionButton
          icon={Download}
          label="Download Confirmation"
          ariaLabel="Download booking confirmation"
          onClick={handleReceipt}
        />
      </div>

      <p aria-live="polite" className="min-h-5 text-center text-xs text-alien-green">
        {statusMessage}
      </p>

      {(onClose || onViewBookings) && (
        <div className="flex gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              Close
            </button>
          )}
          {onViewBookings && (
            <button
              type="button"
              onClick={onViewBookings}
              className="flex-1 rounded-lg bg-cosmic-gradient px-4 py-3 font-semibold text-white transition hover:shadow-lg hover:shadow-cosmic-purple/50"
            >
              View My Bookings
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const ActionButton = ({
  icon: Icon,
  label,
  ariaLabel,
  onClick,
}: {
  icon: typeof Copy;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm font-semibold text-star-white transition hover:border-alien-green/30 hover:bg-alien-green/10"
  >
    <Icon size={20} className="text-alien-green" />
    <span>{label}</span>
  </button>
);

const Detail = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarPlus;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2">
    <Icon size={14} className="mt-0.5 shrink-0 text-star-white/40" />
    <div>
      <p className="mb-0.5 text-xs text-star-white/50">{label}</p>
      <p className="font-medium text-star-white">{value}</p>
    </div>
  </div>
);
