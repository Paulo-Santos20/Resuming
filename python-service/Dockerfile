FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir \
    fastapi==0.115.6 \
    uvicorn==0.34.0 \
    firebase-admin==6.6.0 \
    python-dotenv==1.0.1 \
    google-genai==1.8.0 \
    weasyprint==63.1 \
    Pillow==11.1.0 \
    pydantic==2.10.4 \
    python-multipart==0.0.20 \
    google-cloud-secret-manager==2.21.0 \
    groq==0.15.0 \
    openai==1.68.0 \
    PyMuPDF==1.25.4 \
    && pip install --no-cache-dir --no-deps \
    paddlepaddle==3.0.0b2 \
    paddleocr==2.9.1

COPY . .

ENV PORT=8080

CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
