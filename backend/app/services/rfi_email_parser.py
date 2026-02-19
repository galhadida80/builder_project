import base64
import re
from dataclasses import dataclass
from email.utils import parseaddr
from typing import Optional

PLUS_TAG_PATTERN = re.compile(r'\+rfi-(.+)-(\d{5})@', re.IGNORECASE)


@dataclass
class ParsedEmail:
    message_id: str
    thread_id: str
    from_email: str
    from_name: str
    to_email: str
    subject: str
    body_text: str
    body_html: str
    in_reply_to: Optional[str]
    references: Optional[str]
    rfi_number: Optional[str]
    plus_tag_project_code: Optional[str]
    plus_tag_seq: Optional[str]
    attachments: list[dict]
    received_at: str


class RFIEmailParser:
    RFI_NUMBER_PATTERN = re.compile(r'\[?(RFI-\d{4}-\d{5})\]?', re.IGNORECASE)
    QUOTE_PATTERNS = [
        r'^>.*$',
        r'^On .+ wrote:$',
        r'^-{3,}.*Original Message.*-{3,}$',
        r'^_{10,}$',
        r'^From:.*$',
        r'^Sent:.*$',
        r'^To:.*$',
        r'^Subject:.*$',
    ]

    def parse_gmail_message(self, gmail_message: dict) -> ParsedEmail:
        headers = self._extract_headers(gmail_message)

        from_name, from_email = parseaddr(headers.get('from', ''))
        _, to_email = parseaddr(headers.get('to', ''))
        subject = headers.get('subject', '')

        rfi_number = self._extract_rfi_number(headers, subject)
        plus_project_code, plus_seq = self._extract_plus_tag(headers)
        body_text, body_html, attachments = self._extract_body_and_attachments(
            gmail_message['payload'],
            gmail_message['id']
        )

        return ParsedEmail(
            message_id=gmail_message['id'],
            thread_id=gmail_message['threadId'],
            from_email=from_email.lower(),
            from_name=from_name,
            to_email=to_email.lower(),
            subject=subject,
            body_text=body_text,
            body_html=body_html,
            in_reply_to=headers.get('in-reply-to'),
            references=headers.get('references'),
            rfi_number=rfi_number,
            plus_tag_project_code=plus_project_code,
            plus_tag_seq=plus_seq,
            attachments=attachments,
            received_at=headers.get('date', '')
        )

    def _extract_headers(self, gmail_message: dict) -> dict:
        headers = {}
        for header in gmail_message.get('payload', {}).get('headers', []):
            headers[header['name'].lower()] = header['value']
        return headers

    def _extract_rfi_number(self, headers: dict, subject: str) -> Optional[str]:
        if 'x-rfi-number' in headers:
            return headers['x-rfi-number'].upper()

        match = self.RFI_NUMBER_PATTERN.search(subject)
        if match:
            return match.group(1).upper()

        return None

    def _extract_plus_tag(self, headers: dict) -> tuple[Optional[str], Optional[str]]:
        to_header = headers.get('to', '')
        plus_match = PLUS_TAG_PATTERN.search(to_header)
        if plus_match:
            return plus_match.group(1).upper(), plus_match.group(2)
        return None, None

    def _extract_body_and_attachments(
        self,
        payload: dict,
        message_id: str
    ) -> tuple[str, str, list[dict]]:
        body_text = ''
        body_html = ''
        attachments = []

        if 'parts' in payload:
            for part in payload['parts']:
                mime_type = part.get('mimeType', '')
                filename = part.get('filename', '')

                if mime_type == 'text/plain' and not filename:
                    data = part.get('body', {}).get('data')
                    if data:
                        body_text = base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')

                elif mime_type == 'text/html' and not filename:
                    data = part.get('body', {}).get('data')
                    if data:
                        body_html = base64.urlsafe_b64decode(data).decode('utf-8', errors='replace')

                elif filename:
                    attachments.append({
                        'filename': filename,
                        'mime_type': mime_type,
                        'size': part.get('body', {}).get('size', 0),
                        'attachment_id': part.get('body', {}).get('attachmentId'),
                        'message_id': message_id
                    })

                elif 'parts' in part:
                    sub_text, sub_html, sub_attachments = self._extract_body_and_attachments(
                        part, message_id
                    )
                    body_text = body_text or sub_text
                    body_html = body_html or sub_html
                    attachments.extend(sub_attachments)

        elif 'body' in payload and 'data' in payload['body']:
            data = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='replace')
            if payload.get('mimeType') == 'text/html':
                body_html = data
            else:
                body_text = data

        return body_text, body_html, attachments

    def is_reply(self, parsed_email: ParsedEmail) -> bool:
        return bool(parsed_email.in_reply_to or parsed_email.rfi_number)

    def extract_reply_content(self, body_text: str) -> str:
        if not body_text:
            return ''

        lines = body_text.split('\n')
        reply_lines = []
        in_quote = False

        for line in lines:
            stripped = line.strip()

            if stripped.startswith('>'):
                in_quote = True
                continue

            if any(re.match(pattern, stripped, re.IGNORECASE) for pattern in self.QUOTE_PATTERNS[1:]):
                break

            if in_quote and not stripped:
                continue

            in_quote = False
            reply_lines.append(line)

        result = '\n'.join(reply_lines).strip()

        while '\n\n\n' in result:
            result = result.replace('\n\n\n', '\n\n')

        return result

    def clean_html_for_display(self, html: str) -> str:
        if not html:
            return ''

        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)

        return html
