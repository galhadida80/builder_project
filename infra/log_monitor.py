"""
Cloud Run Log Monitor — parses error logs from stdin and creates GitHub Issues.

Usage:
    gcloud logging read '...' --format=json | python infra/log_monitor.py
"""
import hashlib
import json
import os
import subprocess
import sys


FINGERPRINT_PREFIX = "log-fp:"
LABELS = ["bug", "cloud-run"]
MAX_BODY_LENGTH = 60000


def parse_log_entries(raw):
    entries = json.loads(raw) if raw.strip() else []
    errors = []
    for entry in entries:
        text = ""
        payload = entry.get("textPayload", "")
        json_payload = entry.get("jsonPayload", {})
        if payload:
            text = payload
        elif json_payload:
            text = json_payload.get("message", "") or json_payload.get("stack_trace", "") or json.dumps(json_payload)

        if not text.strip():
            continue

        errors.append({
            "text": text.strip(),
            "timestamp": entry.get("timestamp", ""),
            "severity": entry.get("severity", "ERROR"),
            "revision": entry.get("resource", {}).get("labels", {}).get("revision_name", ""),
            "service": entry.get("resource", {}).get("labels", {}).get("service_name", ""),
        })
    return errors


def compute_fingerprint(error_text):
    lines = error_text.strip().splitlines()
    key_parts = []
    for line in reversed(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith("File ") and not stripped.startswith("at "):
            key_parts.append(stripped)
            break
    if not key_parts:
        key_parts.append(lines[0].strip() if lines else "unknown")
    fingerprint = hashlib.sha256("|".join(key_parts).encode()).hexdigest()[:16]
    return fingerprint


def group_errors(errors):
    groups = {}
    for error in errors:
        fp = compute_fingerprint(error["text"])
        if fp not in groups:
            groups[fp] = {
                "fingerprint": fp,
                "sample": error,
                "count": 0,
                "timestamps": [],
            }
        groups[fp]["count"] += 1
        groups[fp]["timestamps"].append(error["timestamp"])
    return groups


def issue_exists(fingerprint):
    label = f"{FINGERPRINT_PREFIX}{fingerprint}"
    result = subprocess.run(
        ["gh", "issue", "list", "--label", label, "--state", "all", "--limit", "1", "--json", "number"],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"Warning: gh issue list failed: {result.stderr}", file=sys.stderr)
        return False
    issues = json.loads(result.stdout) if result.stdout.strip() else []
    return len(issues) > 0


def create_issue(group):
    fp = group["fingerprint"]
    sample = group["sample"]
    error_text = sample["text"]

    first_line = error_text.strip().splitlines()[-1].strip()
    title = f"[Cloud Run Error] {first_line[:120]}"

    body_error = error_text[:MAX_BODY_LENGTH]
    body = (
        f"## Cloud Run Error\n\n"
        f"**Service:** `{sample['service']}`\n"
        f"**Revision:** `{sample['revision']}`\n"
        f"**Severity:** {sample['severity']}\n"
        f"**Occurrences (last 6h):** {group['count']}\n"
        f"**First seen:** {min(group['timestamps'])}\n"
        f"**Last seen:** {max(group['timestamps'])}\n\n"
        f"## Error Details\n\n"
        f"```\n{body_error}\n```\n\n"
        f"---\n"
        f"*Auto-created by log-monitor workflow. Fingerprint: `{fp}`*"
    )

    fp_label = f"{FINGERPRINT_PREFIX}{fp}"
    all_labels = LABELS + [fp_label]

    for label in all_labels:
        subprocess.run(
            ["gh", "label", "create", label, "--force", "--description", "Auto-created by log monitor"],
            capture_output=True, text=True,
        )

    result = subprocess.run(
        ["gh", "issue", "create", "--title", title, "--body", body] + [item for l in all_labels for item in ["--label", l]],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"Failed to create issue for {fp}: {result.stderr}", file=sys.stderr)
        return None

    issue_url = result.stdout.strip()
    print(f"Created issue: {issue_url}")
    return issue_url


def main():
    raw = sys.stdin.read()
    errors = parse_log_entries(raw)

    if not errors:
        print("No error logs found in the last 6 hours.")
        return

    print(f"Found {len(errors)} error log entries.")
    groups = group_errors(errors)
    print(f"Grouped into {len(groups)} unique errors.")

    created = 0
    skipped = 0
    for fp, group in groups.items():
        if issue_exists(fp):
            print(f"Issue already exists for fingerprint {fp}, skipping.")
            skipped += 1
            continue
        if create_issue(group):
            created += 1

    print(f"Done. Created {created} new issues, skipped {skipped} duplicates.")


if __name__ == "__main__":
    main()
