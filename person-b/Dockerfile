FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
ENV ECHO_DEMO_MODE=false

CMD exec uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT}
