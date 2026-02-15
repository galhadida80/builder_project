#!/usr/bin/env bash
# Parallel Stress Test — 10 agents × 10 entities each = 100 items
# Creates a new user + project, then 10 agents run in parallel creating
# equipment, materials, contacts, areas, defects, RFIs, meetings, inspections, checklists
# and verifying them. Each agent logs results and checks for bugs.

set -euo pipefail

API="https://builderops-backend-a6cumfv4ga-zf.a.run.app/api/v1"
TIMESTAMP=$(date +%s)
EMAIL="stresstest${TIMESTAMP}@builderops.dev"
PASSWORD="StressTest2026!"
FULL_NAME="Stress Test Agent"
PROJECT_NAME="Stress Test ${TIMESTAMP}"
PROJECT_CODE="ST-${TIMESTAMP: -6}"
LOG_DIR="/tmp/builderops-stress-${TIMESTAMP}"
BUGS_FILE="${LOG_DIR}/bugs.log"

mkdir -p "$LOG_DIR"
echo "=== BuilderOps Stress Test $(date) ===" > "$BUGS_FILE"
echo "Log dir: $LOG_DIR"

# ── Helper ──────────────────────────────────────────────
api() {
  local method=$1 path=$2 token=$3
  shift 3
  curl -sf -X "$method" "${API}${path}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${token}" \
    "$@" 2>/dev/null
}

report_bug() {
  local agent=$1 msg=$2
  echo "[BUG][Agent ${agent}] ${msg}" | tee -a "$BUGS_FILE"
}

report_ok() {
  local agent=$1 msg=$2
  echo "[OK][Agent ${agent}] ${msg}"
}

# ── Step 1: Register User ──────────────────────────────
echo ""
echo "▶ Step 1: Registering user ${EMAIL}..."
REG_RESPONSE=$(curl -sf -X POST "${API}/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"full_name\":\"${FULL_NAME}\"}" 2>&1) || {
  echo "FATAL: Registration failed: ${REG_RESPONSE}"
  exit 1
}
TOKEN=$(echo "$REG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)
USER_ID=$(echo "$REG_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
if [ -z "$TOKEN" ]; then
  echo "FATAL: Could not extract token from registration response"
  echo "$REG_RESPONSE"
  exit 1
fi
echo "  ✓ Registered user ${USER_ID}"

# ── Step 2: Create Project ─────────────────────────────
echo ""
echo "▶ Step 2: Creating project ${PROJECT_NAME}..."
PROJ_RESPONSE=$(api POST "/projects" "$TOKEN" \
  -d "{\"name\":\"${PROJECT_NAME}\",\"code\":\"${PROJECT_CODE}\",\"description\":\"Automated stress test project\"}") || {
  echo "FATAL: Project creation failed"
  exit 1
}
PROJECT_ID=$(echo "$PROJ_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
  echo "FATAL: Could not extract project ID"
  echo "$PROJ_RESPONSE"
  exit 1
fi
echo "  ✓ Created project ${PROJECT_ID}"

# ── Step 3: Seed base data (consultant types for inspections) ──
echo ""
echo "▶ Step 3: Fetching consultant types for inspections..."
CT_RESPONSE=$(api GET "/consultant-types" "$TOKEN") || CT_RESPONSE="[]"
CONSULTANT_TYPE_ID=$(echo "$CT_RESPONSE" | python3 -c "
import sys,json
data=json.load(sys.stdin)
print(data[0]['id'] if data else '')
" 2>/dev/null)
echo "  Consultant type: ${CONSULTANT_TYPE_ID:-none}"

# ── Agent Functions ─────────────────────────────────────

agent_contacts() {
  local agent_num=$1 log="${LOG_DIR}/agent_contacts.log"
  echo "Agent contacts: creating 10 contacts..." > "$log"
  local ok=0 fail=0
  for i in $(seq 1 10); do
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/contacts" "$TOKEN" \
      -d "{\"contact_name\":\"Contact ${agent_num}-${i}\",\"contact_type\":\"contractor\",\"company_name\":\"Company ${i}\",\"email\":\"contact${TIMESTAMP}${agent_num}${i}@test.com\",\"phone\":\"050-${agent_num}${i}00000\"}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "contacts" "Failed to create contact ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "contacts" "${fail}/10 contacts failed"
  report_ok "contacts" "${ok}/10 contacts created"
}

agent_areas() {
  local agent_num=$1 log="${LOG_DIR}/agent_areas.log"
  echo "Agent areas: creating 10 areas..." > "$log"
  local ok=0 fail=0
  for i in $(seq 1 10); do
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/areas" "$TOKEN" \
      -d "{\"name\":\"Area ${agent_num}-${i}\",\"area_code\":\"A${agent_num}${i}\",\"floor_number\":${i},\"total_units\":$((i*2))}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "areas" "Failed to create area ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "areas" "${fail}/10 areas failed"
  report_ok "areas" "${ok}/10 areas created"
}

agent_equipment() {
  local agent_num=$1 log="${LOG_DIR}/agent_equipment.log"
  echo "Agent equipment: creating 10 equipment..." > "$log"
  local ok=0 fail=0
  local types=("crane" "excavator" "bulldozer" "loader" "mixer" "pump" "drill" "welder" "generator" "compressor")
  for i in $(seq 1 10); do
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/equipment" "$TOKEN" \
      -d "{\"name\":\"${types[$((i-1))]} Unit ${agent_num}-${i}\",\"equipment_type\":\"${types[$((i-1))]}\",\"model_number\":\"M-${agent_num}${i}\",\"serial_number\":\"SN-${TIMESTAMP}-${i}\",\"manufacturer\":\"TestMfg ${i}\"}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "equipment" "Failed to create equipment ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "equipment" "${fail}/10 equipment failed"
  report_ok "equipment" "${ok}/10 equipment created"
}

agent_materials() {
  local agent_num=$1 log="${LOG_DIR}/agent_materials.log"
  echo "Agent materials: creating 10 materials..." > "$log"
  local ok=0 fail=0
  local types=("concrete" "steel" "wood" "glass" "brick" "insulation" "pipe" "wire" "tile" "paint")
  for i in $(seq 1 10); do
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/materials" "$TOKEN" \
      -d "{\"name\":\"${types[$((i-1))]} Batch ${agent_num}-${i}\",\"material_type\":\"${types[$((i-1))]}\",\"manufacturer\":\"MatMfg ${i}\",\"model_number\":\"MAT-${agent_num}${i}\"}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "materials" "Failed to create material ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "materials" "${fail}/10 materials failed"
  report_ok "materials" "${ok}/10 materials created"
}

agent_defects() {
  local agent_num=$1 log="${LOG_DIR}/agent_defects.log"
  echo "Agent defects: creating 10 defects..." > "$log"
  local ok=0 fail=0
  local cats=("concrete_structure" "plaster" "painting" "plumbing" "flooring" "hvac" "lighting" "roof" "waterproofing" "other")
  local sevs=("low" "medium" "high" "critical" "low" "medium" "high" "critical" "medium" "high")
  for i in $(seq 1 10); do
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/defects" "$TOKEN" \
      -d "{\"description\":\"Defect ${agent_num}-${i}: Test issue in ${cats[$((i-1))]} area\",\"category\":\"${cats[$((i-1))]}\",\"severity\":\"${sevs[$((i-1))]}\",\"assignee_ids\":[]}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "defects" "Failed to create defect ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "defects" "${fail}/10 defects failed"
  report_ok "defects" "${ok}/10 defects created"
}

agent_rfis() {
  local agent_num=$1 log="${LOG_DIR}/agent_rfis.log"
  echo "Agent RFIs: creating 10 RFIs..." > "$log"
  local ok=0 fail=0
  local cats=("design" "structural" "mep" "architectural" "specifications" "schedule" "cost" "other" "design" "structural")
  local pris=("low" "medium" "high" "urgent" "low" "medium" "high" "urgent" "medium" "high")
  for i in $(seq 1 10); do
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/rfis" "$TOKEN" \
      -d "{\"subject\":\"RFI ${agent_num}-${i} Subject\",\"question\":\"RFI ${agent_num}-${i}: Question about ${cats[$((i-1))]} issue?\",\"category\":\"${cats[$((i-1))]}\",\"priority\":\"${pris[$((i-1))]}\",\"to_email\":\"engineer${i}@test.com\"}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "rfis" "Failed to create RFI ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "rfis" "${fail}/10 RFIs failed"
  report_ok "rfis" "${ok}/10 RFIs created"
}

agent_meetings() {
  local agent_num=$1 log="${LOG_DIR}/agent_meetings.log"
  echo "Agent meetings: creating 10 meetings..." > "$log"
  local ok=0 fail=0
  for i in $(seq 1 10); do
    local future_date
    future_date=$(python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()+timedelta(days=${i})).strftime('%Y-%m-%dT10:00:00'))")
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/meetings" "$TOKEN" \
      -d "{\"title\":\"Meeting ${agent_num}-${i}\",\"description\":\"Stress test meeting ${i}\",\"scheduled_date\":\"${future_date}\",\"location\":\"Room ${i}\"}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "meetings" "Failed to create meeting ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "meetings" "${fail}/10 meetings failed"
  report_ok "meetings" "${ok}/10 meetings created"
}

agent_inspections() {
  local agent_num=$1 log="${LOG_DIR}/agent_inspections.log"
  echo "Agent inspections: creating 10 inspections..." > "$log"
  local ok=0 fail=0
  if [ -z "$CONSULTANT_TYPE_ID" ]; then
    report_bug "inspections" "No consultant_type_id available, skipping"
    return
  fi
  for i in $(seq 1 10); do
    local future_date
    future_date=$(python3 -c "from datetime import datetime,timedelta; print((datetime.utcnow()+timedelta(days=${i})).strftime('%Y-%m-%dT09:00:00'))")
    local resp
    resp=$(api POST "/projects/${PROJECT_ID}/inspections" "$TOKEN" \
      -d "{\"consultant_type_id\":\"${CONSULTANT_TYPE_ID}\",\"scheduled_date\":\"${future_date}\",\"notes\":\"Inspection ${agent_num}-${i}\"}" 2>&1)
    if echo "$resp" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      ok=$((ok+1))
    else
      fail=$((fail+1))
      report_bug "inspections" "Failed to create inspection ${i}: ${resp}" >> "$log"
    fi
  done
  echo "  Created: ${ok}, Failed: ${fail}" >> "$log"
  [ "$fail" -gt 0 ] && report_bug "inspections" "${fail}/10 inspections failed"
  report_ok "inspections" "${ok}/10 inspections created"
}

agent_verify_lists() {
  local agent_num=$1 log="${LOG_DIR}/agent_verify.log"
  echo "Agent verify: checking all list endpoints..." > "$log"
  local bugs=0

  # Verify each endpoint returns expected counts
  for endpoint in contacts areas equipment materials defects rfis meetings inspections; do
    local resp count
    resp=$(api GET "/projects/${PROJECT_ID}/${endpoint}" "$TOKEN" 2>&1) || {
      report_bug "verify" "GET /${endpoint} failed"
      bugs=$((bugs+1))
      continue
    }
    count=$(echo "$resp" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
    if [ "$count" -ge 10 ]; then
      report_ok "verify" "/${endpoint}: ${count} items (expected ≥10)"
    else
      report_bug "verify" "/${endpoint}: only ${count} items (expected ≥10)"
      bugs=$((bugs+1))
    fi
  done

  # Verify defects summary
  local summary
  summary=$(api GET "/projects/${PROJECT_ID}/defects/summary" "$TOKEN" 2>&1)
  local total
  total=$(echo "$summary" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])" 2>/dev/null)
  if [ "${total:-0}" -ge 10 ]; then
    report_ok "verify" "/defects/summary: total=${total}"
  else
    report_bug "verify" "/defects/summary: total=${total:-null} (expected ≥10)"
    bugs=$((bugs+1))
  fi

  # Verify audit log has entries
  local audit_resp audit_count
  audit_resp=$(api GET "/projects/${PROJECT_ID}/audit-log" "$TOKEN" 2>&1) || audit_resp="[]"
  audit_count=$(echo "$audit_resp" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
  if [ "${audit_count:-0}" -ge 50 ]; then
    report_ok "verify" "/audit-log: ${audit_count} entries"
  else
    report_bug "verify" "/audit-log: only ${audit_count:-0} entries (expected ≥50)"
    bugs=$((bugs+1))
  fi

  echo "  Bugs found: ${bugs}" >> "$log"
}

agent_update_statuses() {
  local agent_num=$1 log="${LOG_DIR}/agent_updates.log"
  echo "Agent updates: testing status changes..." > "$log"
  local bugs=0

  # Get first defect and change status
  local defects_resp first_defect_id
  defects_resp=$(api GET "/projects/${PROJECT_ID}/defects" "$TOKEN" 2>&1)
  first_defect_id=$(echo "$defects_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
  if [ -n "$first_defect_id" ]; then
    local update_resp
    update_resp=$(api PUT "/projects/${PROJECT_ID}/defects/${first_defect_id}" "$TOKEN" \
      -d '{"status":"resolved"}' 2>&1)
    local new_status
    new_status=$(echo "$update_resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null)
    if [ "$new_status" = "resolved" ]; then
      report_ok "updates" "Defect status→resolved OK"
    else
      report_bug "updates" "Defect status change failed: ${new_status}"
      bugs=$((bugs+1))
    fi
  fi

  # Get first RFI and update
  local rfis_resp first_rfi_id
  rfis_resp=$(api GET "/projects/${PROJECT_ID}/rfis" "$TOKEN" 2>&1)
  first_rfi_id=$(echo "$rfis_resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
  if [ -n "$first_rfi_id" ]; then
    local rfi_update
    rfi_update=$(api PUT "/projects/${PROJECT_ID}/rfis/${first_rfi_id}" "$TOKEN" \
      -d '{"answer":"This is the answer to the RFI question."}' 2>&1)
    if echo "$rfi_update" | python3 -c "import sys,json; json.load(sys.stdin)['id']" &>/dev/null; then
      report_ok "updates" "RFI answer update OK"
    else
      report_bug "updates" "RFI update failed: ${rfi_update}"
      bugs=$((bugs+1))
    fi
  fi

  echo "  Bugs found: ${bugs}" >> "$log"
}

# ── Step 4: Run 10 agents in parallel ──────────────────
echo ""
echo "▶ Step 4: Launching 10 agents in parallel..."
echo "  Each agent creates 10 items (100 total)"
echo ""

START_TIME=$(date +%s)

agent_contacts 1 &
agent_areas 2 &
agent_equipment 3 &
agent_materials 4 &
agent_defects 5 &
agent_rfis 6 &
agent_meetings 7 &
agent_inspections 8 &
agent_verify_lists 9 &    # will run early, may see partial data
agent_update_statuses 10 & # will run early, may see partial data

# Wait for all agents
wait

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "▶ Step 5: All agents completed in ${ELAPSED}s"

# ── Step 6: Final verification (after all agents done) ──
echo ""
echo "▶ Step 6: Final verification..."
agent_verify_lists "final"

# ── Step 7: Check GCP logs for errors ──────────────────
echo ""
echo "▶ Step 7: Checking GCP logs for errors..."
GCP_ERRORS=$(gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="builderops-backend" AND severity>=ERROR' \
  --limit=20 --format="table(timestamp, textPayload)" --freshness=5m 2>/dev/null) || GCP_ERRORS="(could not fetch logs)"
if [ -z "$GCP_ERRORS" ] || echo "$GCP_ERRORS" | grep -q "Listed 0 items"; then
  echo "  ✓ No errors in GCP logs"
else
  echo "  ⚠ GCP errors found:"
  echo "$GCP_ERRORS" | head -20
  echo "$GCP_ERRORS" >> "$BUGS_FILE"
fi

# ── Summary ────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════"
echo "  STRESS TEST SUMMARY"
echo "════════════════════════════════════════════"
echo "  User:      ${EMAIL}"
echo "  Project:   ${PROJECT_NAME} (${PROJECT_CODE})"
echo "  ProjectID: ${PROJECT_ID}"
echo "  Duration:  ${ELAPSED}s"
echo "  Logs:      ${LOG_DIR}/"
echo ""

BUG_COUNT=$(grep -c "\[BUG\]" "$BUGS_FILE" 2>/dev/null || echo "0")
if [ "$BUG_COUNT" -gt 1 ]; then
  echo "  ⚠ BUGS FOUND: $((BUG_COUNT - 0))"
  echo ""
  grep "\[BUG\]" "$BUGS_FILE"
else
  echo "  ✓ ALL TESTS PASSED — No bugs found"
fi
echo ""
echo "════════════════════════════════════════════"
