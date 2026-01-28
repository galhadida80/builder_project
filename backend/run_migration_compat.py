#!/usr/bin/env python3
"""Run migration with Python 3.9 compatibility workaround."""
from __future__ import annotations
import sys
import os
import subprocess

# Try to use Python 3.11 if available
python_paths = [
    '/usr/local/bin/python3.11',
    '/usr/local/bin/python3.13',
    '/usr/bin/python3',
]

for python_path in python_paths:
    if os.path.exists(python_path):
        print(f"Attempting to use: {python_path}")
        result = subprocess.run(
            [python_path, '--version'],
            capture_output=True,
            text=True
        )
        print(f"Version: {result.stdout.strip()}")

        # If this is Python 3.10+, use it for the migration
        version_output = result.stdout
        if '3.10' in version_output or '3.11' in version_output or '3.12' in version_output or '3.13' in version_output:
            print(f"Using {python_path} to run migration...")

            # Set environment variables
            env = os.environ.copy()
            env['DATABASE_URL'] = 'postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db'
            env['DATABASE_URL_SYNC'] = 'postgresql://postgres:postgres@localhost:5432/builder_db'
            env['DEBUG'] = 'true'

            # Run the migration script with the correct Python version
            result = subprocess.run(
                [python_path, 'run_migration.py'],
                env=env,
                capture_output=True,
                text=True
            )

            print(result.stdout)
            if result.stderr:
                print(result.stderr, file=sys.stderr)

            sys.exit(result.returncode)

print("No suitable Python version found (3.10+)")
sys.exit(1)
