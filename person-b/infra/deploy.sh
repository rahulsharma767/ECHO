#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-echo-person-b}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/echo/${SERVICE}:latest"

gcloud config set project "${PROJECT_ID}"
gcloud builds submit --tag "${IMAGE}" .
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars ECHO_DEMO_MODE=false,GOOGLE_CLOUD_PROJECT="${PROJECT_ID}",GOOGLE_CLOUD_LOCATION="${REGION}"
