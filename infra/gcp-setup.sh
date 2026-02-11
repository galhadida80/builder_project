#!/bin/bash
set -euo pipefail

PROJECT_ID="builderops-poc-il"
REGION="me-west1"
GITHUB_REPO="galhadida80/builder_project"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
WIF_POOL="github-pool"
WIF_PROVIDER="github-provider"
AR_REPO="builderops"
DB_INSTANCE="builderops-db"
DB_NAME="builderops"
DB_PASSWORD="$(openssl rand -base64 24)"
GCS_FILES_BUCKET="builderops-il-files-2026"
SECRET_KEY="$(openssl rand -base64 48)"

echo "=== BuilderOps GCP Setup ==="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# 1. Create project (or use existing)
echo "--- Step 1: Create/select project ---"
gcloud projects describe "$PROJECT_ID" 2>/dev/null || gcloud projects create "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# Link billing (manual step - will prompt if needed)
echo ""
echo ">>> IMPORTANT: Make sure billing is enabled for project $PROJECT_ID"
echo ">>> Go to: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
echo ">>> Press ENTER when billing is enabled..."
read -r

# 2. Enable APIs (only what we need - no waste)
echo "--- Step 2: Enable APIs ---"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com

# 3. Create Artifact Registry
echo "--- Step 3: Create Artifact Registry ---"
gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" 2>/dev/null || \
gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="BuilderOps Docker images"

# 4. Create Cloud SQL (cheapest: db-f1-micro)
echo "--- Step 4: Create Cloud SQL PostgreSQL ---"
gcloud sql instances describe "$DB_INSTANCE" 2>/dev/null || \
gcloud sql instances create "$DB_INSTANCE" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-size=10GB \
  --storage-type=HDD \
  --no-backup \
  --no-assign-ip \
  --network=default 2>/dev/null || \
gcloud sql instances create "$DB_INSTANCE" \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region="$REGION" \
  --storage-size=10GB \
  --storage-type=HDD \
  --no-backup

echo "Creating database and setting password..."
gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE" 2>/dev/null || true
gcloud sql users set-password postgres --instance="$DB_INSTANCE" --password="$DB_PASSWORD"

SQL_CONNECTION=$(gcloud sql instances describe "$DB_INSTANCE" --format='value(connectionName)')
echo "Cloud SQL connection: $SQL_CONNECTION"

# 5. Create GCS bucket for file uploads
echo "--- Step 5: Create GCS bucket for files ---"
gsutil ls "gs://$GCS_FILES_BUCKET" 2>/dev/null || \
gsutil mb -l "$REGION" "gs://$GCS_FILES_BUCKET"

# 6. Create service account for GitHub Actions
echo "--- Step 6: Create service account ---"
gcloud iam service-accounts describe "$SA_EMAIL" 2>/dev/null || \
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="GitHub Actions CD"

# Grant minimal roles
for ROLE in roles/run.admin roles/storage.admin roles/artifactregistry.writer roles/cloudsql.client roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --quiet
done

# 7. Set up Workload Identity Federation (keyless auth from GitHub Actions)
echo "--- Step 7: Setup Workload Identity Federation ---"
gcloud iam workload-identity-pools describe "$WIF_POOL" \
  --location="global" 2>/dev/null || \
gcloud iam workload-identity-pools create "$WIF_POOL" \
  --location="global" \
  --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
  --workload-identity-pool="$WIF_POOL" \
  --location="global" 2>/dev/null || \
gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
  --workload-identity-pool="$WIF_POOL" \
  --location="global" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$GITHUB_REPO'"

# Allow GitHub repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$WIF_POOL/attribute.repository/$GITHUB_REPO"

WIF_PROVIDER_FULL="projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/$WIF_POOL/providers/$WIF_PROVIDER"

# 8. Print summary
echo ""
echo "============================================="
echo "  GCP SETUP COMPLETE"
echo "============================================="
echo ""
echo "Add these GitHub Secrets to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "GCP_WIF_PROVIDER=$WIF_PROVIDER_FULL"
echo "GCP_SA_EMAIL=$SA_EMAIL"
echo "CLOUD_SQL_CONNECTION=$SQL_CONNECTION"
echo "DATABASE_URL=postgresql+asyncpg://postgres:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${SQL_CONNECTION}"
echo "DATABASE_URL_SYNC=postgresql://postgres:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${SQL_CONNECTION}"
echo "GCS_BUCKET_NAME=$GCS_FILES_BUCKET"
echo "SECRET_KEY=$SECRET_KEY"
echo "CORS_ORIGINS=https://builderops-frontend-HASH-${REGION}.a.run.app"
echo "GEMINI_API_KEY=(your gemini key)"
echo ""
echo "DB Password (save this!): $DB_PASSWORD"
echo ""
echo ">>> After adding secrets, push to main to trigger deployment"
echo ">>> Frontend URL will be shown after first deploy"
