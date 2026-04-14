# CSM Dashboard - Customer Success Management

A modern web application for Customer Success Managers to track account health, renewals, and engagement signals.

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI + Python 3.10+
- **Data**: Databricks SQL (Unity Catalog)
- **Deployment**: Databricks Apps

## Project Structure

```
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── models/         # Pydantic schemas
│   │   ├── services/       # Databricks connector
│   │   ├── config.py       # Settings
│   │   └── main.py         # FastAPI app
│   ├── requirements.txt
│   └── app.yaml            # Databricks Apps config
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # React Query hooks
│   │   └── services/       # API client
│   └── package.json
└── README.md
```

## Local Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+ LTS
- npm or pnpm

### Backend Setup

1. Create and activate virtual environment:
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure your Databricks connection in `.env`:
```env
DATABRICKS_HOST=your-workspace.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/your-warehouse-id
DATABRICKS_TOKEN=dapi_your_personal_access_token
ENVIRONMENT=development
```

5. Run the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at http://localhost:8000
- API docs: http://localhost:8000/api/docs
- Health check: http://localhost:8000/api/health

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Run the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

### Running Both Together

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd backend
.venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The Vite dev server automatically proxies `/api/*` requests to the backend.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/metrics/summary` | Dashboard KPIs |
| GET | `/api/accounts` | List accounts (paginated, filterable) |
| GET | `/api/accounts/{id}` | Account details |
| PATCH | `/api/accounts/{id}/status` | Update account status |
| POST | `/api/tasks` | Create a task |

## Deploying to Databricks Apps

**Git push does not deploy the app.** You must build and deploy separately. See **`DEPLOYMENT.md`** for the full UI path.

**Quick path (Databricks CLI installed and `databricks auth login` done):**

```bash
cd frontend
npm run deploy:databricks
```

That runs `build:prod`, syncs `backend/` to the workspace bundle path, and deploys app **`iona-cx`**.

### Configure the app (Databricks)

- **`DATABRICKS_HOST`** is provided by Databricks Apps at runtime.
- Attach the **SQL warehouse** resource to the app (see `backend/app.yaml` / bundle config).

The app uses service principal authentication when running in Databricks Apps.

## Development Notes

### Mock Data

When running locally without a Databricks connection, the backend returns mock data that matches the dashboard mockup. This allows frontend development without a live database.

### Adding New Tables

To connect to your actual Databricks tables:

1. Update the queries in `backend/app/services/databricks.py`
2. Modify the Pydantic schemas in `backend/app/models/schemas.py` if needed
3. Update the mock data to match your schema for local testing

## License

Private - Internal Use Only
