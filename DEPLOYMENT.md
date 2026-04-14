# IONA CX - Databricks Apps Deployment Guide

## Not automatic

**Pushing to GitHub does not update the Databricks app.** There is no CI hook in this repo that builds or deploys for you. After you merge or pull code, you must:

1. **Build** the frontend into `backend/static/` (`npm run build:prod` from `frontend/`).
2. **Deploy** that folder to Databricks (CLI sync + app deploy, or manual upload + Deploy in the UI).

Until you do both, the live app keeps the **previous** deployment (e.g. “last deployment 6 hours ago”).

**One command (from `frontend/`, Databricks CLI logged in):** `npm run deploy:databricks`

---

## Deployment Files Ready

The app is ready for deployment with the following structure:

```
backend/
├── app/                    # FastAPI application
│   ├── api/               # API endpoints
│   ├── models/            # Pydantic schemas
│   ├── services/          # Business logic
│   ├── config.py          # Configuration
│   └── main.py            # App entry point
├── static/                # Built React frontend
│   ├── assets/
│   └── index.html
├── app.yaml               # Databricks Apps config
└── requirements.txt       # Python dependencies
```

## Deploy via Databricks CLI (recommended when CLI works)

From repo root, after `databricks auth login` and profile pointing at the right workspace:

```bash
cd frontend
npm run build:prod
cd ../backend
databricks bundle sync -t prod --full
databricks apps deploy iona-cx --source-code-path "/Workspace/Users/misagh.jebeli@ifs.com/.bundle/iona_cx_bundle/prod/files"
```

- **`bundle sync`** uploads `backend/` (including `static/`) to the bundle path in the workspace.
- **`apps deploy`** creates a new deployment for app **`iona-cx`** from that path.

`databricks bundle deploy` may fail if Terraform cannot reach `registry.terraform.io`; **`bundle sync` + `apps deploy`** still updates the running app.

---

## Deploy via Databricks UI

If the Databricks CLI is blocked by policy, use the UI instead:

### Step 1: Upload Files to Workspace

1. Go to your Databricks workspace: https://dbc-97a2feb3-3e52.cloud.databricks.com
2. Click **Workspace** in the sidebar
3. Navigate to `/Users/misagh.jebeli@ifs.com/`
4. Click **Create** → **Folder** → Name it `iona-cx`
5. Open the `iona-cx` folder
6. Click **Import** (or drag and drop) to upload these files/folders from `c:\navigate\backend\`:
   - `app/` folder (the entire folder)
   - `static/` folder (the entire folder)
   - `app.yaml`
   - `requirements.txt`

### Step 2: Create the App

1. Click **Compute** in the sidebar
2. Go to the **Apps** tab
3. Click **Create App**
4. Enter app name: `iona-cx`
5. Click **Create**

### Step 3: Deploy the App

1. In the Apps page, click on your app `iona-cx`
2. Click **Deploy**
3. Select the folder: `/Workspace/Users/misagh.jebeli@ifs.com/iona-cx`
4. Click **Select**, then **Deploy**
5. Wait for the deployment to complete (usually 2-5 minutes)

### Step 4: Access Your App

Once deployed, click the app URL to access IONA CX!

## Configuration

The app is configured to connect to:
- **Host**: dbc-97a2feb3-3e52.cloud.databricks.com
- **SQL Warehouse**: /sql/1.0/warehouses/e0f7c35bbfc5d9cd

Authentication is handled automatically by Databricks Apps using the app's service principal.

## Troubleshooting

- **App fails to start**: Check the Logs tab in the app details page
- **Database connection issues**: Verify the SQL warehouse is running
- **Frontend not loading**: Make sure the `static/` folder was uploaded correctly

## Updating the App

To update after making changes:

**CLI:** `cd frontend && npm run deploy:databricks` (or the four commands in the CLI section above).

**UI:**  
1. `cd frontend && npm run build:prod` (writes to `../backend/static/`).  
2. Re-upload `backend/app/`, `backend/static/`, `backend/app.yaml`, `backend/requirements.txt` (and `backend/databricks.yml` if you use bundle sync from elsewhere).  
3. **Compute → Apps → iona-cx → Deploy** and select the workspace folder you updated.
