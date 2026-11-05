"""The client configuration surface used from django-zoho-zeptomail 0.0.4."""

class SendEmail:
    zeptomail_domain: str
    headers_default: dict[str, str]

    def __init__(self, zeptomail_api_key: str, zeptomail_domain: str = ...) -> None: ...
    def get_sendmail_url(self, zeptomail_url: str) -> str: ...
