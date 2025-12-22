# Upstream Bug Fix: django-zoho-zeptomail HTML Rendering

**Type:** Open source contribution
**Repository:** <https://github.com/zohomail/zoho_zeptomail-django>
**Branch:** `fix/multipart-email-body-handling`
**Status:** Not started
**Created:** 2024-12-22

## Summary

Contribute a fix for the HTML email rendering bug we discovered and worked around in CineXplorer.
The upstream library concatenates plaintext and HTML into a single `htmlbody` field instead of
setting `textbody` and `htmlbody` separately per the ZeptoMail API specification.

**Our workaround:** `backend/apps/core/email_backend.py` (FixedZohoZeptoMailEmailBackend)
**Goal:** Fix the bug at source so everyone benefits and we can eventually remove our workaround.

---

## Phase 1: Setup & Research

- [ ] 1.1 Fork zoho_zeptomail-django on GitHub
    - Fork to personal GitHub account
    - Note: Repo has MIT license, contributions welcome

- [ ] 1.2 Clone fork locally
    - Clone to `~/dev/` (sibling to CineXplorer)
    - Set upstream remote: `git remote add upstream https://github.com/zohomail/zoho_zeptomail-django.git`

- [ ] 1.3 Examine existing codebase structure
    - [ ] Identify the buggy code location (likely `backend/message.py` or similar)
    - [ ] Check for existing test structure
    - [ ] Check for contribution guidelines (CONTRIBUTING.md, PR templates)
    - [ ] Note: Single commit repo - may have minimal structure

- [ ] 1.4 Create fix branch
    - `git checkout -b fix/multipart-email-body-handling`

---

## Phase 2: Implement Fix

- [ ] 2.1 Locate and understand the bug
    - Find `__set_body()` method (or equivalent)
    - Confirm it matches the behavior we diagnosed:
        - Currently: concatenates `body` + HTML alternative into `htmlbody`
        - Should: set `textbody` for plain, `htmlbody` for HTML separately

- [ ] 2.2 Implement the fix
    - Modify the body-setting logic to:
        - Set `textbody` when content_subtype is "plain"
        - Set `htmlbody` when content_subtype is "html"
        - Handle EmailMultiAlternatives correctly (text body + HTML alternative)
    - Reference our working implementation in `email_backend.py` lines 134-146

- [ ] 2.3 Test locally (if test infrastructure exists)
    - If tests exist: run them, add test for multipart handling
    - If no tests: manual verification with Django shell

---

## Phase 3: Create PR

- [ ] 3.1 Write clear commit message
    - Describe the bug (what happens now)
    - Describe the fix (what should happen)
    - Reference ZeptoMail API docs if helpful

- [ ] 3.2 Push branch to fork
    - `git push -u origin fix/multipart-email-body-handling`

- [ ] 3.3 Create pull request
    - Title: "Fix multipart email handling - separate textbody and htmlbody"
    - Description should include:
        - [ ] Problem statement (HTML emails render as plaintext)
        - [ ] Root cause (body concatenation into single field)
        - [ ] Solution (set fields separately per API spec)
        - [ ] Testing done
        - [ ] Link to ZeptoMail API docs showing correct field usage

- [ ] 3.4 Submit and wait
    - Note: Repo appears minimally maintained - response may take time or never come
    - Set calendar reminder to check in 2 weeks

---

## Phase 4: Cleanup (after PR merged or abandoned)

- [ ] 4.1 If merged: update CineXplorer
    - Update django-zoho-zeptomail dependency version
    - Remove our workaround (`backend/apps/core/email_backend.py`)
    - Update `settings.py` to use standard backend
    - Test email sending still works

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
