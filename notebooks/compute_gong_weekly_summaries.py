# Databricks notebook: compute_gong_weekly_summaries
# Generates one LLM-written Gong call summary line per account per week.
# Writes results into the gong_summary column of account_weekly_summaries.
# Schedule: Daily (after compute_weekly_summaries)

from pyspark.sql.types import StringType, StructType, StructField, DateType
from datetime import date, timedelta

# ============================================================
# CONFIG
# ============================================================
SUMMARIES_TABLE = "silver.silver_layer.account_weekly_summaries"
DIM_CUSTOMERS   = "silver.silver_layer.dim_customers"
GONG_CALLS      = "silver.silver_layer.fct_gong_call"
GONG_BRIDGE     = "silver.silver_layer.bridge_gong_call_to_sf_object"
GONG_TRACKERS   = "silver.silver_layer.fct_gong_call_tracker_hit"

LLM_MODEL    = "databricks-meta-llama-3-1-70b-instruct"
BACKFILL_WEEKS = 12

# ============================================================
# STEP 1: Ensure gong_summary column exists
# ============================================================
today = date.today()
current_week_start = today - timedelta(days=today.weekday())

table_exists = spark.catalog.tableExists(SUMMARIES_TABLE)

if not table_exists:
    print("account_weekly_summaries does not exist yet — run compute_weekly_summaries first.")
    dbutils.notebook.exit("No base table")

spark.sql(f"""
    ALTER TABLE {SUMMARIES_TABLE}
    ADD COLUMN IF NOT EXISTS gong_summary STRING
""")
print("gong_summary column ensured.")

# ============================================================
# STEP 2: Determine which weeks need Gong summaries
# ============================================================
pending = spark.sql(f"""
    SELECT DISTINCT week_start, week_end
    FROM {SUMMARIES_TABLE}
    WHERE gong_summary IS NULL
       OR week_start = '{current_week_start}'
    ORDER BY week_start DESC
    LIMIT {BACKFILL_WEEKS}
""").collect()

if not pending:
    print("All weeks already have gong_summary. Nothing to do.")
    dbutils.notebook.exit("Up to date")

weeks_to_process = [(row[0], row[1]) for row in pending]
earliest_date = min(ws for ws, _ in weeks_to_process)
latest_date   = max(we for _, we in weeks_to_process)

print(f"Weeks to process: {len(weeks_to_process)}")
for ws, we in weeks_to_process:
    print(f"  {ws} to {we}")

# ============================================================
# STEP 3: Load active accounts (need account_name for prompt)
# ============================================================
accounts_df = spark.sql(f"""
    SELECT account_id, account AS account_name
    FROM {DIM_CUSTOMERS}
    WHERE _fivetran_deleted = false
      AND account IS NOT NULL
""")
accounts = {row["account_id"]: row["account_name"] for row in accounts_df.collect()}
print(f"Active accounts: {len(accounts)}")

# ============================================================
# STEP 4: Bulk-query Gong data for the date range
# ============================================================
gong_raw = spark.sql(f"""
    WITH call_base AS (
        SELECT
            b.object_id                                                        AS account_id,
            g.call_id,
            g.call_started_ts,
            CAST(DATE_TRUNC('week', g.call_started_ts) AS DATE)               AS week_start,
            g.call_brief,
            ROW_NUMBER() OVER (
                PARTITION BY b.object_id, CAST(DATE_TRUNC('week', g.call_started_ts) AS DATE)
                ORDER BY g.call_started_ts DESC
            )                                                                  AS rn
        FROM {GONG_CALLS} g
        JOIN {GONG_BRIDGE} b ON g.call_id = b.call_id
        WHERE b.object_type = 'account'
          AND g.call_started_ts >= '{earliest_date}'
          AND g.call_started_ts <  date_add(CAST('{latest_date}' AS DATE), 1)
    ),
    call_counts AS (
        SELECT account_id, week_start, COUNT(DISTINCT call_id) AS call_count
        FROM call_base
        GROUP BY account_id, week_start
    ),
    latest_briefs AS (
        SELECT account_id, week_start, call_brief
        FROM call_base
        WHERE rn = 1
    ),
    tracker_agg AS (
        SELECT
            b.object_id                                                        AS account_id,
            CAST(DATE_TRUNC('week', g.call_started_ts) AS DATE)               AS week_start,
            COLLECT_SET(t.tracker_name)                                        AS tracker_names
        FROM {GONG_CALLS} g
        JOIN {GONG_BRIDGE} b  ON g.call_id = b.call_id
        JOIN {GONG_TRACKERS} t ON CAST(t.call_id AS STRING) = g.call_id
        WHERE b.object_type = 'account'
          AND g.call_started_ts >= '{earliest_date}'
          AND g.call_started_ts <  date_add(CAST('{latest_date}' AS DATE), 1)
        GROUP BY b.object_id, CAST(DATE_TRUNC('week', g.call_started_ts) AS DATE)
    )
    SELECT
        cc.account_id,
        cc.week_start,
        cc.call_count,
        COALESCE(ta.tracker_names, ARRAY())  AS tracker_names,
        lb.call_brief                        AS latest_brief
    FROM call_counts cc
    LEFT JOIN tracker_agg   ta ON cc.account_id = ta.account_id AND cc.week_start = ta.week_start
    LEFT JOIN latest_briefs lb ON cc.account_id = lb.account_id AND cc.week_start = lb.week_start
""").collect()

gong_map = {}
for row in gong_raw:
    gong_map[(row["account_id"], str(row["week_start"]))] = {
        "call_count":   int(row["call_count"]),
        "trackers":     list(row["tracker_names"] or []),
        "latest_brief": row["latest_brief"],
    }

print(f"Gong data points fetched: {len(gong_map)}")

# ============================================================
# STEP 5: Build LLM prompt
# ============================================================

def build_gong_prompt(account_name, week_start, week_end, gong):
    call_count   = gong["call_count"]
    trackers_str = ", ".join(gong["trackers"][:6]) if gong["trackers"] else "none"
    brief        = gong["latest_brief"] or "not available"

    return f"""You are a Customer Success analyst. Write exactly ONE concise sentence (under 20 words, no bullet marker) summarizing this account's Gong call activity for the week. Mention call count, flag any notable topics, and highlight risk if present.

Account: {account_name}
Week: {week_start} to {week_end}
Calls this week: {call_count}
Tracker topics mentioned: {trackers_str}
Most recent call brief: {brief}

Rules: one sentence only, plain text, no bullet or dash prefix."""


# ============================================================
# STEP 6: Process each (account, week), call LLM, collect rows
# ============================================================

# Find which (account_id, week_start) rows exist in the table for targeted update
existing_rows = spark.sql(f"""
    SELECT DISTINCT account_id, week_start
    FROM {SUMMARIES_TABLE}
    WHERE week_start >= '{earliest_date}'
      AND week_start <= '{latest_date}'
""").collect()
existing_set = {(row["account_id"], str(row["week_start"])) for row in existing_rows}

results = []
processed = 0
errors = 0
skipped_no_row = 0

for ws, we in weeks_to_process:
    ws_str = str(ws)
    for account_id, account_name in accounts.items():
        # Only update rows that exist in the summaries table
        if (account_id, ws_str) not in existing_set:
            skipped_no_row += 1
            continue

        gong = gong_map.get((account_id, ws_str))

        if not gong or gong["call_count"] == 0:
            gong_summary = "No Gong calls this week."
        else:
            prompt = build_gong_prompt(account_name, ws, we, gong)
            try:
                row = spark.sql(f"""
                    SELECT ai_query('{LLM_MODEL}', '{prompt.replace("'", "''")}') AS summary
                """).collect()
                gong_summary = row[0]["summary"].strip() if row else "Gong summary unavailable."
            except Exception as e:
                gong_summary = "Gong summary unavailable."
                errors += 1

        results.append({
            "account_id":   account_id,
            "week_start":   ws,
            "gong_summary": gong_summary,
        })

        processed += 1
        if processed % 50 == 0:
            print(f"Progress: {processed} processed, {errors} errors, {skipped_no_row} skipped")

print(f"Done: {processed} summaries generated, {errors} errors, {skipped_no_row} rows skipped (no summary row yet)")

# ============================================================
# STEP 7: MERGE results into account_weekly_summaries
# ============================================================
if not results:
    print("No results to write.")
    dbutils.notebook.exit("No results")

schema = StructType([
    StructField("account_id",   StringType(), False),
    StructField("week_start",   DateType(),   False),
    StructField("gong_summary", StringType(), True),
])

results_df = spark.createDataFrame(results, schema=schema)
results_df.createOrReplaceTempView("gong_updates")

spark.sql(f"""
    MERGE INTO {SUMMARIES_TABLE} AS target
    USING gong_updates AS source
      ON target.account_id = source.account_id
     AND target.week_start = source.week_start
    WHEN MATCHED THEN
        UPDATE SET target.gong_summary = source.gong_summary
""")

print(f"Merged {len(results)} gong_summary values into {SUMMARIES_TABLE}")

# Verify
spark.sql(f"""
    SELECT account_name, week_start, gong_summary
    FROM {SUMMARIES_TABLE}
    WHERE gong_summary IS NOT NULL
    ORDER BY week_start DESC
    LIMIT 5
""").show(truncate=False)
