# ATLAS SMART HOTEL

An academic hotel operations prototype for reservations, revenue monitoring, demand forecasting, dynamic rate recommendations and operating-cost visibility. The interface is a responsive React application; the API is FastAPI with SQLAlchemy and a local SQLite database by default.

**Demo data notice:** The initial rooms, bookings, expenses, sample forecast and bundled CSV are synthetic demonstration data. They are not records or forecasts from a real Atlas property. The dashboard labels its fallback as demo data; the API-created SQLite records are also seeded examples until replaced with real operating data.

## Features

- Operations dashboard with room revenue, occupancy, ADR, operating profit, room-night mix and recent reservations.
- Image-led guest property site with room discovery, date/guest availability search and a handoff to reservation creation.
- Reservation entry, search, CSV export, date validation and room/date overlap checks.
- Explainable demand-based price recommendations using forward occupancy, weekend and seasonal adjustments, bounded by room minimum, maximum and cost floor; decisions are persisted to pricing history.
- Expense categories with month-to-date totals and cost-share reporting.
- Seven-day booking forecast with a baseline fallback. A trained Random Forest artifact is used only when it exists and the database contains sufficient recent history.
- Chronological 80/20 model evaluation against a training-mean baseline, with MAE and RMSE reported.

## Requirements

- Node.js 20.19+ or 22.12+ for the Vite 8 frontend.
- Python 3.10+ (the supplied requirements support modern Python releases).
- SQLite is included with Python. PostgreSQL can be selected through `DATABASE_URL` after installing the optional PostgreSQL driver.

## Run Locally on Windows

Open two PowerShell terminals at the workspace root.

1. Install the Python environment and backend dependencies:

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

2. Start the API in the first terminal:

```powershell
Set-Location backend
uvicorn main:app --reload
```

The API starts at `http://127.0.0.1:8000`; interactive API docs are at `/docs`. On first start, SQLAlchemy creates the schema and inserts demonstration rooms, bookings, expenses and price recommendations. The default SQLite file is `backend/atlas_demo.db`.

3. Start the React application in the second terminal:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The frontend calls `http://localhost:8000/api` by default. To use another API URL, set `VITE_API_BASE` in a root `.env.local` file.

## PostgreSQL

Set `DATABASE_URL` before starting Uvicorn. Example format:

```text
postgresql+psycopg://username:password@localhost:5432/atlas_hotel
```

Install the `psycopg[binary]` package from `backend/requirements.txt` before using PostgreSQL. `backend/.env.example` documents the supported environment variables. The current demo uses SQLAlchemy `create_all`; a production deployment should add Alembic migrations, managed secrets and a configured database backup policy.

## Machine Learning

The bundled `backend/ml/sample_daily_bookings.csv` is synthetic. From the `backend` directory, train and evaluate the model with:

```powershell
python ml\train_model.py
```

The script sorts daily observations chronologically, reserves the latest 20% for testing, compares a Random Forest regressor with a training-mean baseline, and reports MAE and RMSE. Supply genuine daily hotel data with `date,bookings` columns to train a useful operational model:

```powershell
python ml\train_model.py --data path\to\daily_bookings.csv --model ml\model.joblib
```

The artifact is ignored by Git. The API uses it after at least 30 bookings exist in the preceding 60 days; otherwise `/api/forecast` returns the labeled baseline. A model that beats the baseline on the bundled synthetic sample does not establish real-world predictive value.

## API Overview

- `GET /api/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=2`
- `POST /api/expenses`

Booking request example:

```json
{
  "guest_name": "Aditi Rao",
  "room_type": "Deluxe King",
  "check_in": "2026-11-12",
  "check_out": "2026-11-14",
  "guests": 2
}
```

## Tests and Build

```powershell
npm run build
npm run lint
Set-Location backend
python -m pytest
```

## Scope and Limitations

This is a functional academic prototype, not a production hotel platform. It has an administrator-focused operations workspace and a guest-facing property/availability flow, but does not implement guest/receptionist login, password storage, JWT authorization, cancellation/check-in workflows, invoices, restaurant orders, or Alembic migrations. Those require authentication/authorization and operational policy decisions before deployment. Revenue and room contribution are separate concepts; operating profit here is room revenue less recorded operating expenses and excludes taxes, interest and depreciation. The bundled forecast/pricing examples are demonstrations, not business advice.