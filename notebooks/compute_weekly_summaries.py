# Databricks notebook: compute_weekly_summaries
# Generates weekly activity summaries per account using LLM
# Schedule: Daily (after compute_health_scores)
# Produces: silver.silver_layer.account_weekly_summaries

from pyspark.sql import functions as F
from pyspark.sql.types import StringType, StructType, StructField, DateType, TimestampType
from datetime import date, timedelta
import json

# ============================================================
# CONFIG
# ============================================================
SUMMARIES_TABLE = "silver.silver_layer.account_weekly_summaries"
HEALTH_TABLE = "silver.silver_layer.account_health_scores_history"
DIM_CUSTOMERS = "silver.silver_layer.dim_customers"
PENDO_ACCOUNTS = "silver.silver_layer.dim_pendo_account_customers"
PENDO_DAILY = "silver.silver_layer.fct_pendo_account_daily_metrics"
FRESHDESK_CUSTOMERS = "silver.silver_layer.dim_freshdesk_account_customers"
FRESHDESK_TICKETS = "silver.silver_layer.fct_freshdesk_ticket_history"
FCT_CONTRACTS = "silver.silver_layer.fct_contracts"

LLM_MODEL = "databricks-meta-llama-3-1-70b-instruct"
BACKFILL_WEEKS = 12

# ============================================================
# STEP 1: Determine which weeks need summaries
# ============================================================
today = date.today()
# Current ISO week start (Monday)
current_week_start = today - timedelta(days=today.weekday())
current_week_end = current_week_start + timedelta(days=6)

# Check what already exists
table_exists = spark.catalog.tableExists(SUMMARIES_TABLE)

if table_exists:
    existing_weeks = spark.sql(f"""
        SELECT DISTINCT week_start FROM {SUMMARIES_TABLE}
    """).collect()
    existing_week_dates = {row[0] for row in existing_weeks}
    print(f"Existing weeks in table: {len(existing_week_dates)}")
else:
    existing_week_dates = set()
    print("Table does not exist yet — will backfill")

# Build list of weeks to process
weeks_to_process = []
for i in range(BACKFILL_WEEKS):
    ws = current_week_start - timedelta(weeks=i)
    we = ws + timedelta(days=6)
    if ws == current_week_start:
        # Always regenerate current week (it's still in progress)
        weeks_to_process.append((ws, we))
    elif ws not in existing_week_dates:
        weeks_to_process.append((ws, we))

print(f"Weeks to process: {len(weeks_to_process)}")
for ws, we in weeks_to_process:
    print(f"  {ws} to {we}")

if not weeks_to_process:
    print("All weeks already have summaries. Nothing to do.")
    dbutils.notebook.exit("No new weeks to process")

# ============================================================
# STEP 2: Get all active accounts
# ============================================================
accounts_df = spark.sql(f"""
    SELECT account_id, account AS account_name
    FROM {DIM_CUSTOMERS}
    WHERE _fivetran_deleted = false
      AND account IS NOT NULL
""")
accounts = accounts_df.collect()
print(f"Accounts to process: {len(accounts)}")

# ============================================================
# STEP 3: Gather raw weekly data for all accounts & weeks
# ============================================================
earliest_date = min(ws for ws, _ in weeks_to_process)
latest_date = max(we for _, we in weeks_to_process)

# 3a. Pendo weekly metrics
pendo_weekly = spark.sql(f"""
    SELECT
        pc.name AS account_name,
        DATE_TRUNC('week', p.date_day) AS week_start,
        SUM(COALESCE(p.count_active_visitors, 0)) AS visitors,
        SUM(COALESCE(p.sum_events, 0)) AS events,
        COUNT(DISTINCT p.date_day) AS data_days
    FROM {PENDO_ACCOUNTS} pc
    JOIN {PENDO_DAILY} p ON p.account_id = pc.id
    WHERE p.date_day >= '{earliest_date}'
      AND p.date_day <= '{latest_date}'
    GROUP BY pc.name, DATE_TRUNC('week', p.date_day)
""").collect()

pendo_map = {}
for row in pendo_weekly:
    key = (row["account_name"].lower().strip() if row["account_name"] else "", str(row["week_start"]))
    pendo_map[key] = {
        "visitors": int(row["visitors"]),
        "events": int(row["events"]),
        "data_days": int(row["data_days"]),
    }

# Also get prior week data for delta calculation
prior_earliest = earliest_date - timedelta(days=7)
pendo_prior = spark.sql(f"""
    SELECT
        pc.name AS account_name,
        DATE_TRUNC('week', p.date_day) AS week_start,
        SUM(COALESCE(p.count_active_visitors, 0)) AS visitors,
        SUM(COALESCE(p.sum_events, 0)) AS events
    FROM {PENDO_ACCOUNTS} pc
    JOIN {PENDO_DAILY} p ON p.account_id = pc.id
    WHERE p.date_day >= '{prior_earliest}'
      AND p.date_day < '{earliest_date}'
    GROUP BY pc.name, DATE_TRUNC('week', p.date_day)
""").collect()

for row in pendo_prior:
    key = (row["account_name"].lower().strip() if row["account_name"] else "", str(row["week_start"]))
    pendo_map[key] = {
        "visitors": int(row["visitors"]),
        "events": int(row["events"]),
        "data_days": 0,
    }

print(f"Pendo weekly data points: {len(pendo_map)}")

# 3b. Freshdesk weekly metrics
freshdesk_weekly = spark.sql(f"""
    SELECT
        fc.name AS account_name,
        DATE_TRUNC('week', t.created_at) AS week_start,
        COUNT(*) AS tickets_opened,
        SUM(CASE WHEN t.label_for_customer IN ('Closed', 'Resolved') THEN 1 ELSE 0 END) AS tickets_closed,
        SUM(CASE WHEN t.priority = 'Urgent' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN t.priority = 'High' THEN 1 ELSE 0 END) AS high
    FROM {FRESHDESK_CUSTOMERS} fc
    JOIN {FRESHDESK_TICKETS} t ON t.company_id = fc.id
    WHERE fc._fivetran_deleted = false
      AND t.created_at >= '{earliest_date}'
      AND t.created_at <= '{latest_date}'
    GROUP BY fc.name, DATE_TRUNC('week', t.created_at)
""").collect()

freshdesk_map = {}
for row in freshdesk_weekly:
    key = (row["account_name"].lower().strip() if row["account_name"] else "", str(row["week_start"]))
    freshdesk_map[key] = {
        "tickets_opened": int(row["tickets_opened"]),
        "tickets_closed": int(row["tickets_closed"]),
        "critical": int(row["critical"]),
        "high": int(row["high"]),
    }

print(f"Freshdesk weekly data points: {len(freshdesk_map)}")

# 3c. Health score weekly snapshots (start/end of week)
health_weekly = spark.sql(f"""
    WITH ranked AS (
        SELECT
            account_id, account_name, health_score, health_category, score_date,
            DATE_TRUNC('week', score_date) AS week_start,
            ROW_NUMBER() OVER (PARTITION BY account_id, DATE_TRUNC('week', score_date) ORDER BY score_date ASC) AS rn_first,
            ROW_NUMBER() OVER (PARTITION BY account_id, DATE_TRUNC('week', score_date) ORDER BY score_date DESC) AS rn_last
        FROM {HEALTH_TABLE}
        WHERE score_date >= '{earliest_date}'
          AND score_date <= '{latest_date}'
    )
    SELECT
        account_id, account_name, week_start,
        MAX(CASE WHEN rn_first = 1 THEN health_score END) AS score_start,
        MAX(CASE WHEN rn_first = 1 THEN health_category END) AS category_start,
        MAX(CASE WHEN rn_last = 1 THEN health_score END) AS score_end,
        MAX(CASE WHEN rn_last = 1 THEN health_category END) AS category_end
    FROM ranked
    WHERE rn_first = 1 OR rn_last = 1
    GROUP BY account_id, account_name, week_start
""").collect()

health_map = {}
for row in health_weekly:
    key = (row["account_id"], str(row["week_start"]))
    health_map[key] = {
        "score_start": int(row["score_start"]) if row["score_start"] is not None else None,
        "category_start": row["category_start"],
        "score_end": int(row["score_end"]) if row["score_end"] is not None else None,
        "category_end": row["category_end"],
    }

print(f"Health weekly data points: {len(health_map)}")

# 3d. Contract data (nearest renewal per account — static context)
contract_data = spark.sql(f"""
    SELECT
        c.ACCOUNT_ID AS account_id,
        MIN(CASE WHEN c.REV_REC_END_DATE IS NOT NULL AND c.REV_REC_END_DATE >= CURRENT_DATE()
            THEN DATEDIFF(c.REV_REC_END_DATE, CURRENT_DATE()) END) AS renewal_days,
        SUM(COALESCE(TRY_CAST(c.ARR_CAD AS DOUBLE), 0)) AS total_arr_cad,
        COUNT(DISTINCT c.CONTRACT_GROUP) AS contract_count
    FROM {FCT_CONTRACTS} c
    GROUP BY c.ACCOUNT_ID
""").collect()

contract_map = {}
for row in contract_data:
    contract_map[row["account_id"]] = {
        "renewal_days": int(row["renewal_days"]) if row["renewal_days"] is not None else None,
        "total_arr_cad": float(row["total_arr_cad"] or 0),
        "contract_count": int(row["contract_count"] or 0),
    }

print(f"Contract data points: {len(contract_map)}")

# ============================================================
# STEP 4: Build prompts and generate LLM summaries
# ============================================================

def build_prompt(account_name, account_id, week_start, week_end, pendo, freshdesk, health, contract):
    """Build a concise prompt for the LLM."""
    lines = []
    lines.append(f"Account: {account_name}")
    lines.append(f"Week: {week_start} to {week_end}")
    lines.append("")

    # Pendo
    if pendo:
        prior_key_date = str(week_start - timedelta(days=7)) if isinstance(week_start, date) else None
        lines.append(f"PRODUCT USAGE (Pendo): {pendo['visitors']} active visitors, {pendo['events']} events this week.")
    else:
        lines.append("PRODUCT USAGE (Pendo): No Pendo data for this account.")

    # Freshdesk
    if freshdesk:
        lines.append(f"SUPPORT (Freshdesk): {freshdesk['tickets_opened']} tickets opened ({freshdesk['critical']} critical, {freshdesk['high']} high priority), {freshdesk['tickets_closed']} resolved.")
    else:
        lines.append("SUPPORT (Freshdesk): No support tickets this week.")

    # Contract
    if contract and contract.get("renewal_days") is not None:
        lines.append(f"CONTRACT: Nearest renewal in {contract['renewal_days']} days. Total ARR: ${contract['total_arr_cad']:,.0f} CAD across {contract['contract_count']} contract group(s).")
    else:
        lines.append("CONTRACT: No active renewal data.")

    # Health
    if health and health.get("score_start") is not None:
        delta = (health["score_end"] or 0) - (health["score_start"] or 0)
        direction = "up" if delta > 0 else "down" if delta < 0 else "unchanged"
        lines.append(f"HEALTH SCORE: Started at {health['score_start']} ({health['category_start']}), ended at {health['score_end']} ({health['category_end']}). Direction: {direction} ({delta:+d} points).")
    else:
        lines.append("HEALTH SCORE: No health score data for this week.")

    data_block = "\n".join(lines)

    prompt = f"""You are a Customer Success analyst writing a brief weekly activity digest. Based on the data below, write 3-5 concise bullet points summarizing this week's activity. Rules:
- Be specific with numbers (visitors, tickets, scores)
- Flag anything concerning (drops, critical tickets, score declines, imminent renewals)
- Note positive trends too (growth, resolved tickets, score improvements)
- If a system has no data, say so briefly in one bullet
- Keep total response under 100 words
- Use plain text bullets starting with •
- Do NOT include the account name or week dates in the bullets

{data_block}"""

    return prompt


def format_arr(val):
    if val >= 1_000_000:
        return f"${val/1_000_000:.1f}M"
    elif val >= 1_000:
        return f"${val/1_000:.0f}K"
    return f"${val:.0f}"


# ============================================================
# STEP 5: Process each account × week, call LLM, collect rows
# ============================================================
from datetime import datetime

results = []
total_combinations = len(accounts) * len(weeks_to_process)
processed = 0
errors = 0

for acct in accounts:
    account_id = acct["account_id"]
    account_name = acct["account_name"]
    name_lower = account_name.lower().strip() if account_name else ""

    for week_start, week_end in weeks_to_process:
        ws_str = str(week_start)

        pendo = pendo_map.get((name_lower, ws_str))
        freshdesk = freshdesk_map.get((name_lower, ws_str))
        health = health_map.get((account_id, ws_str))
        contract = contract_map.get(account_id)

        # Build prompt
        prompt = build_prompt(account_name, account_id, week_start, week_end, pendo, freshdesk, health, contract)

        # Call LLM via ai_query
        try:
            narrative_row = spark.sql(f"""
                SELECT ai_query('{LLM_MODEL}', '{prompt.replace("'", "''")}') AS narrative
            """).collect()
            narrative = narrative_row[0]["narrative"] if narrative_row else "Summary unavailable."
        except Exception as e:
            narrative = f"Summary generation failed: {str(e)[:100]}"
            errors += 1

        results.append({
            "account_id": account_id,
            "account_name": account_name,
            "week_start": week_start,
            "week_end": week_end,
            "narrative": narrative,
            "generated_at": datetime.utcnow(),
        })

        processed += 1
        if processed % 50 == 0:
            print(f"Progress: {processed}/{total_combinations} ({errors} errors)")

print(f"Done: {processed} summaries generated, {errors} errors")

# ============================================================
# STEP 6: Write to Delta table
# ============================================================
if not results:
    print("No results to write")
    dbutils.notebook.exit("No results")

results_df = spark.createDataFrame(results)

# Create table if needed
spark.sql(f"""
    CREATE TABLE IF NOT EXISTS {SUMMARIES_TABLE} (
        account_id STRING,
        account_name STRING,
        week_start DATE,
        week_end DATE,
        narrative STRING,
        generated_at TIMESTAMP
    )
    USING DELTA
""")

# Delete current week rows (they get regenerated)
current_ws_str = str(current_week_start)
spark.sql(f"DELETE FROM {SUMMARIES_TABLE} WHERE week_start = '{current_ws_str}'")

# Append all results
results_df.write.mode("append").saveAsTable(SUMMARIES_TABLE)

final_count = spark.sql(f"SELECT COUNT(*) as cnt FROM {SUMMARIES_TABLE}").collect()[0]["cnt"]
print(f"Table now has {final_count} total rows")

# Verify
sample = spark.sql(f"""
    SELECT account_name, week_start, LEFT(narrative, 120) AS preview
    FROM {SUMMARIES_TABLE}
    ORDER BY week_start DESC, account_name
    LIMIT 5
""").show(truncate=False)
