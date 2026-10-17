from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main


@pytest.fixture
def client(monkeypatch):
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_sessions = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(main, "engine", test_engine)
    monkeypatch.setattr(main, "SessionLocal", test_sessions)
    with TestClient(main.app) as test_client:
        yield test_client
    test_engine.dispose()


def test_dashboard_uses_seeded_database(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "database"
    assert data["metrics"]["occupancy"] >= 0
    assert data["recentBookings"]


def test_booking_dates_and_room_capacity_are_enforced(client):
    today = date.today()
    invalid = client.post("/api/bookings", json={
        "guest_name": "Test Guest",
        "room_type": "Standard Twin",
        "check_in": (today + timedelta(days=3)).isoformat(),
        "check_out": (today + timedelta(days=2)).isoformat(),
        "guests": 2,
    })
    assert invalid.status_code == 422

    check_in = today + timedelta(days=20)
    check_out = check_in + timedelta(days=2)
    payload = {
        "guest_name": "Test Guest",
        "room_type": "Standard Twin",
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": 2,
    }
    created = [client.post("/api/bookings", json={**payload, "guest_name": f"Test Guest {index}"}) for index in range(8)]
    assert all(response.status_code == 201 for response in created)
    assert created[0].json()["total_price"] > 0
    availability = client.get("/api/availability", params={"check_in": check_in.isoformat(), "check_out": check_out.isoformat()}).json()
    standard = next(item for item in availability["items"] if item["room_type"] == "Standard Twin")
    assert standard["available_rooms"] == 0
    conflict = client.post("/api/bookings", json={**payload, "guest_name": "Ninth Guest"})
    assert conflict.status_code == 409


def test_price_approval_is_persisted_and_bounded(client):
    recommendations = client.get("/api/pricing").json()
    assert recommendations
    recommendation = recommendations[0]
    decision = client.patch(f"/api/pricing/{recommendation['id']}", json={"status": "Approved"})
    assert decision.status_code == 200
    assert decision.json()["status"] == "Approved"
    updated = next(item for item in client.get("/api/pricing").json() if item["id"] == recommendation["id"])
    assert updated["current"] == updated["recommended"]
    stay_date = date.today() + timedelta(days=2)
    check_out = stay_date + timedelta(days=1)
    quote = client.get("/api/availability", params={"check_in": stay_date.isoformat(), "check_out": check_out.isoformat()}).json()
    room_quote = next(item for item in quote["items"] if item["room_type"] == recommendation["room"])
    assert room_quote["nightly_price"] == recommendation["recommended"]
    booking = client.post("/api/bookings", json={
        "guest_name": "Approved Rate Guest",
        "room_type": recommendation["room"],
        "check_in": stay_date.isoformat(),
        "check_out": check_out.isoformat(),
        "guests": 2,
    })
    assert booking.status_code == 201
    assert booking.json()["total_price"] == recommendation["recommended"]


def test_expenses_are_persisted_and_reported(client):
    created = client.post("/api/expenses", json={"category": "Repairs", "amount": 1250, "description": "Tap replacement"})
    assert created.status_code == 201
    report = client.get("/api/expenses").json()
    repairs = next(item for item in report["items"] if item["category"] == "Repairs")
    assert repairs["amount"] == 1250