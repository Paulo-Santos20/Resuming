#!/bin/bash
set -e

PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-resume-react}"
SERVICE_NAME="resume-react-python"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "==> Building Docker image..."
docker build -t $IMAGE_NAME ./python-service

echo "==> Pushing to Google Container Registry..."
docker push $IMAGE_NAME

echo "==> Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --allow-unauthenticated \
  --no-cpu-throttling

echo "==> Deploy complete!"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format='value(status.url)')
echo "Service URL: $SERVICE_URL"
echo "Set CLOUD_RUN_URL=$SERVICE_URL in your .env file"
