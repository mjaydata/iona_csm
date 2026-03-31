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


def build_survey_monkey_pivot_for_response_ids_sql(
    safe_csm_id: str, dim_customers: str, ids_in: str
) -> str:
    """Pivot one row per response_id with known Relationship / Accelerate / Implementation questions.

    Matches finance-approved SurveyMonkey logic: COALESCE(qo.text, ra.text), HTML strip, COLLECT_SET
    multi-selects, matrix sub-questions via sub_question_history. Scoped to CSM via dim_customers.

    ids_in: comma-separated numeric response_history ids (rh.id), SQL-escaped upstream.
    """
    sm_case = _SM_ACCOUNT_CASE
    # _a: stripped answer text from MC or open-ended
    _a = "REGEXP_REPLACE(COALESCE(qo.text, ra.text), '<[^>]*>', '')"
    return f"""
SELECT
  rh.id AS response_id,
  MAX(CASE
    WHEN rh.collector_id IN (330439833, 330439914) THEN 'Relationship'
    WHEN rh.collector_id IN (330464615, 330424468) THEN 'Accelerate'
    WHEN rh.collector_id IN (330455619, 330458685, 330409181) THEN 'Implementation'
    ELSE 'Other'
  END) AS survey_type,
  MAX(CASE
    WHEN rec.custom_field_2 RLIKE '^[0-9]+$' THEN COALESCE(rh.custom_value, rec.custom_field_2)
    ELSE COALESCE(rec.custom_field_2, rh.custom_value)
  END) AS company,
  MAX(COALESCE(rec.custom_field_1, rh.custom_value, rec.email, 'Anonymous')) AS respondent,
  MAX(rec.email) AS email,
  MAX(rh.created_at) AS response_date,
  MAX(rec.custom_field_3) AS ifs_contact,

  MAX(CASE WHEN ra.question_id = 64134281 THEN {_a} END) AS `Overall Satisfaction (Rel)`,
  MAX(CASE WHEN ra.question_id = 64134290 THEN {_a} END) AS `Success Story`,
  MAX(CASE WHEN ra.question_id = 64134291 THEN {_a} END) AS `Improvement Needed`,
  MAX(CASE WHEN ra.question_id = 64134292 THEN {_a} END) AS `Greatest Benefit`,
  MAX(CASE WHEN ra.question_id = 64134293 THEN {_a} END) AS `Better Experience`,
  MAX(CASE WHEN ra.question_id = 64134307 THEN {_a} END) AS `Support and Innovation`,
  MAX(CASE WHEN ra.question_id = 64134308 THEN {_a} END) AS `Consent to Share (Rel)`,
  MAX(CASE WHEN ra.question_id = 64134314 THEN {_a} END) AS `Team Recognition (Rel)`,
  MAX(CASE WHEN ra.question_id = 64213676 THEN {_a} END) AS `Usage Frequency`,
  MAX(CASE WHEN ra.question_id = 64213677 THEN {_a} END) AS `Number of Users`,
  MAX(CASE WHEN ra.question_id = 64213678 THEN {_a} END) AS `Achieved Key Goals`,
  MAX(CASE WHEN ra.question_id = 64213944 THEN {_a} END) AS `Well Informed Updates`,
  CONCAT_WS('; ', COLLECT_SET(CASE WHEN ra.question_id = 64214090 THEN {_a} END)) AS `Business Challenges`,
  MAX(CASE WHEN ra.question_id = 64227018 THEN {_a} END) AS `Products Used`,
  MAX(CASE WHEN ra.question_id = 64227019 THEN {_a} END) AS `Feature Requests`,
  CONCAT_WS('; ', COLLECT_SET(CASE WHEN ra.question_id = 64227168 THEN
    CONCAT(REGEXP_REPLACE(COALESCE(sq.text, ''), '<[^>]*>', ''), ': ', {_a}) END)) AS `Engagement`,
  CONCAT_WS('; ', COLLECT_SET(CASE WHEN ra.question_id = 64227171 THEN
    CONCAT(REGEXP_REPLACE(COALESCE(sq.text, ''), '<[^>]*>', ''), ': ', {_a}) END)) AS `Engagement Value`,
  MAX(CASE WHEN ra.question_id = 64227181 THEN {_a} END) AS `Intuitiveness`,
  MAX(CASE WHEN ra.question_id = 64229227 THEN {_a} END) AS `Easy to Business`,
  MAX(CASE WHEN ra.question_id = 64229286 THEN {_a} END) AS `Responsiveness`,
  MAX(CASE WHEN ra.question_id = 64229290 THEN {_a} END) AS `Point of Contact`,
  MAX(CASE WHEN ra.question_id = 64229298 THEN {_a} END) AS `Team Knowledge`,

  MAX(CASE WHEN ra.question_id = 64061389 THEN {_a} END) AS `Overall Satisfaction (Acc)`,
  MAX(CASE WHEN ra.question_id = 64061380 THEN {_a} END) AS `Positive Feedback`,
  MAX(CASE WHEN ra.question_id = 64061381 THEN {_a} END) AS `Improvement Feedback`,
  MAX(CASE WHEN ra.question_id = 64061383 THEN {_a} END) AS `Consent to Share (Acc)`,

  MAX(CASE WHEN ra.question_id = 64061154 THEN {_a} END) AS `Implementation Satisfaction`,
  MAX(CASE WHEN ra.question_id = 64061155 THEN {_a} END) AS `Most Valuable Part`,
  MAX(CASE WHEN ra.question_id = 64061157 THEN {_a} END) AS `Expectations Met`,
  MAX(CASE WHEN ra.question_id = 64081678 THEN {_a} END) AS `Additional Detail`,
  MAX(CASE WHEN ra.question_id = 64134313 THEN {_a} END) AS `Team Recognition (Impl)`

FROM workspace.survey_monkey.response_answer ra
  JOIN workspace.survey_monkey.response_history rh
    ON ra.response_id = rh.id
    AND rh._fivetran_active = true
  LEFT JOIN workspace.survey_monkey.question_option_history qo
    ON ra.choice_id = qo.id
    AND qo._fivetran_active = true
  LEFT JOIN workspace.survey_monkey.sub_question_history sq
    ON ra.row_id = sq.id
    AND sq._fivetran_active = true
  LEFT JOIN workspace.survey_monkey.recipient rec
    ON CAST(rh.recipient_id AS STRING) = rec.id
  INNER JOIN {dim_customers} c
    ON {sm_case} = c.account
    AND c._fivetran_deleted = false
    AND c.csm_c = '{safe_csm_id}'
WHERE rh.id IN ({ids_in})
  AND rh.collector_id IN (
    330439833, 330439914, 330464615, 330424468, 330455619, 330458685, 330409181
  )
GROUP BY rh.id
"""


def build_freshdesk_csat_for_tickets_sql(ticket_ids_sql_in: str) -> str:
    """All CSAT satisfaction rows for the given ticket ids (comma-separated numeric list)."""
    return f"""
SELECT
  csat.ticket_id,
  csat.label,
  CAST(csat.value AS INT) AS value,
  CASE CAST(csat.value AS INT)
    WHEN 103  THEN 'Extremely Happy'
    WHEN 102  THEN 'Very Happy'
    WHEN 101  THEN 'Happy'
    WHEN 100  THEN 'Neutral'
    WHEN -101 THEN 'Unhappy'
    WHEN -102 THEN 'Very Unhappy'
    WHEN -103 THEN 'Extremely Unhappy'
  END AS rating_label,
  CASE
    WHEN CAST(csat.value AS INT) >= 102 THEN 'Promoter'
    WHEN CAST(csat.value AS INT) BETWEEN 100 AND 101 THEN 'Passive'
    WHEN CAST(csat.value AS INT) < 0 THEN 'Detractor'
  END AS nps_category,
  csat.feedback,
  csat.response_date
FROM silver.silver_layer.fct_freshdesk_csat csat
WHERE csat.ticket_id IN ({ticket_ids_sql_in})
  AND csat.value IS NOT NULL
ORDER BY csat.ticket_id, csat.response_date DESC
"""
