"""
One-time OAuth 2.0 authorization for builderops26@gmail.com.

Usage:
    1. Create an OAuth 2.0 Client ID (Desktop app) in GCP Console
    2. Run: python gmail_authorize.py --client-id YOUR_ID --client-secret YOUR_SECRET
    3. Authorize in the browser
    4. Copy the printed refresh_token and store as GMAIL_REFRESH_TOKEN secret

Required scopes: gmail.send, gmail.readonly, gmail.modify
"""
import argparse
import json
import sys

import urllib.parse
import http.server
import urllib.request

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

REDIRECT_URI = "http://localhost:8090"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"


def get_authorization_code(client_id: str) -> str:
    params = urllib.parse.urlencode({
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    })
    url = f"{AUTH_URL}?{params}"

    print(f"\nOpen this URL in your browser:\n\n{url}\n")

    code = None

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            nonlocal code
            query = urllib.parse.urlparse(self.path).query
            qs = urllib.parse.parse_qs(query)
            code = qs.get("code", [None])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>Authorization complete. You can close this tab.</h1>")

        def log_message(self, format, *args):
            pass

    server = http.server.HTTPServer(("localhost", 8090), Handler)
    print("Waiting for authorization callback on http://localhost:8090 ...")
    server.handle_request()

    if not code:
        print("ERROR: No authorization code received.")
        sys.exit(1)

    return code


def exchange_code_for_tokens(client_id: str, client_secret: str, code: str) -> dict:
    data = urllib.parse.urlencode({
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode()

    req = urllib.request.Request(TOKEN_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main():
    parser = argparse.ArgumentParser(description="Gmail OAuth 2.0 authorization")
    parser.add_argument("--client-id", required=True, help="OAuth 2.0 Client ID")
    parser.add_argument("--client-secret", required=True, help="OAuth 2.0 Client Secret")
    args = parser.parse_args()

    code = get_authorization_code(args.client_id)
    tokens = exchange_code_for_tokens(args.client_id, args.client_secret, code)

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print("ERROR: No refresh_token in response. Did you use prompt=consent?")
        print(f"Response: {json.dumps(tokens, indent=2)}")
        sys.exit(1)

    print("\n=== SUCCESS ===")
    print(f"Refresh Token: {refresh_token}")
    print("\nStore this as GMAIL_REFRESH_TOKEN in GitHub Secrets and .env")


if __name__ == "__main__":
    main()
