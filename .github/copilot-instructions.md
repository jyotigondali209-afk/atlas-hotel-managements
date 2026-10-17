# Atlas Smart Hotel

- Frontend: React, Vite, Recharts, lucide-react. Run `npm run dev` and `npm run build` from the workspace root.
- API: FastAPI and SQLAlchemy in `backend/main.py`. Run the API from `backend` with `uvicorn main:app --reload`.
- The default local database is SQLite. Demo seed values must remain clearly identified as illustrative; never present them as live hotel data.
- Keep booking date/availability validation on the API. Dynamic prices must respect room minimum, maximum, and cost-floor constraints.
- Forecast evaluation must use chronological holdout data and report a baseline alongside model metrics.