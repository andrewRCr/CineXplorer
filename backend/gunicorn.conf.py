"""HTTP worker configuration for the backend behind its reverse proxy."""

import os

bind = "0.0.0.0:8000"
worker_class = "gthread"
workers = int(os.environ.get("GUNICORN_WORKERS", "2"))
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
timeout = 60
# Django request middleware logs sanitized requests with correlation IDs.
accesslog = None
