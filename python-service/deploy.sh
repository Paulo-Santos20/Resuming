#!/bin/bash
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-resuming}"
SERVICE_NAME="resuming-python"
REGION="us-central1"
REPO="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy"
IMAGE="${REPO}/${SERVICE_NAME}:latest"

echo "==> Building Docker image..."
docker build -t ${IMAGE} -f python-service/Dockerfile python-service/

echo "==> Pushing to Artifact Registry..."
docker push ${IMAGE}

echo "==> Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE} \
  --platform managed \
  --region ${REGION} \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --allow-unauthenticated \
  --set-env-vars "FIREBASE_ADMIN_CLIENT_EMAIL=${FIREBASE_ADMIN_CLIENT_EMAIL}" \
  --set-env-vars "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --set-secrets "GROQ_API_KEY=groq-api-key:latest" \
  --set-secrets "DEEPSEEK_API_KEY=deepseek-api-key:latest" \
  --set-secrets "FIREBASE_ADMIN_PRIVATE_KEY=firebase-admin-private-key:latest"

echo "==> Deploy complete!"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)')
echo "================================================"
echo "Service URL: ${SERVICE_URL}"
echo "================================================"
echo ""
echo "Add this to Vercel Environment Variables:"
echo "  CLOUD_RUN_URL=${SERVICE_URL}"
