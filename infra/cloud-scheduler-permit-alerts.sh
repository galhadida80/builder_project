#!/bin/bash
set -euo pipefail

# Cloud Scheduler Job for Permit Deadline Alerts
#
# This script creates a Cloud Scheduler job that runs daily at 9:00 AM Israel time
# to check for permit deadlines and send expiration alerts (30/14/7 days before).
#
# Prerequisites:
# - GCP project is set up (run gcp-setup.sh first)
# - Backend is deployed to Cloud Run
# - SCHEDULER_SECRET is set in GitHub secrets and deployed to Cloud Run

PROJECT_ID="builderops-poc-il"
REGION="me-west1"
SCHEDULER_LOCATION="europe-west1"  # Cloud Scheduler not available in me-west1
JOB_NAME="permit-deadline-alerts"
BACKEND_SERVICE="builderops-backend"

echo "=== Cloud Scheduler Setup for Permit Deadline Alerts ==="
echo "Project: $PROJECT_ID"
echo "Backend Region: $REGION"
echo "Scheduler Location: $SCHEDULER_LOCATION"
echo ""

# Set active project
gcloud config set project "$PROJECT_ID"

# Enable Cloud Scheduler API if not already enabled
echo "--- Enabling Cloud Scheduler API ---"
gcloud services enable cloudscheduler.googleapis.com

# Get the backend Cloud Run URL
echo "--- Getting backend URL ---"
BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region="$REGION" \
  --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
  echo "ERROR: Backend service '$BACKEND_SERVICE' not found in region $REGION"
  echo "Deploy the backend first using: git push origin main"
  exit 1
fi

WEBHOOK_URL="${BACKEND_URL}/api/v1/webhooks/permits/check-deadlines"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Check if SCHEDULER_SECRET is set in the deployed service
echo "--- Checking for SCHEDULER_SECRET in deployed service ---"
SCHEDULER_SECRET=$(gcloud run services describe "$BACKEND_SERVICE" \
  --region="$REGION" \
  --format='value(spec.template.spec.containers[0].env[?(@.name=="SCHEDULER_SECRET")].value)' 2>/dev/null || echo "")

if [ -z "$SCHEDULER_SECRET" ]; then
  echo "ERROR: SCHEDULER_SECRET not found in backend service environment variables"
  echo ""
  echo "Please ensure SCHEDULER_SECRET is set in GitHub secrets and backend is redeployed."
  echo "To set the secret:"
  echo "  1. Generate a strong secret: openssl rand -base64 48"
  echo "  2. Add SCHEDULER_SECRET to GitHub repository secrets"
  echo "  3. Redeploy backend: git push origin main"
  exit 1
fi

echo "SCHEDULER_SECRET found in backend service ✓"
echo ""

# Delete existing job if it exists
echo "--- Checking for existing scheduler job ---"
if gcloud scheduler jobs describe "$JOB_NAME" --location="$SCHEDULER_LOCATION" &>/dev/null; then
  echo "Deleting existing job '$JOB_NAME'..."
  gcloud scheduler jobs delete "$JOB_NAME" \
    --location="$SCHEDULER_LOCATION" \
    --quiet
  echo "Existing job deleted ✓"
fi

# Create the scheduler job
echo "--- Creating Cloud Scheduler job ---"
gcloud scheduler jobs create http "$JOB_NAME" \
  --location="$SCHEDULER_LOCATION" \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Jerusalem" \
  --uri="$WEBHOOK_URL" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body="{\"scheduler_secret\":\"$SCHEDULER_SECRET\"}" \
  --description="Daily permit deadline check - sends alerts for permits expiring in 30/14/7 days"

echo ""
echo "============================================="
echo "  CLOUD SCHEDULER SETUP COMPLETE"
echo "============================================="
echo ""
echo "Job Name: $JOB_NAME"
echo "Schedule: Daily at 9:00 AM Israel time (Asia/Jerusalem)"
echo "Webhook: $WEBHOOK_URL"
echo "Location: $SCHEDULER_LOCATION"
echo ""
echo "To test the job manually:"
echo "  gcloud scheduler jobs run $JOB_NAME --location=$SCHEDULER_LOCATION"
echo ""
echo "To view job details:"
echo "  gcloud scheduler jobs describe $JOB_NAME --location=$SCHEDULER_LOCATION"
echo ""
echo "To view job execution logs:"
echo "  gcloud scheduler jobs logs $JOB_NAME --location=$SCHEDULER_LOCATION --limit=10"
echo ""
echo "To update the schedule:"
echo "  gcloud scheduler jobs update http $JOB_NAME --location=$SCHEDULER_LOCATION --schedule='NEW_CRON_EXPRESSION'"
echo ""
