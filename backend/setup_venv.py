#!/usr/bin/env python3
"""Setup virtual environment with Python 3.11."""
import os
import subprocess
import sys


def main():
    python311 = '/usr/local/bin/python3.11'
    venv_path = 'venv'

    if not os.path.exists(python311):
        print(f"Python 3.11 not found at {python311}")
        return 1

    # Remove old venv if exists
    if os.path.exists(venv_path):
        print("Removing old venv...")
        subprocess.run(['rm', '-rf', venv_path])

    # Create new venv with Python 3.11
    print("Creating venv with Python 3.11...")
    result = subprocess.run([python311, '-m', 'venv', venv_path])
    if result.returncode != 0:
        print("Failed to create venv")
        return 1

    # Install requirements
    pip_path = os.path.join(venv_path, 'bin', 'pip')
    print("Installing requirements...")
    result = subprocess.run([pip_path, 'install', '--quiet', '-r', 'requirements.txt'])
    if result.returncode != 0:
        print("Failed to install requirements")
        return 1

    print("✓ Virtual environment created with Python 3.11")
    print("✓ Requirements installed")
    return 0

if __name__ == '__main__':
    sys.exit(main())
