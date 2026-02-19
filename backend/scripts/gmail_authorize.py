"""
One-time OAuth 2.0 authorization for Gmail API.

Usage:
    python gmail_authorize.py
    - Opens browser for Google OAuth consent
    - Receives auth code via local server
    - Prints refresh token + client credentials

Uses the Google Cloud SDK's public OAuth client (Desktop type).
"""
import json
import sys
import webbrowser

import http.server
import urllib.parse
import urllib.request

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
]

GCLOUD_CLIENT_ID = "764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com"
GCLOUD_CLIENT_SECRET = "d-FL95Q19q7MQmFpd7hHD0Ty"

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

    print(f"\nOpening browser for authorization...")
    webbrowser.open(url)

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
    print("Waiting for callback on http://localhost:8090 ...")
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
    client_id = GCLOUD_CLIENT_ID
    client_secret = GCLOUD_CLIENT_SECRET

    if len(sys.argv) >= 3:
        client_id = sys.argv[1]
        client_secret = sys.argv[2]

    code = get_authorization_code(client_id)
    tokens = exchange_code_for_tokens(client_id, client_secret, code)

    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print("ERROR: No refresh_token in response.")
        print(f"Response: {json.dumps(tokens, indent=2)}")
        sys.exit(1)

    print("\n=== SUCCESS ===")
    print(f"GMAIL_CLIENT_ID={client_id}")
    print(f"GMAIL_CLIENT_SECRET={client_secret}")
    print(f"GMAIL_REFRESH_TOKEN={refresh_token}")


if __name__ == "__main__":
    main()
