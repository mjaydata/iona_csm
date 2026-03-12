# IONA CX - Databricks Apps Deployment Guide

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

## Deploy via Databricks UI

Since the Databricks CLI is blocked by Application Control policy, follow these steps to deploy via the UI:

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
1. Rebuild frontend: `cd frontend && npm run build`
2. Copy to backend: `cp -r dist/* ../backend/static/`
3. Re-upload changed files to Databricks workspace
4. Click **Deploy** again in the Apps page
