"""Parameterized SQL for CSM NPS / CSAT (SurveyMonkey + Freshdesk) by Salesforce CSM id."""

# Maps SurveyMonkey custom_field_2 values to dim_customers.account
_SM_ACCOUNT_CASE = """CASE rec.custom_field_2
        WHEN '6000098717' THEN 'Enbridge'
        WHEN '6000098767' THEN 'Toronto Hydro'
        WHEN '6000100275' THEN 'Duquesne Light'
        WHEN 'Alectra Utilities' THEN 'Alectra Inc. (Corporate)'
        WHEN 'Alliander' THEN 'Alliander N.V.'
        WHEN 'American Electric Power' THEN 'American Electric Power - Transmission (AEP)'
        WHEN 'Baltimore Gas & Electric' THEN 'Baltimore Gas and Electric Company (Exelon)'
        WHEN 'BPA' THEN 'BPA - Generation'
        WHEN 'Black Hills Corporation' THEN 'Black Hills Corporation (BKH)'
        WHEN 'Canadian Natural Resources' THEN 'Canadian Natural Resources Limited'
        WHEN 'Consumers Energy Company' THEN 'Consumers Energy Company - Electric'
        WHEN 'Copel - Companhia Paranaense de Energia' THEN 'COPEL'
        WHEN 'E-Redes' THEN 'E-Redes España'
        WHEN 'ESB Networks' THEN 'ESB-Networks (ESB-Dx)'
        WHEN 'Enbridge Inc.' THEN 'Enbridge'
        WHEN 'FortisBC' THEN 'Fortis BC'
        WHEN 'Gasunie' THEN 'Gasunie (GSU)'
        WHEN 'Hamburger Energienetze' THEN 'Hamburger Energienetze (HEN - former SNH)'
        WHEN 'Hydro One' THEN 'Hydro One (HONI)'
        WHEN 'Hydro Quebec' THEN 'Hydro Quebec - Transmission'
        WHEN 'Idemitsu Kosan' THEN 'Idemitsu Kosan Co.,Ltd.'
        WHEN 'Landsvirkjun' THEN 'Landsvirkjun (National Power of Iceland)'
        WHEN 'National Gas Transmission' THEN 'National Gas Transmission (ex NGT)'
        WHEN 'National Grid' THEN 'National Grid UK Limited'
        WHEN 'National Grid Electric US' THEN 'National Grid US'
        WHEN 'National Grid SA (NGSA)' THEN 'National Grid of Saudi Arabia (NGSA)'
        WHEN 'Network Rail' THEN 'Network Rail (NR)'
        WHEN 'Ontario Power Generation' THEN 'Ontario Power Generation (OPG)'
        WHEN 'PG&E Electric' THEN 'Pacific Gas and Electric Company (PG&E)'
        WHEN 'Portsmouth Water' THEN 'Portsmouth Water (PW)'
        WHEN 'Public Services of New Mexico (PNM)' THEN 'Public Service New Mexico (PNM)'
        WHEN 'RheinEnergie' THEN 'RheinEnergie AG'
        WHEN 'SSEN Distribution' THEN 'SSE Distribution (SSEN-Dx)'
        WHEN 'Scottish Water' THEN 'Scottish Water (SW)'
        WHEN 'Sempra Energy Should be known as: Southern California Gas (SoCalGas)' THEN 'SoCalGas'
        WHEN 'Societa Gasdotti Italia' THEN 'Societa Gasdotti Italia (SGI)'
        WHEN 'South Australian Water Corp - CPLF' THEN 'SA Water'
        WHEN 'South East Water Limited' THEN 'South East Water UK'
        WHEN 'Southern California Gas Company (SoCalGas)' THEN 'SoCalGas'
        WHEN 'Southern Company Gas' THEN 'Southern Company'
        WHEN 'TVA' THEN 'TVA - Corporate'
        WHEN 'Tenaga Nasional Berhad' THEN 'Tenaga Nasional Berhad (TNB)'
        WHEN 'TenneT DE' THEN 'TenneT TSO Germany'
        WHEN 'TenneT NL' THEN 'TenneT TSO Netherlands'
        WHEN 'Uisce Eireann' THEN 'Irish Water (IW)'
        WHEN 'United Utilities' THEN 'United Utilities (UU)'
        WHEN 'Vancouver Airport Authority' THEN 'Vancouver Airport Authority (YVR)'
        WHEN 'Vattenfall Distribution' THEN 'Vattenfall Distribution (VTF-D)'
        WHEN 'Vattenfll Hydro' THEN 'Vattenfall Hydro (VTF-H)'
        ELSE rec.custom_field_2
      END"""


def build_csm_feedback_sql(safe_csm_id: str, dim_customers: str, dim_users: str) -> str:
    """Return full SQL; safe_csm_id must already be SQL-escaped."""
    sm_case = _SM_ACCOUNT_CASE
    return f"""
WITH survey_monkey AS (
  SELECT
    'Survey Monkey'              AS source,
    ra.response_id               AS record_id,
    CAST(NULL AS BIGINT)         AS ticket_id,
    u.name                       AS csm,
    c.account_executive          AS ae,
    c.account                    AS customer_name,
    c.region,
    rec.email                    AS respondent_email,
    rec.custom_field_1           AS respondent_name,
    qo.position                  AS raw_score,
    CASE qo.position
      WHEN 3 THEN 'Very Satisfied'
      WHEN 2 THEN 'Satisfied'
      WHEN 1 THEN 'Dissatisfied'
    END                          AS rating_label,
    CASE qo.position
      WHEN 3 THEN 'Promoter'
      WHEN 2 THEN 'Passive'
      WHEN 1 THEN 'Detractor'
    END                          AS nps_category,
    rh.response_status,
    CAST(NULL AS STRING)         AS feedback,
    CAST(NULL AS STRING)         AS ticket_subject,
    CAST(NULL AS STRING)         AS ticket_status,
    rh.created_at                AS response_date
  FROM workspace.survey_monkey.response_answer ra
    JOIN workspace.survey_monkey.response_history rh
      ON ra.response_id = rh.id AND rh._fivetran_active = true
    JOIN workspace.survey_monkey.question_option_history qo
      ON ra.choice_id = qo.id AND qo.question_id = ra.question_id AND qo._fivetran_active = true
    LEFT JOIN workspace.survey_monkey.recipient rec ON rh.recipient_id = rec.id
    LEFT JOIN {dim_customers} c
      ON {sm_case} = c.account
    LEFT JOIN {dim_users} u ON c.csm_c = u.id
  WHERE ra.question_id = 64134281
    AND rh.collector_id IN (330439833, 330439914)
    AND c.account_id IS NOT NULL
    AND c.csm_c = '{safe_csm_id}'
),

freshdesk_csat AS (
  SELECT
    'Freshdesk'                  AS source,
    CAST(csat.satisfaction_rating_id AS BIGINT) AS record_id,
    csat.ticket_id,
    u.name                       AS csm,
    c.account_executive          AS ae,
    c.account                    AS customer_name,
    c.region,
    CAST(NULL AS STRING)         AS respondent_email,
    CAST(NULL AS STRING)         AS respondent_name,
    CAST(csat.value AS INT)      AS raw_score,
    CASE CAST(csat.value AS INT)
      WHEN 103  THEN 'Extremely Happy'
      WHEN 102  THEN 'Very Happy'
      WHEN 101  THEN 'Happy'
      WHEN 100  THEN 'Neutral'
      WHEN -101 THEN 'Unhappy'
      WHEN -102 THEN 'Very Unhappy'
      WHEN -103 THEN 'Extremely Unhappy'
    END                          AS rating_label,
    CASE
      WHEN CAST(csat.value AS INT) >= 102 THEN 'Promoter'
      WHEN CAST(csat.value AS INT) BETWEEN 100 AND 101 THEN 'Passive'
      WHEN CAST(csat.value AS INT) < 0   THEN 'Detractor'
    END                          AS nps_category,
    CAST(NULL AS STRING)         AS response_status,
    csat.feedback,
    t.subject                      AS ticket_subject,
    t.label_for_customer           AS ticket_status,
    csat.response_date
  FROM silver.silver_layer.fct_freshdesk_csat csat
    JOIN silver.silver_layer.fct_freshdesk_ticket_history t ON csat.ticket_id = t.id
    JOIN silver.silver_layer.dim_freshdesk_account_customers f
      ON t.company_id = f.id AND f._fivetran_deleted = false
    LEFT JOIN {dim_customers} c ON f.name = c.account
    LEFT JOIN {dim_users} u ON c.csm_c = u.id
  WHERE csat.label = 'How satisfied are you with the resolution of this request?'
    AND csat.value IS NOT NULL
    AND c.account_id IS NOT NULL
    AND c.csm_c = '{safe_csm_id}'
)

SELECT * FROM (
  SELECT * FROM survey_monkey
  UNION ALL
  SELECT * FROM freshdesk_csat
) combined
ORDER BY response_date DESC
LIMIT 500
"""
