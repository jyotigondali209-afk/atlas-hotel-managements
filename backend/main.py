from __future__ import annotations

import math
import os
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import Date, Float, ForeignKey, Integer, String, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'atlas_demo.db'}")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    room_type: Mapped[str] = mapped_column(String(40), index=True)
    base_price: Mapped[float] = mapped_column(Float)
    min_price: Mapped[float] = mapped_column(Float)
    max_price: Mapped[float] = mapped_column(Float)
    cost_floor: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="available")


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    guest_name: Mapped[str] = mapped_column(String(120))
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), index=True)
    check_in: Mapped[date] = mapped_column(Date, index=True)
    check_out: Mapped[date] = mapped_column(Date, index=True)
    guests: Mapped[int] = mapped_column(Integer, default=1)
    total_price: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="Confirmed")
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(primary_key=True)
    expense_date: Mapped[date] = mapped_column(Date, index=True)
    category: Mapped[str] = mapped_column(String(60), index=True)
    amount: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(String(240), default="")


class PricingHistory(Base):
    __tablename__ = "pricing_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_type: Mapped[str] = mapped_column(String(40), index=True)
    stay_date: Mapped[date] = mapped_column(Date, index=True)
    base_price: Mapped[float] = mapped_column(Float)
    current_price: Mapped[float] = mapped_column(Float)
    recommended_price: Mapped[float] = mapped_column(Float)
    occupancy: Mapped[float] = mapped_column(Float)
    demand: Mapped[str] = mapped_column(String(20))
    reason: Mapped[str] = mapped_column(String(240))
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))


class ForecastRecord(Base):
    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(primary_key=True)
    forecast_date: Mapped[date] = mapped_column(Date, index=True)
    predicted_bookings: Mapped[float] = mapped_column(Float)
    predicted_occupancy: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(60), default="baseline-v1")


class BookingRequest(BaseModel):
    guest_name: str = Field(min_length=2, max_length=120)
    room_type: str = Field(min_length=2, max_length=40)
    check_in: date
    check_out: date
    guests: int = Field(default=1, ge=1, le=6)

    @field_validator("guest_name")
    @classmethod
    def clean_guest_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Guest name cannot be blank")
        return cleaned


class PriceDecision(BaseModel):
    status: str


class ExpenseRequest(BaseModel):
    category: str = Field(min_length=2, max_length=60)
    amount: float = Field(gt=0, le=100_000_000)
    expense_date: date = Field(default_factory=date.today)
    description: str = Field(default="", max_length=240)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)
    yield


app = FastAPI(title="Atlas Smart Hotel API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_database(db: Session) -> None:
    if db.scalar(select(func.count(Room.id))) == 0:
        room_types = [
            ("Deluxe King", 8, 8700, 6100, 13900, 2600),
            ("Executive Suite", 4, 14200, 10500, 22500, 4200),
            ("Garden Room", 4, 6400, 4500, 11200, 2100),
            ("Standard Twin", 8, 5900, 4100, 9800, 1850),
        ]
        room_number = 101
        for room_type, count, price, floor, ceiling, cost in room_types:
            for _ in range(count):
                db.add(Room(number=str(room_number), room_type=room_type, base_price=price, min_price=floor, max_price=ceiling, cost_floor=cost))
                room_number += 1
    db.flush()

    if db.scalar(select(func.count(Booking.id))) == 0:
        rooms = list(db.scalars(select(Room).order_by(Room.id)))
        today = date.today()
        examples = [
            ("Ananya Mehta", "Executive Suite", -2, 1, 28600),
            ("Oliver Chen", "Deluxe King", -1, 1, 17400),
            ("Priya Sharma", "Garden Room", 0, 3, 19200),
            ("Marcus Williams", "Deluxe King", 1, 3, 21300),
            ("Zoya Khan", "Standard Twin", -7, -4, 17700),
            ("Kabir Malhotra", "Executive Suite", -10, -7, 42600),
            ("Isabella Costa", "Garden Room", -13, -10, 19200),
            ("Arjun Iyer", "Deluxe King", -15, -12, 26100),
            ("Maya Patel", "Standard Twin", -18, -15, 17700),
            ("Noah Kim", "Deluxe King", -21, -18, 26100),
            ("Diya Verma", "Executive Suite", -23, -20, 42600),
            ("Ethan Brooks", "Garden Room", -25, -22, 19200),
        ]
        used: set[int] = set()
        for index, (guest, room_type, start_offset, end_offset, total) in enumerate(examples):
            room = next((candidate for candidate in rooms if candidate.room_type == room_type and candidate.id not in used), None)
            if room is None:
                continue
            used.add(room.id)
            db.add(Booking(guest_name=guest, room_id=room.id, check_in=today + timedelta(days=start_offset), check_out=today + timedelta(days=end_offset), guests=2, total_price=total, status="Confirmed" if end_offset >= 0 else "Checked out"))

    if db.scalar(select(func.count(Expense.id))) == 0:
        today = date.today()
        samples = [("Staff & payroll", 284000), ("Food & beverage", 176000), ("Utilities", 142000), ("Housekeeping", 88000), ("Maintenance", 51000)]
        for category, amount in samples:
            db.add(Expense(expense_date=today.replace(day=1), category=category, amount=amount, description="Seeded demonstration expense"))

    if db.scalar(select(func.count(PricingHistory.id))) == 0:
        today = date.today()
        upcoming = today + timedelta(days=2)
        for room_type, base, current, recommended, occupancy, demand, reason in [
            ("Executive Suite", 14200, 14900, 16800, 91, "Very high", "Weekend demand is 28% above the 30-day average."),
            ("Deluxe King", 8700, 8700, 9400, 84, "High", "Occupancy is nearing the configured 85% threshold."),
            ("Garden Room", 6400, 6900, 6100, 42, "Low", "Midweek pickup is soft; a small reduction may improve conversion."),
        ]:
            db.add(PricingHistory(room_type=room_type, stay_date=upcoming, base_price=base, current_price=current, recommended_price=recommended, occupancy=occupancy, demand=demand, reason=reason))

    db.commit()


def booking_payload(db: Session, booking: Booking) -> dict:
    room = db.get(Room, booking.room_id)
    return {
        "id": booking.id,
        "guest": booking.guest_name,
        "guest_name": booking.guest_name,
        "initials": "".join(part[0] for part in booking.guest_name.split()[:2]).upper(),
        "room": f"{room.room_type} · {room.number}" if room else "Room",
        "room_type": room.room_type if room else "Unknown",
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "dates": f"{booking.check_in.strftime('%b %d')} – {booking.check_out.strftime('%b %d')}",
        "guests": booking.guests,
        "total_price": booking.total_price,
        "amount": booking.total_price,
        "status": booking.status,
    }


def make_dashboard(db: Session) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    rooms = list(db.scalars(select(Room)))
    bookings = list(db.scalars(select(Booking).where(Booking.check_out > month_start, Booking.check_in <= today)))
    expenses = list(db.scalars(select(Expense).where(Expense.expense_date >= month_start, Expense.expense_date <= today)))
    room_nights = sum(max(0, (min(booking.check_out, today + timedelta(days=1)) - max(booking.check_in, month_start)).days) for booking in bookings)
    expense_total = sum(item.amount for item in expenses)
    active_room_ids = {booking.room_id for booking in bookings if booking.check_in <= today < booking.check_out and booking.status in {"Confirmed", "Checked in"}}
    occupancy = round(len(active_room_ids) / max(1, len(rooms)) * 100, 1)

    day_revenue: dict[date, float] = {}
    room_type_nights: dict[str, int] = {}
    for booking in bookings:
        nights = max(1, (booking.check_out - booking.check_in).days)
        per_night = booking.total_price / nights
        room = db.get(Room, booking.room_id)
        if room:
            start = max(booking.check_in, month_start)
            end = min(booking.check_out, today + timedelta(days=1))
            elapsed_nights = max(0, (end - start).days)
            room_type_nights[room.room_type] = room_type_nights.get(room.room_type, 0) + elapsed_nights
        for offset in range(nights):
            booking_day = booking.check_in + timedelta(days=offset)
            if month_start <= booking_day <= today:
                day_revenue[booking_day] = day_revenue.get(booking_day, 0) + per_night
    revenue = round(sum(day_revenue.values()))
    adr = round(revenue / max(1, room_nights), 2)
    operating_profit = revenue - expense_total

    revenue_trend = []
    for day_number in range(1, today.day + 1):
        current_day = month_start + timedelta(days=day_number - 1)
        amount = round(day_revenue.get(current_day, 0))
        revenue_trend.append({"day": f"{day_number:02d}", "revenue": amount})

    total_room_nights = max(1, sum(room_type_nights.values()))
    room_mix = [{"name": name.replace(" King", "").replace(" Twin", ""), "value": round(count / total_room_nights * 100)} for name, count in room_type_nights.items()]
    recent = list(db.scalars(select(Booking).order_by(Booking.created_at.desc()).limit(8)))
    return {
        "source": "database",
        "metrics": {"revenue": round(revenue), "revenueChange": None, "occupancy": occupancy, "occupancyChange": None, "adr": round(adr), "adrChange": None, "operatingProfit": round(operating_profit), "profitChange": None, "expenses": round(expense_total), "revpar": round(revenue / max(1, len(rooms) * today.day))},
        "revenueTrend": revenue_trend,
        "roomMix": room_mix,
        "recentBookings": [booking_payload(db, booking) for booking in recent],
    }


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.scalar(select(func.count(Room.id)))
    return {"status": "ok", "database": "connected", "source": "database"}


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)) -> dict:
    return make_dashboard(db)


@app.get("/api/bookings")
def list_bookings(
    search: str = Query(default="", max_length=120),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    query = select(Booking).order_by(Booking.check_in.desc()).offset(offset).limit(limit)
    if search:
        query = query.where(Booking.guest_name.ilike(f"%{search}%"))
    records = list(db.scalars(query))
    return {"items": [booking_payload(db, record) for record in records], "limit": limit, "offset": offset}


@app.get("/api/availability")
def room_availability(
    check_in: date,
    check_out: date,
    guests: int = Query(default=1, ge=1, le=6),
    db: Session = Depends(get_db),
) -> dict:
    if check_in < date.today() or check_out <= check_in:
        raise HTTPException(status_code=422, detail="Select valid future check-in and check-out dates")
    room_types = list(db.scalars(select(Room.room_type).distinct().order_by(Room.room_type)))
    items = []
    nights = (check_out - check_in).days
    for room_type in room_types:
        rooms = list(db.scalars(select(Room).where(Room.room_type == room_type, Room.status == "available")))
        free_rooms = 0
        for room in rooms:
            overlap = db.scalar(select(func.count(Booking.id)).where(
                Booking.room_id == room.id,
                Booking.status.in_(["Confirmed", "Checked in"]),
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            ))
            if not overlap:
                free_rooms += 1
        if not rooms:
            continue
        occupancy = round((len(rooms) - free_rooms) / len(rooms) * 100)
        weekend = check_in.weekday() >= 4
        adjustment = (0.15 if occupancy >= 85 else 0.08 if occupancy >= 70 else -0.04 if occupancy < 35 else 0)
        adjustment += 0.07 if weekend else 0
        adjustment += 0.04 if check_in.month in {10, 11, 12, 1, 2} else 0
        room = rooms[0]
        floor = max(room.min_price, room.cost_floor)
        recommended = min(room.max_price, max(floor, round(room.base_price * (1 + adjustment) / 100) * 100))
        published_rate = db.scalar(select(PricingHistory.current_price).where(
            PricingHistory.room_type == room_type,
            PricingHistory.stay_date == check_in,
            PricingHistory.status == "Approved",
        ).order_by(PricingHistory.id.desc()))
        nightly = published_rate if published_rate is not None else room.base_price
        items.append({
            "room_type": room_type,
            "available_rooms": free_rooms,
            "base_price": room.base_price,
            "nightly_price": nightly,
            "recommended_price": recommended,
            "total_price": nightly * nights,
            "nights": nights,
            "available": free_rooms > 0,
            "guests": guests,
        })
    return {"source": "database", "check_in": check_in.isoformat(), "check_out": check_out.isoformat(), "items": items}


@app.post("/api/bookings", status_code=201)
def create_booking(payload: BookingRequest, db: Session = Depends(get_db)) -> dict:
    if payload.check_in < date.today():
        raise HTTPException(status_code=422, detail="Check-in must be today or later")
    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=422, detail="Check-out must be after check-in")
    room_candidates = list(db.scalars(select(Room).where(Room.room_type == payload.room_type, Room.status == "available").order_by(Room.number)))
    if not room_candidates:
        raise HTTPException(status_code=404, detail="Room type is not available")
    for room in room_candidates:
        overlaps = db.scalar(select(func.count(Booking.id)).where(
            Booking.room_id == room.id,
            Booking.status.in_(["Confirmed", "Checked in"]),
            Booking.check_in < payload.check_out,
            Booking.check_out > payload.check_in,
        ))
        if not overlaps:
            nights = (payload.check_out - payload.check_in).days
            published_rate = db.scalar(select(PricingHistory.current_price).where(
                PricingHistory.room_type == room.room_type,
                PricingHistory.stay_date == payload.check_in,
                PricingHistory.status == "Approved",
            ).order_by(PricingHistory.id.desc()))
            nightly_rate = published_rate if published_rate is not None else room.base_price
            booking = Booking(guest_name=payload.guest_name, room_id=room.id, check_in=payload.check_in, check_out=payload.check_out, guests=payload.guests, total_price=nightly_rate * nights)
            db.add(booking)
            db.commit()
            db.refresh(booking)
            return booking_payload(db, booking)
    raise HTTPException(status_code=409, detail="No rooms of this type are available for the selected dates")


@app.get("/api/pricing")
def list_pricing(db: Session = Depends(get_db)) -> list[dict]:
    target_date = date.today() + timedelta(days=2)
    room_types = list(db.scalars(select(Room.room_type).distinct().order_by(Room.room_type)))
    for room_type in room_types:
        rooms = list(db.scalars(select(Room).where(Room.room_type == room_type)))
        occupied = db.scalar(select(func.count(Booking.id)).where(
            Booking.room_id.in_([room.id for room in rooms]),
            Booking.status.in_(["Confirmed", "Checked in"]),
            Booking.check_in <= target_date,
            Booking.check_out > target_date,
        )) or 0
        occupancy = round(occupied / max(1, len(rooms)) * 100)
        demand_adjustment = 0.15 if occupancy >= 85 else 0.10 if occupancy >= 70 else -0.06 if occupancy < 35 else 0
        weekend_adjustment = 0.08 if target_date.weekday() >= 4 else 0
        seasonal_adjustment = 0.04 if target_date.month in {10, 11, 12, 1, 2} else 0
        adjustment = max(-0.10, min(0.30, demand_adjustment + weekend_adjustment + seasonal_adjustment))
        room = rooms[0]
        minimum = max(room.min_price, room.cost_floor)
        recommended = round(room.base_price * (1 + adjustment) / 100) * 100
        recommended = min(room.max_price, max(minimum, recommended))
        demand = "Very high" if occupancy >= 90 else "High" if occupancy >= 75 or weekend_adjustment else "Moderate" if occupancy >= 50 else "Low"
        reasons = []
        if weekend_adjustment:
            reasons.append("weekend demand")
        if seasonal_adjustment:
            reasons.append("seasonal travel")
        if occupancy >= 70:
            reasons.append(f"{occupancy}% booked occupancy")
        elif occupancy < 35:
            reasons.append("low forward occupancy")
        reason = f"Adjusted for {', '.join(reasons)}; constrained to the room's price and cost limits." if reasons else "Base rate retained; no significant demand signal for this date."

        existing = db.scalar(select(PricingHistory).where(
            PricingHistory.room_type == room_type,
            PricingHistory.stay_date == target_date,
        ).order_by(PricingHistory.id.desc()))
        if existing is None:
            approved = db.scalar(select(PricingHistory).where(
                PricingHistory.room_type == room_type,
                PricingHistory.status == "Approved",
            ).order_by(PricingHistory.stay_date.desc()))
            current = approved.current_price if approved else room.base_price
            existing = PricingHistory(room_type=room_type, stay_date=target_date, base_price=room.base_price, current_price=current, recommended_price=recommended, occupancy=occupancy, demand=demand, reason=reason)
            db.add(existing)
        elif existing.status == "Pending":
            existing.base_price = room.base_price
            existing.occupancy = occupancy
            existing.recommended_price = recommended
            existing.demand = demand
            existing.reason = reason
    db.commit()
    rows = list(db.scalars(select(PricingHistory).where(PricingHistory.stay_date == target_date).order_by(PricingHistory.id)))
    return [{
        "id": row.id,
        "room": row.room_type,
        "dates": row.stay_date.strftime("%b %d"),
        "base": row.base_price,
        "current": row.current_price,
        "recommended": row.recommended_price,
        "occupancy": row.occupancy,
        "demand": row.demand,
        "reason": row.reason,
        "status": row.status,
    } for row in rows]


@app.patch("/api/pricing/{recommendation_id}")
def decide_pricing(recommendation_id: int, decision: PriceDecision, db: Session = Depends(get_db)) -> dict:
    if decision.status not in {"Approved", "Rejected"}:
        raise HTTPException(status_code=422, detail="Status must be Approved or Rejected")
    recommendation = db.get(PricingHistory, recommendation_id)
    if recommendation is None:
        raise HTTPException(status_code=404, detail="Pricing recommendation not found")
    recommendation.status = decision.status
    if decision.status == "Approved":
        room = db.scalar(select(Room).where(Room.room_type == recommendation.room_type).order_by(Room.id))
        minimum = max(room.min_price, room.cost_floor) if room else 0
        if room is None or not minimum <= recommendation.recommended_price <= room.max_price:
            raise HTTPException(status_code=422, detail="Recommended price violates configured room price limits")
        recommendation.current_price = recommendation.recommended_price
    db.commit()
    return {"id": recommendation.id, "status": recommendation.status, "current": recommendation.current_price}


@app.get("/api/expenses")
def list_expenses(db: Session = Depends(get_db)) -> dict:
    today = date.today()
    start = today.replace(day=1)
    records = list(db.scalars(select(Expense).where(Expense.expense_date >= start, Expense.expense_date <= today).order_by(Expense.category)))
    totals: dict[str, float] = {}
    for record in records:
        totals[record.category] = totals.get(record.category, 0) + record.amount
    total = sum(totals.values())
    return {"total": round(total), "items": [{"category": name, "amount": round(amount), "share": round(amount / max(total, 1) * 100)} for name, amount in totals.items()]}


@app.post("/api/expenses", status_code=201)
def create_expense(payload: ExpenseRequest, db: Session = Depends(get_db)) -> dict:
    expense = Expense(expense_date=payload.expense_date, category=payload.category.strip(), amount=payload.amount, description=payload.description.strip())
    if not expense.category:
        raise HTTPException(status_code=422, detail="Expense category cannot be blank")
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return {"id": expense.id, "expense_date": expense.expense_date.isoformat(), "category": expense.category, "amount": expense.amount, "description": expense.description}


def date_features(day: date) -> list[int]:
    day_of_year = day.timetuple().tm_yday
    return [
        day.weekday(), day.day, day.month, int(day.weekday() >= 5),
        math.sin(2 * math.pi * day_of_year / 365.25),
        math.cos(2 * math.pi * day_of_year / 365.25),
    ]


@app.get("/api/forecast")
def forecast(days: int = Query(default=7, ge=1, le=30), db: Session = Depends(get_db)) -> dict:
    today = date.today()
    historical = list(db.scalars(select(Booking).where(Booking.check_in >= today - timedelta(days=60), Booking.check_in < today)))
    forecast_path = BASE_DIR / "ml" / "model.joblib"
    predictions = []
    model_name = "demo-baseline"
    if len(historical) >= 30 and forecast_path.exists():
        import joblib

        model = joblib.load(forecast_path)
        model_name = "random-forest"
        predicted = model.predict([date_features(today + timedelta(days=offset)) for offset in range(1, days + 1)])
    else:
        recent_daily = max(1, len(historical) / 60)
        predicted = [recent_daily * (1.12 if (today + timedelta(days=offset)).weekday() >= 5 else 0.88) for offset in range(1, days + 1)]
    room_count = max(1, db.scalar(select(func.count(Room.id))) or 1)
    for offset, count in enumerate(predicted, start=1):
        target = today + timedelta(days=offset)
        occupancy = min(98, max(0, round(float(count) / room_count * 100)))
        predictions.append({"date": target.isoformat(), "day": target.strftime("%a"), "bookings": round(float(count)), "occupancy": occupancy})
    return {"source": model_name, "model": model_name, "predictions": predictions}


@app.get("/api/reports/bookings.csv")
def export_bookings(db: Session = Depends(get_db)) -> Response:
    records = list(db.scalars(select(Booking).order_by(Booking.check_in)))
    rows = ["guest,room,check_in,check_out,guests,total_price,status"]
    for booking in records:
        room = db.get(Room, booking.room_id)
        values = [booking.guest_name, room.room_type if room else "", booking.check_in.isoformat(), booking.check_out.isoformat(), booking.guests, booking.total_price, booking.status]
        rows.append(",".join(f'"{str(value).replace(chr(34), chr(34) * 2)}"' for value in values))
    return Response(
        content="\n".join(rows),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=atlas-bookings.csv"},
    )
