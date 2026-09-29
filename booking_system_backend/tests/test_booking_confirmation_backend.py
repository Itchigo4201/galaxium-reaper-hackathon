import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Booking, Flight, User
from schemas import ErrorResponse
from services import booking



class TestBookingConfirmationBackend:
    """Durable public booking-reference and confirmation retrieval."""

    def _setup_booking(self, db_session):
        user_row = User(name="Backend Traveler", email="backend@example.com")
        flight_row = Flight(
            origin="Earth",
            destination="Europa",
            departure_time="2099-07-01 10:00",
            arrival_time="2099-07-04 18:30",
            base_price=7000,
            economy_seats_available=3,
            business_seats_available=2,
            galaxium_seats_available=1,
        )
        db_session.add_all([user_row, flight_row])
        db_session.commit()

        created = booking.book_flight(
            db_session,
            user_id=user_row.user_id,
            name=user_row.name,
            flight_id=flight_row.flight_id,
            seat_class="business",
        )
        return user_row, flight_row, created

    def test_booking_out_has_stable_public_reference(self, db_session):
        _, _, created = self._setup_booking(db_session)

        assert created.booking_reference == f"GX-{created.booking_id:06d}"

    def test_parse_public_and_legacy_references(self):
        assert booking.parse_booking_reference("GX-000042") == 42
        assert booking.parse_booking_reference("gx-000042") == 42
        assert booking.parse_booking_reference("42") == 42
        assert booking.parse_booking_reference(" GX-000042 ") == 42

    def test_rejects_malformed_reference(self):
        assert booking.parse_booking_reference("GX-ABC") is None
        assert booking.parse_booking_reference("BOOKING-42") is None
        assert booking.parse_booking_reference("") is None

    def test_confirmation_returns_enriched_trip_details(self, db_session):
        user_row, flight_row, created = self._setup_booking(db_session)

        result = booking.get_booking_confirmation(
            db_session,
            created.booking_reference,
            user_row.user_id,
        )

        assert result.booking_id == created.booking_id
        assert result.booking_reference == created.booking_reference
        assert result.origin == "Earth"
        assert result.destination == "Europa"
        assert result.departure_time == flight_row.departure_time
        assert result.arrival_time == flight_row.arrival_time
        assert result.seat_class == "business"
        assert result.price_paid == 17500

    def test_confirmation_accepts_legacy_numeric_reference(self, db_session):
        user_row, _, created = self._setup_booking(db_session)

        result = booking.get_booking_confirmation(
            db_session,
            str(created.booking_id),
            user_row.user_id,
        )

        assert result.booking_reference == created.booking_reference

    def test_confirmation_enforces_booking_owner(self, db_session):
        user_row, _, created = self._setup_booking(db_session)
        other_user = User(name="Other Traveler", email="other@example.com")
        db_session.add(other_user)
        db_session.commit()

        result = booking.get_booking_confirmation(
            db_session,
            created.booking_reference,
            other_user.user_id,
        )

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "BOOKING_NOT_FOUND"

    def test_confirmation_rejects_invalid_reference(self, db_session):
        result = booking.get_booking_confirmation(db_session, "NOT-A-REF", 1)

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "INVALID_BOOKING_REFERENCE"

    def test_confirmation_handles_missing_flight(self, db_session):
        user_row = User(name="Orphan Traveler", email="orphan@example.com")
        db_session.add(user_row)
        db_session.commit()

        orphan = Booking(
            user_id=user_row.user_id,
            flight_id=99999,
            status="booked",
            booking_time="2099-01-01T00:00:00+00:00",
            seat_class="economy",
            price_paid=5000,
        )
        db_session.add(orphan)
        db_session.commit()

        result = booking.get_booking_confirmation(
            db_session,
            orphan.booking_reference,
            user_row.user_id,
        )

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "FLIGHT_NOT_FOUND"
