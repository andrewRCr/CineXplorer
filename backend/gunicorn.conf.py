"""HTTP worker configuration for the backend behind its reverse proxy."""

import logging
import os

bind = "0.0.0.0:8000"
worker_class = "gthread"
workers = int(os.environ.get("GUNICORN_WORKERS", "2"))
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
timeout = 60
# Django request middleware logs sanitized requests with correlation IDs.
accesslog = None


class _WorkerErrorTargetFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        args = record.args
        # Gunicorn supplies the raw target as the last argument in both error messages.
        if (
            record.msg in ("Error handling request %s %s", "Error handling request %s")
            and isinstance(args, tuple)
            and args
            and isinstance(args[-1], str)
        ):
            record.args = (*args[:-1], args[-1].partition("?")[0])
        return True


def post_worker_init(_worker: object) -> None:
    """Omit request queries from worker errors before Gunicorn's handlers see them."""
    logging.getLogger("gunicorn.error").addFilter(_WorkerErrorTargetFilter())
