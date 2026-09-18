FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000
# Shell form (not exec array) so $PORT is expanded — Railway and similar
# platforms inject PORT at runtime; falls back to 8000 when unset (e.g. plain
# `docker run` or docker-compose).
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
