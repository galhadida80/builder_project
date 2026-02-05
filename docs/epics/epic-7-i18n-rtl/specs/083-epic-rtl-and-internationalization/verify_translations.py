#!/usr/bin/env python3
"""
Verify no missing translation keys by checking browser console for i18next warnings.
"""

import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4177"
PAGES_TO_CHECK = [
    "/login",
    "/dashboard",
    "/projects",
    "/projects/1/equipment",
    "/projects/1/materials",
    "/projects/1/meetings",
    "/projects/1/approvals",
    "/projects/1/areas",
    "/projects/1/contacts",
    "/projects/1/inspections",
    "/projects/1/rfi",
    "/audit-log",
]

missing_key_warnings = []
missing_keys = set()

async def check_page_for_missing_keys(page, url):
    """Check a page for missing translation key warnings in console."""
    print(f"\nChecking {url}...")

    # Set language to Hebrew
    await page.evaluate("() => localStorage.setItem('i18nextLng', 'he')")

    # Listen for console messages
    console_messages = []

    def on_console(msg):
        console_messages.append(msg.text)

    page.on("console", on_console)

    try:
        await page.goto(f"{BASE_URL}{url}", timeout=10000)
        await page.wait_for_timeout(2000)  # Give page time to load
    except Exception as e:
        print(f"  Error loading page: {e}")
        return

    # Check for i18next warnings
    warnings = [msg for msg in console_messages if any(
        keyword in msg.lower()
        for keyword in ['not found', 'missing', 'key', 'i18next']
    )]

    if warnings:
        print(f"  ⚠️  Found {len(warnings)} warning(s):")
        for warning in warnings:
            print(f"      {warning}")
            missing_key_warnings.append((url, warning))

            # Try to extract key name
            if 'key "' in warning:
                key = warning.split('key "')[1].split('"')[0]
                missing_keys.add(key)
    else:
        print(f"  ✓ No missing translation warnings")

async def main():
    """Main test function."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("=" * 60)
        print("Translation Key Verification - Missing Keys Check")
        print("=" * 60)
        print(f"Checking {len(PAGES_TO_CHECK)} pages for missing i18next keys...\n")

        # Check each page
        for url in PAGES_TO_CHECK:
            await check_page_for_missing_keys(page, url)

        await browser.close()

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total warnings found: {len(missing_key_warnings)}")
        print(f"Unique missing keys: {len(missing_keys)}")

        if missing_keys:
            print("\nMissing translation keys:")
            for key in sorted(missing_keys):
                print(f"  - {key}")

        print("=" * 60)

        # Return exit code based on results
        return 0 if len(missing_key_warnings) == 0 else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
