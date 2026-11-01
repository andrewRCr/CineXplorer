# Upstream Bug Fix: django-zoho-zeptomail HTML Rendering

**Type:** Open source contribution
**Repository:** <https://github.com/zohomail/zoho_zeptomail-django>
**Branch:** `fix/multipart-email-body-handling`
**Status:** PR merged, awaiting PyPI release
**PR:** <https://github.com/zohomail/zoho_zeptomail-django/pull/1>
**Created:** 2024-12-22
**Fork:** `~/dev/zoho_zeptomail-django`

## Summary

Contribute a fix for the HTML email rendering bug we discovered and worked around in CineXplorer.
The upstream library concatenates plaintext and HTML into a single `htmlbody` field instead of
setting `textbody` and `htmlbody` separately per the ZeptoMail API specification.

**Our workaround:** `backend/apps/core/email_backend.py` (FixedZohoZeptoMailEmailBackend)
**Goal:** Fix the bug at source so everyone benefits and we can eventually remove our workaround.

---

## Phase 1: Setup & Research ✅

- [x] 1.1 Fork zoho_zeptomail-django on GitHub
    - Forked to `andrewRCr/zoho_zeptomail-django`
    - MIT license confirmed

- [x] 1.2 Clone fork locally
    - Cloned to `~/dev/zoho_zeptomail-django`
    - Upstream remote set automatically by `gh repo clone`

- [x] 1.3 Examine existing codebase structure
    - [x] Buggy code: `zoho_zeptomail/backend/message.py` (`__set_body()` method)
    - [x] No tests exist in repo
    - [x] No CONTRIBUTING.md or PR templates
    - [x] Minimal structure confirmed (single commit repo)

- [x] 1.4 Create fix branch
    - Created `fix/multipart-email-body-handling`

---

## Phase 2: Implement Fix ✅

- [x] 2.1 Locate and understand the bug
    - Found `__set_body()` in `zoho_zeptomail/backend/message.py:78-112`
    - Also found `set_body()` in `zoho_zeptomail/emails/__init__.py:28-32` (only sets htmlbody)
    - Confirmed: concatenates plain + HTML into single htmlbody field

- [x] 2.2 Implement the fix
    - Added `set_textbody()` method to `SendEmail` class
    - Added `set_htmlbody()` method to `SendEmail` class
    - Modified `__set_body()` to call these separately based on content type
    - Preserved `set_body()` for backwards compatibility (marked deprecated)

- [x] 2.3 Test locally
    - Created `test_fix.py` and `test_integration.py` (deleted after verification)
    - Verified: plain text → textbody only
    - Verified: HTML only → htmlbody only
    - Verified: multipart → both textbody AND htmlbody separately
    - Commit: `3a1491c Fix multipart email handling - separate textbody and htmlbody`

---

## Phase 3: Create PR ✅

- [x] 3.1 Write clear commit message
- [x] 3.2 Push branch to fork
- [x] 3.3 Create pull request
    - PR #1: <https://github.com/zohomail/zoho_zeptomail-django/pull/1>
    - First PR ever on this repo
    - Includes problem statement, root cause, solution, ZeptoMail API references
- [x] 3.4 Submit and wait
    - Merged 2024-12-23 (< 24 hour turnaround - surprisingly responsive!)

---

## Phase 4: Cleanup (after PR merged or abandoned)

**Unblocked:** 0.0.4 reached PyPI on 2026-09-28. Its only library change from 0.0.3 is the fix from PR #1
(wheel contents compared, 2026-10-31).

- [x] 4.1 If merged: update CineXplorer
    - Update django-zoho-zeptomail dependency version
    - Remove our workaround (`backend/apps/core/email_backend.py`)
    - Update `settings.py` to use standard backend
    - Test email sending still works
    - Done on `chore/zeptomail-0.0.4`: `>= 0.0.4`, `EMAIL_BACKEND` on the package's `ZohoZeptoMailEmailBackend`, the
      workaround and its type stubs (`backend/stubs/zoho_zeptomail/`) removed
    - New `apps/core/tests/unit/test_zeptomail_backend.py` checks the configured backend's API payload carries
      `textbody` and `htmlbody` separately; it fails against 0.0.3 (`KeyError: 'textbody'`). Backend suite 804 passed
    - Live: a dev sign-up's verification email was accepted by ZeptoMail and arrived with clean HTML (no plain text
      prepended). Whether ZeptoMail also delivers a `text/plain` part was not settled: the receiving mailbox's source
      view showed HTML only, and ZeptoMail documents the body as text or HTML

- [ ] 4.2 Archive this task list
    - Move to `.arc/reference/archive/` with outcome notes

---

## Reference

**ZeptoMail API spec:** <https://www.zoho.com/zeptomail/help/api/email-sending.html>

- `textbody`: Plain text content
- `htmlbody`: HTML content
- Both can be sent together for multipart emails

**Our working fix:** `backend/apps/core/email_backend.py:134-146`

```python
# Set body based on content subtype
if email.content_subtype == "plain":
    email_data["textbody"] = email.body
elif email.content_subtype == "html":
    email_data["htmlbody"] = email.body

# Handle alternatives (EmailMultiAlternatives adds HTML as alternative)
if isinstance(email, EmailMultiAlternatives):
    for content, mime_type in email.alternatives:
        if mime_type == "text/html":
            email_data["htmlbody"] = content
        elif mime_type == "text/plain":
            email_data["textbody"] = content
```

---

**Estimated effort:** 1-2 hours
**Risk if not merged:** Minimal - we already have working workaround
**Upside if merged:** Resume bullet point, community benefit, can remove workaround
