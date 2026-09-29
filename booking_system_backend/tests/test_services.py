import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Booking, Flight, User
from schemas import ErrorResponse
from services import booking, flight, user


class TestFlightService:
    """Test flight service functions."""

    def test_list_flights_empty(self, db_session):
        """Test listing flights when database is empty."""
        result = flight.list_flights(db_session)
        assert result == []

    def test_list_flights_with_data(self, db_session):
        """Test listing flights with data in database."""
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session)
        assert len(result) == 1
        assert result[0].origin == "Earth"
        assert result[0].destination == "Mars"

    def test_list_flights_sort_by_price_asc(self, db_session):
        """Test sorting flights by price ascending."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, sort_by="base_price", sort_order="asc")
        assert len(result) == 2
        assert result[0].base_price == 1000
        assert result[1].base_price == 2000

    def test_list_flights_sort_by_price_desc(self, db_session):
        """Test sorting flights by price descending."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, sort_by="base_price", sort_order="desc")
        assert len(result) == 2
        assert result[0].base_price == 2000
        assert result[1].base_price == 1000

    def test_list_flights_filter_by_date_range(self, db_session):
        """Test filtering flights by date range."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-15 09:00", arrival_time="2099-01-15 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, departure_date_from="2099-01-10", departure_date_to="2099-01-20")
        assert len(result) == 1
        assert result[0].destination == "Venus"

    def test_list_flights_filter_by_price_range(self, db_session):
        """Test filtering flights by price range."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=1500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-03 09:00", arrival_time="2099-01-03 17:00",
            base_price=2500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, min_price=1000, max_price=2000)
        assert len(result) == 1
        assert result[0].base_price == 1500

    def test_list_flights_filter_by_seat_class(self, db_session):
        """Test filtering flights by seat class availability."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=0, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=0, galaxium_seats_available=0
        ))
        db_session.commit()

        result = flight.list_flights(db_session, seat_class="economy")
        assert len(result) == 1
        assert result[0].destination == "Venus"

    def test_list_flights_filter_by_time_period(self, db_session):
        """Test filtering flights by time of day."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 08:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-01 14:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, departure_time_period="morning")
        assert len(result) == 1
        assert result[0].destination == "Mars"

    def test_list_flights_filter_by_duration(self, db_session):
        """Test filtering flights by duration."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 13:00",  # 4 hours
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 21:00",  # 12 hours
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, min_duration=5, max_duration=15)
        assert len(result) == 1
        assert result[0].destination == "Jupiter"

    def test_list_flights_filter_by_min_seats(self, db_session):
        """Test filtering flights by minimum seats available."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=1, business_seats_available=1, galaxium_seats_available=0
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=2
        ))
        db_session.commit()

        result = flight.list_flights(db_session, min_seats_available=5)
        assert len(result) == 1
        assert result[0].destination == "Venus"

    def test_list_flights_filter_by_route_category(self, db_session):
        """Test filtering flights by route category."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, route_category="inner_planets")
        assert len(result) == 1
        assert result[0].destination == "Mars"

    def test_list_flights_combined_filters(self, db_session):
        """Test combining multiple filters."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(
            db_session,
            sort_by="base_price",
            sort_order="asc",
            min_price=500,
            max_price=1500,
            seat_class="economy"
        )
        assert len(result) == 1
        assert result[0].destination == "Mars"


class TestUserService:
    """Test user service functions."""

    def test_register_user_success(self, db_session):
        """Test successful user registration."""
        result = user.register_user(db_session, "Test User", "test@example.com")
        assert result.name == "Test User"
        assert result.email == "test@example.com"
        assert result.user_id > 0

    def test_register_user_duplicate_email(self, db_session):
        """Test registration with duplicate email."""
        user.register_user(db_session, "User 1", "test@example.com")
        result = user.register_user(db_session, "User 2", "test@example.com")

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "EMAIL_EXISTS"

    def test_get_user_success(self, db_session):
        """Test successful user retrieval."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.commit()

        result = user.get_user(db_session, "Test User", "test@example.com")
        assert result.name == "Test User"
        assert result.email == "test@example.com"

    def test_get_user_not_found(self, db_session):
        """Test user retrieval when not found."""
        result = user.get_user(db_session, "NonExistent", "none@example.com")
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "USER_NOT_FOUND"


class TestBookingService:
    """Test booking service functions."""

    def test_book_flight_success(self, db_session):
        """Test successful flight booking."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Test User", flight_obj.flight_id)
        assert result.status == "booked"
        assert result.user_id == user_obj.user_id
        assert result.flight_id == flight_obj.flight_id

        # Verify seat was decremented
        db_session.refresh(flight_obj)
        assert flight_obj.economy_seats_available == 4

    def test_book_flight_not_found(self, db_session):
        """Test booking non-existent flight."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.commit()
        user_obj = db_session.query(User).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Test User", 999)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "FLIGHT_NOT_FOUND"

    def test_book_flight_no_seats(self, db_session):
        """Test booking when no seats available."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=0,
            business_seats_available=0,
            galaxium_seats_available=0
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Test User", flight_obj.flight_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NO_SEATS_AVAILABLE"

    def test_book_flight_user_not_found(self, db_session):
        """Test booking with non-existent user."""
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, 999, "Fake User", flight_obj.flight_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "USER_NOT_FOUND"

    def test_book_flight_name_mismatch(self, db_session):
        """Test booking with wrong name for user ID."""
        db_session.add(User(name="Real Name", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Wrong Name", flight_obj.flight_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NAME_MISMATCH"

    def test_cancel_booking_success(self, db_session):
        """Test successful booking cancellation."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=4,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="booked",
            booking_time="2099-01-01 10:00",
            seat_class="economy",
            price_paid=1000000
        ))
        db_session.commit()

        booking_obj = db_session.query(Booking).first()
        result = booking.cancel_booking(db_session, booking_obj.booking_id)

        assert result.status == "cancelled"

        # Verify seat was restored
        db_session.refresh(flight_obj)
        assert flight_obj.economy_seats_available == 5

    def test_cancel_booking_not_found(self, db_session):
        """Test cancelling non-existent booking."""
        result = booking.cancel_booking(db_session, 999)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "BOOKING_NOT_FOUND"

    def test_cancel_booking_already_cancelled(self, db_session):
        """Test cancelling already cancelled booking."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="cancelled",
            booking_time="2099-01-01 10:00",
            seat_class="economy",
            price_paid=1000000
        ))
        db_session.commit()

        booking_obj = db_session.query(Booking).first()
        result = booking.cancel_booking(db_session, booking_obj.booking_id)

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "ALREADY_CANCELLED"

    def test_get_bookings_success(self, db_session):
        """Test getting user bookings."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="booked",
            booking_time="2099-01-01 10:00",
            seat_class="economy",
            price_paid=1000000
        ))
        db_session.commit()

        result = booking.get_bookings(db_session, user_obj.user_id)
        assert len(result) == 1
        assert result[0].status == "booked"

    def test_get_bookings_empty(self, db_session):
        """Test getting bookings when user has none."""
        result = booking.get_bookings(db_session, 999)
        assert result == []



class TestFlightFiltering:
    """Test flight filtering and sorting functionality."""

    def setup_method(self):
        """Setup test flights with various attributes."""

    def test_filter_by_origin(self, db_session):
        """Test filtering flights by origin (case-insensitive partial match)."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Moon",
                destination="Mars",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=800000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Venus",
                destination="Earth",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=1200000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test exact match
        results = flight.list_flights(db_session, origin="Earth")
        assert len(results) == 1
        assert results[0].origin == "Earth"

        # Test case-insensitive
        results = flight.list_flights(db_session, origin="earth")
        assert len(results) == 1
        assert results[0].origin == "Earth"

        # Test partial match
        results = flight.list_flights(db_session, origin="ar")
        assert len(results) == 1
        assert "ar" in results[0].origin.lower()

    def test_filter_by_destination(self, db_session):
        """Test filtering flights by destination."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        results = flight.list_flights(db_session, destination="Mars")
        assert len(results) == 1
        assert results[0].destination == "Mars"

    def test_filter_by_date_range(self, db_session):
        """Test filtering flights by departure date range."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-15 10:00",
                arrival_time="2026-03-15 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-04-01 11:00",
                arrival_time="2026-04-01 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test from date
        results = flight.list_flights(db_session, departure_date_from="2026-03-15")
        assert len(results) == 2
        assert all(r.departure_time >= "2026-03-15" for r in results)

        # Test to date
        results = flight.list_flights(db_session, departure_date_to="2026-03-15")
        assert len(results) == 2
        assert all(r.departure_time <= "2026-03-15 23:59" for r in results)

        # Test date range
        results = flight.list_flights(
            db_session,
            departure_date_from="2026-03-10",
            departure_date_to="2026-03-20"
        )
        assert len(results) == 1
        assert results[0].departure_time.startswith("2026-03-15")

    def test_filter_by_price_range(self, db_session):
        """Test filtering flights by price range."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Moon",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=500000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test min price
        results = flight.list_flights(db_session, min_price=1000000)
        assert len(results) == 2
        assert all(r.base_price >= 1000000 for r in results)

        # Test max price
        results = flight.list_flights(db_session, max_price=1000000)
        assert len(results) == 2
        assert all(r.base_price <= 1000000 for r in results)

        # Test price range
        results = flight.list_flights(db_session, min_price=800000, max_price=1500000)
        assert len(results) == 1
        assert results[0].base_price == 1000000

    def test_filter_by_seat_availability(self, db_session):
        """Test filtering flights by seat class availability."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=5,
                business_seats_available=0,
                galaxium_seats_available=0
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1100000,
                economy_seats_available=0,
                business_seats_available=3,
                galaxium_seats_available=0
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test economy seats
        results = flight.list_flights(db_session, has_economy=True)
        assert len(results) == 2
        assert all(r.economy_seats_available > 0 for r in results)

        # Test business seats
        results = flight.list_flights(db_session, has_business=True)
        assert len(results) == 2
        assert all(r.business_seats_available > 0 for r in results)

        # Test galaxium seats
        results = flight.list_flights(db_session, has_galaxium=True)
        assert len(results) == 1
        assert all(r.galaxium_seats_available > 0 for r in results)

        # Test multiple seat classes
        results = flight.list_flights(db_session, has_economy=True, has_business=True)
        assert len(results) == 1
        assert results[0].economy_seats_available > 0
        assert results[0].business_seats_available > 0

    def test_sort_by_price(self, db_session):
        """Test sorting flights by price."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Moon",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=500000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test ascending
        results = flight.list_flights(db_session, sort="price", order="asc")
        prices = [r.base_price for r in results]
        assert prices == sorted(prices)
        assert prices[0] == 500000

        # Test descending
        results = flight.list_flights(db_session, sort="price", order="desc")
        prices = [r.base_price for r in results]
        assert prices == sorted(prices, reverse=True)
        assert prices[0] == 2000000

    def test_sort_by_departure_time(self, db_session):
        """Test sorting flights by departure time."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-15 09:00",
                arrival_time="2026-03-15 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-01 10:00",
                arrival_time="2026-03-01 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-30 11:00",
                arrival_time="2026-03-30 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test ascending
        results = flight.list_flights(db_session, sort="departure_time", order="asc")
        times = [r.departure_time for r in results]
        assert times == sorted(times)

        # Test descending
        results = flight.list_flights(db_session, sort="departure_time", order="desc")
        times = [r.departure_time for r in results]
        assert times == sorted(times, reverse=True)

    def test_sort_by_duration(self, db_session):
        """Test sorting flights by duration."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",  # 8 hours
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Moon",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 14:00",  # 4 hours
                base_price=500000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-04 11:00",  # 24 hours
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test ascending
        results = flight.list_flights(db_session, sort="duration", order="asc")
        assert results[0].destination == "Moon"  # Shortest
        assert results[2].destination == "Jupiter"  # Longest

        # Test descending
        results = flight.list_flights(db_session, sort="duration", order="desc")
        assert results[0].destination == "Jupiter"  # Longest
        assert results[2].destination == "Moon"  # Shortest

    def test_combined_filters(self, db_session):
        """Test combining multiple filters."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-15 10:00",
                arrival_time="2026-03-15 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=0,
                galaxium_seats_available=0
            ),
            Flight(
                origin="Moon",
                destination="Mars",
                departure_time="2026-03-20 11:00",
                arrival_time="2026-03-20 19:00",
                base_price=800000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Combine origin, destination, date range, and seat availability
        results = flight.list_flights(
            db_session,
            origin="Earth",
            destination="Mars",
            departure_date_from="2026-03-01",
            departure_date_to="2026-03-10",
            has_business=True
        )
        assert len(results) == 1
        assert results[0].origin == "Earth"
        assert results[0].destination == "Mars"
        assert results[0].business_seats_available > 0

    def test_no_filters_returns_all(self, db_session):
        """Test that no filters returns all flights."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Moon",
                destination="Venus",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        results = flight.list_flights(db_session)
        assert len(results) == 2

    def test_filters_return_empty_when_no_match(self, db_session):
        """Test that filters return empty list when no flights match."""
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2026-03-01 09:00",
            arrival_time="2026-03-01 17:00",
            base_price=1000000,
            economy_seats_available=6,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        results = flight.list_flights(db_session, origin="Pluto")
        assert len(results) == 0

        results = flight.list_flights(db_session, min_price=10000000)
        assert len(results) == 0


# ============================================================
# Adversarial Sprint 3 — additional service-layer tests
# Added by full-system audit: cover seat-class price multipliers,
# seat counter isolation per class, double-booking guard, and
# the /internal/bookings/from-hold contract boundary.
# ============================================================


class TestBookingServiceSeatClasses:
    """Seat-class price multipliers and counter isolation."""

    def _make_user_and_flight(self, db_session):
        db_session.add(User(name="Traveler", email="t@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-06-01 10:00",
            arrival_time="2099-06-08 14:00",
            base_price=10000,
            economy_seats_available=2,
            business_seats_available=2,
            galaxium_seats_available=2,
        ))
        db_session.commit()
        u = db_session.query(User).first()
        f = db_session.query(Flight).first()
        return u, f

    def test_economy_price_multiplier(self, db_session):
        """Economy price = base_price × 1.0."""
        u, f = self._make_user_and_flight(db_session)
        result = booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "economy")
        assert result.price_paid == 10000  # 10000 × 1.0

    def test_business_price_multiplier(self, db_session):
        """Business price = base_price × 2.5."""
        u, f = self._make_user_and_flight(db_session)
        result = booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "business")
        assert result.price_paid == 25000  # 10000 × 2.5

    def test_galaxium_price_multiplier(self, db_session):
        """Galaxium price = base_price × 5.0."""
        u, f = self._make_user_and_flight(db_session)
        result = booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "galaxium")
        assert result.price_paid == 50000  # 10000 × 5.0

    def test_economy_seat_counter_decremented_not_others(self, db_session):
        """Booking economy decrements only economy counter."""
        u, f = self._make_user_and_flight(db_session)
        booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "economy")
        db_session.refresh(f)
        assert f.economy_seats_available == 1
        assert f.business_seats_available == 2
        assert f.galaxium_seats_available == 2

    def test_business_seat_counter_decremented_not_others(self, db_session):
        """Booking business decrements only business counter."""
        u, f = self._make_user_and_flight(db_session)
        booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "business")
        db_session.refresh(f)
        assert f.economy_seats_available == 2
        assert f.business_seats_available == 1
        assert f.galaxium_seats_available == 2

    def test_galaxium_seat_counter_decremented_not_others(self, db_session):
        """Booking galaxium decrements only galaxium counter."""
        u, f = self._make_user_and_flight(db_session)
        booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "galaxium")
        db_session.refresh(f)
        assert f.economy_seats_available == 2
        assert f.business_seats_available == 2
        assert f.galaxium_seats_available == 1

    def test_second_booking_same_class_exhausts_remaining(self, db_session):
        """With only 1 seat remaining, a second booking fails cleanly."""
        db_session.add(User(name="A", email="a@example.com"))
        db_session.add(User(name="B", email="b@example.com"))
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=5000,
            economy_seats_available=1,
            business_seats_available=0,
            galaxium_seats_available=0,
        ))
        db_session.commit()
        ua = db_session.query(User).filter_by(name="A").first()
        ub = db_session.query(User).filter_by(name="B").first()
        fl = db_session.query(Flight).first()

        r1 = booking.book_flight(db_session, ua.user_id, "A", fl.flight_id, "economy")
        assert r1.status == "booked"

        r2 = booking.book_flight(db_session, ub.user_id, "B", fl.flight_id, "economy")
        assert isinstance(r2, ErrorResponse)
        assert r2.error_code == "NO_SEATS_AVAILABLE"

    def test_no_galaxium_seats_returns_error(self, db_session):
        """Booking galaxium when 0 available returns NO_SEATS_AVAILABLE for that class."""
        u, f = self._make_user_and_flight(db_session)
        # Exhaust all galaxium
        booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "galaxium")
        booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "galaxium")
        # Third booking should fail
        result = booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "galaxium")
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NO_SEATS_AVAILABLE"

    def test_invalid_seat_class_returns_error(self, db_session):
        """Booking with an invalid seat class returns INVALID_SEAT_CLASS."""
        u, f = self._make_user_and_flight(db_session)
        result = booking.book_flight(db_session, u.user_id, "Traveler", f.flight_id, "first_class")  # type: ignore[arg-type]
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "INVALID_SEAT_CLASS"


class TestCancelBookingSeatRestore:
    """Cancellation must restore the correct seat-class counter."""

    def _setup(self, db_session, seat_class, seats):
        db_session.add(User(name="Traveler", email="t@example.com"))
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=5000,
            economy_seats_available=seats[0],
            business_seats_available=seats[1],
            galaxium_seats_available=seats[2],
        ))
        db_session.commit()
        u = db_session.query(User).first()
        f = db_session.query(Flight).first()
        db_session.add(Booking(
            user_id=u.user_id,
            flight_id=f.flight_id,
            status="booked",
            booking_time="2099-01-01 10:00",
            seat_class=seat_class,
            price_paid=5000,
        ))
        db_session.commit()
        b = db_session.query(Booking).first()
        return u, f, b

    def test_cancel_economy_restores_economy_seat(self, db_session):
        u, f, b = self._setup(db_session, "economy", (0, 3, 1))
        booking.cancel_booking(db_session, b.booking_id)
        db_session.refresh(f)
        assert f.economy_seats_available == 1
        assert f.business_seats_available == 3
        assert f.galaxium_seats_available == 1

    def test_cancel_business_restores_business_seat(self, db_session):
        u, f, b = self._setup(db_session, "business", (3, 0, 1))
        booking.cancel_booking(db_session, b.booking_id)
        db_session.refresh(f)
        assert f.economy_seats_available == 3
        assert f.business_seats_available == 1
        assert f.galaxium_seats_available == 1

    def test_cancel_galaxium_restores_galaxium_seat(self, db_session):
        u, f, b = self._setup(db_session, "galaxium", (3, 2, 0))
        booking.cancel_booking(db_session, b.booking_id)
        db_session.refresh(f)
        assert f.economy_seats_available == 3
        assert f.business_seats_available == 2
        assert f.galaxium_seats_available == 1


class TestFromHoldEndpointContract:
    """
    Tests for the /internal/bookings/from-hold Python service endpoint.
    This is the contract boundary Java calls after confirming a hold.
    We test via the service layer directly since the REST TestClient
    is blocked by the upstream fastapi-mcp compatibility issue.
    """

    def _setup(self, db_session):
        db_session.add(User(name="Hold Traveler", email="ht@example.com"))
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=8000,
            economy_seats_available=3,
            business_seats_available=3,
            galaxium_seats_available=3,
        ))
        db_session.commit()
        u = db_session.query(User).first()
        f = db_session.query(Flight).first()
        return u, f

    def test_from_hold_economy_creates_booking(self, db_session):
        """Hold confirmation with economy class creates a booking and decrements economy."""
        u, f = self._setup(db_session)
        hold_data = {
            "travelerId": u.user_id,
            "travelerName": "Hold Traveler",
            "flightId": f.flight_id,
            "seatClass": "economy",
        }
        result = booking.book_flight(
            db_session,
            user_id=hold_data["travelerId"],
            name=hold_data["travelerName"],
            flight_id=hold_data["flightId"],
            seat_class=hold_data["seatClass"],
        )
        assert result.status == "booked"
        assert result.seat_class == "economy"
        assert result.price_paid == 8000  # 8000 × 1.0
        db_session.refresh(f)
        assert f.economy_seats_available == 2

    def test_from_hold_galaxium_creates_booking(self, db_session):
        """Hold confirmation with galaxium class creates a booking and decrements galaxium."""
        u, f = self._setup(db_session)
        hold_data = {
            "travelerId": u.user_id,
            "travelerName": "Hold Traveler",
            "flightId": f.flight_id,
            "seatClass": "galaxium",
        }
        result = booking.book_flight(
            db_session,
            user_id=hold_data["travelerId"],
            name=hold_data["travelerName"],
            flight_id=hold_data["flightId"],
            seat_class=hold_data["seatClass"],
        )
        assert result.status == "booked"
        assert result.price_paid == 40000  # 8000 × 5.0

    def test_from_hold_name_mismatch_fails(self, db_session):
        """If the Java service sends wrong travelerName, booking fails with NAME_MISMATCH."""
        u, f = self._setup(db_session)
        result = booking.book_flight(
            db_session,
            user_id=u.user_id,
            name="Wrong Name",
            flight_id=f.flight_id,
            seat_class="economy",
        )
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NAME_MISMATCH"

    def test_from_hold_unknown_user_fails(self, db_session):
        """If the Java service sends unknown travelerId, booking fails with USER_NOT_FOUND."""
        u, f = self._setup(db_session)
        result = booking.book_flight(
            db_session,
            user_id=99999,
            name="Nobody",
            flight_id=f.flight_id,
            seat_class="economy",
        )
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "USER_NOT_FOUND"

    def test_from_hold_unknown_flight_fails(self, db_session):
        """If the Java service sends unknown flightId, booking fails with FLIGHT_NOT_FOUND."""
        u, f = self._setup(db_session)
        result = booking.book_flight(
            db_session,
            user_id=u.user_id,
            name="Hold Traveler",
            flight_id=99999,
            seat_class="economy",
        )
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "FLIGHT_NOT_FOUND"

    def test_from_hold_no_seats_fails(self, db_session):
        """If all seats of the class are gone before hold confirms, fails gracefully."""
        db_session.add(User(name="Hold Traveler", email="ht@example.com"))
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=8000,
            economy_seats_available=0,
            business_seats_available=0,
            galaxium_seats_available=0,
        ))
        db_session.commit()
        u = db_session.query(User).first()
        f = db_session.query(Flight).first()
        result = booking.book_flight(db_session, u.user_id, "Hold Traveler", f.flight_id, "galaxium")
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NO_SEATS_AVAILABLE"

    def test_externalBookingReference_is_numeric_string(self, db_session):
        """
        Verify that the Java service stores booking_id as the external reference.
        The Python API returns an integer booking_id; HoldService stores String.valueOf(bookingId).
        The frontend must handle a numeric string like "42" as the booking reference.
        """
        u, f = self._setup(db_session)
        result = booking.book_flight(
            db_session,
            user_id=u.user_id,
            name="Hold Traveler",
            flight_id=f.flight_id,
            seat_class="economy",
        )
        # Simulate what HoldService.java does: String.valueOf(booking.getBookingId())
        # This produces a numeric string, not a GX- prefixed reference.
        external_ref = str(result.booking_id)
        # Must be a non-empty numeric string that the frontend can display and copy
        assert external_ref.isdigit()
        assert len(external_ref) > 0
        # safeReference() on a numeric string should be unchanged (all digits allowed)
        import re
        safe = re.sub(r'[^a-zA-Z0-9_-]', '-', external_ref)
        assert safe == external_ref  # No substitution needed
