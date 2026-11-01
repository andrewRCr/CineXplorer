# Completion: Upstream Fix for django-zoho-zeptomail HTML Rendering

**Completed**: 2026-10-31
**Branch**: `chore/zeptomail-0.0.4` (the fix itself: `fix/multipart-email-body-handling` in the fork)
**Category**: Incidental
**Context**: A library bug found in CineXplorer's email sending, where plain text was merged into the HTML body;
CineXplorer carried a workaround backend until the fix reached PyPI

## Summary

The bug was fixed at its source: an upstream pull request, merged within a day in December 2024, makes
django-zoho-zeptomail send a multipart message's text and HTML as separate `textbody` and `htmlbody` fields. Once the
fix shipped in 0.0.4, CineXplorer moved to the package's own backend and deleted its workaround.

## Key Deliverables

- Upstream: `zohomail/zoho_zeptomail-django` PR #1, the repository's first contributed pull request
- `django-zoho-zeptomail >= 0.0.4`, with `EMAIL_BACKEND` on the package's `ZohoZeptoMailEmailBackend`
- The workaround backend (`apps/core/email_backend.py`) and the type stubs only it used removed
- A unit test of the configured backend's API payload at the HTTP boundary, which fails against 0.0.3

## Implementation Highlights

- 0.0.3 and 0.0.4 were compared wheel to wheel: the fix is the only library change between them
- The package backend raises on any send failure where the workaround honoured `fail_silently`; both CineXplorer send
  paths already pass `fail_silently=False`, so callers see no change
- Live check on the dev stack: a sign-up's verification email was accepted by ZeptoMail and arrived with clean HTML.
  The receiving mailbox's source view showed only an HTML part, so whether ZeptoMail builds a `text/plain`
  alternative from `textbody` stayed open; ZeptoMail documents the body as text or HTML

## Related Documentation

- Tasks: `tasks-zoho-zeptomail-upstream-fix.md`

## Follow-Up Work

- Read the delivered MIME structure from a real inbox's raw source in the production sign-up check
- The package's API call sets no timeout and prints each response to stdout; both carry over from the workaround and
  matter once email runs in production
