"""
Worker tasks module.

This module contains Celery tasks for background processing.
Task implementations will be added in phase 3.
"""
from app.worker.tasks import document_processing

__all__ = ["document_processing"]
