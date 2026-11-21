# PRD: Privacy Policy and Terms of Service Pages

**Type:** Technical
**Form:** detailed · PRD
**Class:** Heavy
**Status:** In Progress
**Created:** 2026-11-19
**Local verification completed:** 2026-11-20

---

## 1. Introduction/Overview

CineXplorer signs people in with Google and GitHub. Google's Cloud console won't move the OAuth app from Testing to
In production until its Branding page carries a homepage link, a privacy policy link and a terms of service link
("These links are required for all external production apps"). Brand verification, which puts the app's name and logo
on Google's consent screen, also requires:

- a homepage that explains why the app requests user data and links to the privacy policy;
- a privacy policy on the homepage's domain, at a URL other than the homepage's, that describes how the app handles
  Google user data;
- the privacy link in the app's interface as well as on the homepage.

The site has none of it. `App` (`frontend/src/App.tsx`) has no privacy or terms route; `Footer`
(`frontend/src/components/layout/Footer.tsx`) carries theme controls, the copyright line and TMDB's attribution;
signed-out Home's `HomeBand` (`frontend/src/pages/home/HomeBand.tsx`) has three points on what the app does and nothing
on sign-in data. Home already describes the app and serves `/` without a redirect.

A privacy policy and terms of service were written from the code on 2026-11-11, claiming only what the code did, and
approved by the Owner that day. They are kept outside the repository. Fixes and the film-tracking work have merged
since, so many of their sentences no longer match the code. This work brings both texts up to date with the code,
publishes them as two pages of the app, links them from every page's footer and from signed-out Home, adds Home's line
on why the app asks for sign-in data, and adds a notice where accounts are made. Appendix A and Appendix B carry the two
final texts; the pages publish them word for word.

**Goal:** a signed-out visitor, and Google's reviewers, can reach a privacy policy and terms of service that say what
the site actually does, from every page and from Home, so the Owner can publish the OAuth app.

## 2. Goals

1. `/privacy` and `/terms` serve the texts of Appendix A and Appendix B to any visitor, signed in or not.
2. Every page the app renders links both texts from its footer; signed-out Home says why the app asks for sign-in data
   and links the policy.
3. Every sentence of both texts that states what the site does says what the code does when the pages go live.
4. The texts stay true afterwards: a change that would make a sentence untrue updates the texts with it.
5. The Owner can enter the homepage, privacy and terms links on Google's Branding page and publish the app.

## 3. User Stories

- As a visitor deciding whether to sign in with Google, I want to read what CineXplorer receives and keeps, so I can
  decide with the facts.
- As a visitor creating an account, I want to see the terms I'm agreeing to and the policy that applies, linked where I
  create it.
- As a signed-in user, I want to find the policy from any page, so I can see what's kept about me and how to ask for
  it to be deleted.
- As the Owner, I want Google's console to accept the site's links, so the OAuth app leaves Testing.
- As a developer changing what the site collects, logs or shows, I want a rule that tells me to update the texts in the
  same pull request, so they don't drift.

## 4. Requirements

Every requirement is **P0**. **The pages** are the privacy policy page and the terms of service page. **Appendix A**
and **Appendix B** hold their texts in Markdown notation: `#` marks the page's `h1`, `##` an `h2`, `###` an `h3`,
`**…**` bold text, `` `…` `` a code-styled name, `[text](target)` a link, and a pipe table a table. A blank line
separates paragraphs; a line break inside a paragraph is not part of the text. `{{EFFECTIVE_DATE}}` stands for the
page's effective date (R7).

### The pages

**R1. Two routes.** `/privacy` shows the privacy policy page and `/terms` the terms of service page. Both are routes
of `App` inside `AppLayout`, outside `ProtectedRoute`, lazy-loaded like every other page, so they carry the top bar and
footer and follow the theme and light or dark mode. `ROUTES` names both paths. Signed in or not, a visitor sees the
same page. No other path redirects to them, and they redirect nowhere. Either page opens at its top, whatever the
previous page's scroll position; opened at an address with a section's fragment (`/privacy#security`), it opens at
that heading, placed as R3 says. The app keeps its own scroll handling (it sets `history.scrollRestoration` to
`manual`), so the pages position themselves once their content has rendered.

**R2. Text.** Each page renders its appendix's text word for word: the same headings at the same levels, the same
paragraphs, lists, table and links, in the same order. The page has one `h1` (the text's title) with the effective
date beneath it, `h2` sections, and `h3` for the policy's subsections. No bracketed review marker (such as `[C1]`,
`[F4]` or `[R2]`), no `[publication date]` and no `{{…}}` placeholder appears on either page.

**R3. Section ids and in-page links.** Every `h2` and `h3` carries an id made from its text: lowercase, words joined by
hyphens, punctuation dropped (for example `who-else-handles-your-data`). The policy's three links to its own sections
("Who else handles your data", "Your choices", "Security") jump to those ids, and the heading they jump to lands fully
below the sticky top bar, not under it.

**R4. Links.** Email addresses are `mailto:` links. The terms' link to the Privacy Policy opens `/privacy` inside the
app. Links to other sites (Google's API Services User Data Policy) are ordinary links to that site.

**R5. The cookie table.** The policy's cookie table has a header row and four rows. At phone width (360px) the table
scrolls sideways inside itself when it is wider than the page; the page itself never scrolls sideways.

**R6. Styling.** The pages use Chakra's primitives and the semantic tokens, as every page does: no hard-coded colors or
raw palette tokens. The text sits in one column at most 48rem wide (Chakra's `3xl` size) inside the page container,
the cookie table included; headings use the app's heading styles.

**R7. Effective dates.** Each page shows its own effective date beneath its title, written as month, day and year
("November 20, 2026"). At publication both pages carry the same date: the day the change merges to `main`, which CI
deploys to staging that day. The pull request's last commit before merging sets both dates, so a merge that slips a
day moves them. Afterwards, a change to one text sets that text's date only.

### Links into the pages

**R8. The footer.** `Footer` carries one row of two links, "Privacy Policy" (`/privacy`) and "Terms of Service"
(`/terms`), as in-app links. `BaseLayout` renders `Footer` under every page of `AppLayout` and of `AuthLayout` (sign
in, sign up, forgot password), so both links are in the app's interface everywhere.

**R9. Signed-out Home's line.** Signed-out Home shows one line under `HomeBand`'s three points:

> An account keeps your lists. If you sign in with Google or GitHub, CineXplorer receives your name, email address
> and basic profile, and uses them only for your account, never for advertising. [Privacy Policy]

"Privacy Policy" links `/privacy`. Signed-in Home (`SignedInHome`) doesn't show the line.

**R10. The sign-up notice.** "By creating an account, you agree to the Terms of Service and acknowledge the Privacy
Policy.", with "Terms of Service" linking `/terms` and "Privacy Policy" linking `/privacy`, appears:

- on `Register`, under the submit button;
- on `Login`, under the Google and GitHub buttons, since a first sign-in with either creates an account
  (`SOCIALACCOUNT_AUTO_SIGNUP`).

### Keeping the texts true

**R11. The rule.** `DEVELOPMENT-RULES.md` gains a rule, in its Code Quality Principles: a change that makes any
statement in the privacy policy or the terms untrue, or adds something they must describe (new personal data, a cookie
or browser-storage key, a logged field, a party that receives data, anything shown to other people), updates the texts
in the same pull request, with a new effective date for each text it changes, and keeps signed-out Home's line in
agreement with the policy. A change that would use personal data in a way the published policy doesn't describe, or
for a purpose it doesn't name, doesn't merge until the people whose data it uses have been told, as the policy's
"Changes to this policy" promises; where consent is required, as it always is for data received from Google under
Google's API Services User Data Policy, the new use applies only to those who give it. Its pull request says how
notice was given and consent collected. The rule names the code and the provider facts the texts describe, so that a
change there prompts a read of them. Its list covers every area Appendix C's map cites, each with its settings in
`backend/config/settings.py`:

- sign-in and accounts: the user model, the authentication app, the allauth settings and adapters, and the sign-in,
  sign-up and profile pages;
- the movie lists and their record of changes (`backend/apps/user_movie_data/`), and the pages that show them;
- the catalog: which routes need an account, the film details saved from TMDB, the session that remembers the films
  shown, and the requests to TMDB;
- cookies and browser storage;
- request and account-event logging, and error reports;
- rate limits;
- email;
- the configuration of the web server, the app server and the containers (log retention among it), the images they
  run (`frontend/Dockerfile` supplies the web server), and the deploy scripts and runbook (backups, restores and
  nightly maintenance);
- the packages the backend and frontend install (`backend/requirements/`, `frontend/package.json`), and the scripts and
  images the browser loads;
- the footer's TMDB attribution;
- requests to any other service;
- the provider facts in § 6: the server's host and region, Cloudflare's DNS-only setup and email forwarding, the backup
  bucket's access, expiry rule and location, the email provider's region, tracking and content retention, and the
  Google and GitHub settings that remove the site's access. A change to one of the site's own provider settings that
  would make a statement untrue updates the texts, in a pull request of its own, before the setting changes, though no
  code changes with it.

It names the expected additions: error tracking, analytics, embeds, and public reviews or shared lists, which also need
the terms to grant a licence for content shown to others.

**R12. The ADR.** A new ADR, _Publish the privacy policy and terms as pages of the app_, records: the two routes and
why their paths hold (Google's Branding page records them, and changing them sends the app back through brand
verification); the text written into source rather than rendered from Markdown; Home's line agreeing with the policy;
the rule in R11; and Google's requirements as its context. It names Appendix C of `prd-privacy-terms.md` as the map
from each statement to the code or setting behind it at publication. It reads `Proposed` while the work is built and
`Accepted (YYYY-MM-DD)` before the work merges.

### Verification

**R13. Unit tests.**

- Each page renders its title and effective date at its route, signed out.
- Neither page's rendered text contains a bracketed review marker, `[publication date]` or `{{`.
- The policy's three in-page links point at ids its headings carry.
- The terms' Privacy Policy link opens `/privacy`; the policy's Google link points at Google's policy page.
- The footer shows both links, each opening its page.
- Signed-out Home shows the data-use line with its Privacy Policy link; signed-in Home doesn't show it.
- `Register` and `Login` show the sign-up notice with both links.

**R14. The smoke spec.** One new spec in `frontend/e2e/`, run by CI's end-to-end smoke job and by the staging smoke
after each deploy:

- opens signed-out Home and scans it with axe (`scanPage`) after it is ready. Scrolls to its footer, follows the
  Privacy Policy link to `/privacy`, checks the title is in the viewport, and scans the page. Repeats the journey
  from Home for the Terms of Service link and `/terms`;
- at 360×800, opens `/privacy` and checks the page doesn't scroll sideways;
- on `/privacy`, follows the "Who else handles your data" link and checks the heading lands below the top bar;
- opens `/privacy#who-else-handles-your-data` directly and checks the same heading lands below the top bar.

It changes no data and needs no account, so it runs unchanged against staging.

**R15. Smoke documents.** `QUICK-REFERENCE.md`, `TECHNICAL-OVERVIEW.md`, `strategy-quality-gates.md` and
`strategy-testing-methodology.md` count the smoke specs ("eleven"); each counts the new one, and those that describe
each spec describe it. ADR-050's count stays: an accepted ADR records its own time.

### Before merge

**R16. The texts checked again.** Before the pull request merges, any code merged to `main` since this PRD that
touches a path Appendix C names is traced again, and the pull request corrects the texts and Appendix C's entries
for it, with the effective dates of R7.

## 5. Non-Goals

- **Changing what the code does to make the texts simpler.** The texts describe the code as it stands. Account
  deletion, data export, and changing an email address, username or password in the app; removing accounts that never
  verify; pruning a failed backup's local copy; shortening the two-week catalog session; stopping the `messages`
  cookie the app never shows; logging the visitor's address rather than the proxy's on account events; keeping
  search text and the full referring address out of the web server's error log; redacting admin search text from
  routine request logs; and refusing a GitHub sign-up that brings no verified primary address, which today leaves
  the pending sign-in, GitHub's token included, in the session all stay as they are, each disclosed. When one of
  them changes, the rule in R11 updates the texts with it.
- **A cookie banner.** The site sets no advertising, analytics or tracking cookies. Three of its four cookies are
  needed for it to work; the fourth, `messages`, lasts only the browser session, holds a notice of the visitor's own
  sign-up, verification or sign-in, and is to be removed by its own errand.
- **The Profile and Settings pages.** The policy no longer points at Profile; the pages themselves are other work.
- **A per-page document title.** The app sets none on any page.
- **Google's console.** Entering the links, publishing the app and submitting brand verification are the Owner's,
  after the pages are live; verifying again with the production host belongs to launch.
- **A layout check at tablet width.** The pages get the 360px check (R14); checking every page at tablet width belongs
  to the roadmap's responsive and global finish.
- **A Content Security Policy.** Its own work before launch.

## 6. Technical Considerations

- **Serving.** Caddy's catch-all (`try_files {path} /index.html` in `infrastructure/Caddyfile.prod`) already hands any
  path that isn't a file, an asset or a backend path to `index.html`, so the two routes need no serving change. The
  pages render in the browser, as Home does.
- **Layout.** `AppLayout` wraps its pages in `Container` with `pageContainerProps`, except Home. `BaseLayout` renders
  `NavBar` (sticky) and `Footer`. The top bar's height is the `layout-navbar` size token (65px); the headings' scroll
  offset (R3) uses it.
- **The footer** renders the current year; R8 adds a row and changes nothing else in it. `Footer.test.tsx` holds its
  tests.
- **Home.** `Home` renders `HomeHero`, `WhatsOn` and `HomeBand` signed out, and `SignedInHome` signed in. R9's line
  belongs inside `HomeBand`, which only signed-out Home renders.
- **Text in source.** The two page components hold the texts as JSX on Chakra's primitives: headings, paragraphs,
  lists, one table and links. No Markdown dependency is added.
- **Smoke specs.** Specs use `test` and `expect` from `./fixtures` and `scanPage` from `./axe`; `target.name` tells
  local from staging. Locally, `./fixtures`' `test` answers every catalogue request (Home's included) from the
  catalogue fixtures and blocks other hosts, so the new spec opens Home without further setup; it needs no account.
- **Facts held outside the code.** These sentences rest on provider settings, which the Owner confirmed on 2026-11-19,
  or on the providers' own help pages, rather than on code (Appendix C marks each):
    - DigitalOcean hosts the server, in San Francisco.
    - Cloudflare serves the app's hosts' DNS only, without proxying their traffic.
    - The R2 backup bucket is private, its lifecycle rule deletes backups after 30 days, and the R2 dashboard shows
      its location as Western North America (WNAM).
    - Cloudflare Email Routing forwards the contact address to the Owner's mailbox.
    - Zoho CPaaS, formerly ZeptoMail, sends from its US region. Its account keeps Zoho's defaults: open and click
      tracking off, and content retention on. Zoho's help pages put saved content at 60 days, and email logs, which
      record each email's sender, recipient, subject, time and delivery status, at 60 days too.
    - Google's linked apps page lets a user stop using Sign in with Google for an app, and GitHub's Authorized OAuth
      Apps tab, under Settings and Applications, lets a user revoke an app's access; each provider's help page says so.
- **The sending code sets no tracking flags** (`backend/apps/core/email_backend.py` posts the converted message
  without `track_opens` or `track_clicks`), so the mail agent's settings decide; turning tracking on later is a change
  R11's rule covers, as a provider setting.
- **The policy describes current logging behavior** (§ 5). The account-event logs read `REMOTE_ADDR` (`get_client_info`,
  `backend/apps/core/utils/http.py`), which behind Caddy is Caddy's own address, so they record no visitor IP; the
  request log and the rate limits derive the visitor's address from `X-Forwarded-For`, which Caddy sets to the
  connecting address, replacing any a client sends (the Caddyfile sets no `trusted_proxies`), and which the limits
  read with one trusted proxy (`NINJA_NUM_PROXIES`, `ALLAUTH_TRUSTED_PROXY_COUNT`). Caddy (2.11, the image
  `frontend/Dockerfile` names) writes no access log (the Caddyfile has no `log` directive), but its default error log
  records a request that fails at the proxy, such as one made while the backend restarts, with its full URI, its
  `Referer` and its user agent. Django admin uses `q` for searches. The app's request logger redacts `query` and
  recognized credential fields, and keeps `q`, which can contain a username or email address
  (`backend/middleware/logging.py`). Admin search redaction is a follow-up.
- **Assumed, risk accepted: Google's reviewers read the pages in a browser,** which renders the app. Home already
  relies on this. If an automated check reads the raw HTML instead, Home fails it as well, since `index.html` carries
  only the app's root element. The fallback then is static content for all three: a block in `index.html` with Home's
  description, its data-use line and the two links, and static copies of the two pages served beside the app, made at
  that point.

## 7. Design Considerations

- **The pages read as documents.** One column (R6), the title and date at the top, sections
  with the app's heading styles, and generous spacing between sections. No sidebar or table of contents.
- **The footer row** sits under the copyright line, in the footer's small muted text, with the links in the link
  style the footer already uses (`TextLink`).
- **Home's line** sits under the band's three points, in the band's body text, at the width of the band's container.
- **The sign-up notice** is small muted text, centred under the button it follows.
- The pages pass the same axe scan every journey's pages pass.

## 8. Design Decisions

- **D1: two routes of the app, `/privacy` and `/terms`** (R1), over static HTML files in `frontend/public/`, which would
  need their own styles outside the theme, have no top bar or footer to get back into the app, and gain nothing from
  rendering without JavaScript, since Home itself renders in the browser and Google's reviewers read the pages in one;
  and over Django-rendered templates, a second way of rendering pages for two pages of text. The paths are what
  Google's Branding page records. Both routes keep their address when an OAuth error query is present, a password
  session fails to renew, or an account action finishes after the visitor opens the document. _ADR:_ the new ADR (R12).
- **D2: the text written into two page components** (R2 to R6) on Chakra's primitives and the semantic tokens, over
  Markdown rendered at run time (`react-markdown` with `remark-gfm` for the table), a dependency tree of a few dozen
  packages and a mapping layer from Markdown elements to themed components for two pages that change rarely; and over
  Markdown compiled at build time by a Vite plugin, for the same reasons as a build dependency. A change to the text is
  a reviewed change to source like any other. _ADR:_ the new ADR.
- **D3: the footer links both pages on every page** (R8), since `BaseLayout` renders `Footer` under the app's pages and
  under sign in, sign up and forgot password. _ADR:_ `none`, a tactical choice.
- **D4: signed-out Home says why the app asks for sign-in data** (R9), under the band's three points, over the hero,
  whose composition is settled and where a sentence of terms would compete with the headline, and over a section of
  its own for one sentence. The band already explains what an account is for ("Track your films"). The line agrees
  with what the policy's short version says sign-in receives. The policy gives the details of GitHub's email
  response and which address the site keeps. "Basic profile" covers what differs by provider: Google's
  profile picture and language; GitHub's username, which becomes the CineXplorer username where it's available, and
  its other public profile details. "Only for your account" covers signing in and the account's own use of the name,
  such as signed-in Home's greeting. Signed-in Home doesn't need it: the visitor has already signed in, and the footer
  carries the links. _ADR:_ the new ADR.
- **D5: the effective date is the day the pages go live** (R7). CI deploys `main` to staging on merge, and staging is
  where Google's reviewers and every visitor read the pages before launch, so the date is the merge's. Launch changes
  the host, not what the texts say, so it needs no new date unless the texts change. Launch day was the alternative;
  until then, staging would show a future or placeholder date, as if no policy were in effect. Each page keeps its own
  date, both set to the merge date now, so a later change to one text dates only that text, over one shared date that
  would redate a text nobody changed. _ADR:_ `none`, a tactical choice.
- **D6: the texts are brought up to date with the code before they publish** (R2, Appendices A to C). Every sentence
  of both texts that states what the site or a provider does was traced to the end of its code path, or to the
  provider setting behind it; the rest are the Owner's commitments and legal terms, unchanged. Appendix C accounts for
  every sentence, so one without an entry shows as a gap. The changes from the texts approved on 2026-11-11, found by
  comparing them with Appendices A and B paragraph by paragraph:

    - **The short version** says the site reads the first page of addresses GitHub returns and keeps the primary,
      verified address if it appears there (allauth's GitHub login reads `/user/emails` once).
    - **Server logs.** Gunicorn's access log is off (`accesslog = None`) and Caddy keeps none, so the sentence covers
      the requests that reach the app's server, not the page's own files. The request middleware logs each request's
      method, address with movie search text and recognized credential fields redacted, the visitor's address, user
      agent, the referring page cut to its origin and path, the time and the result. Admin searches keep their search
      text in the logged address. Account events are logged on more events than signing up and signing in, with a
      username or user ID but no visitor IP (§ 6), so the sentence lists them, drops "with your IP address", and says
      the browser's identification string is logged only on some. A sentence is added for requests that fail on the
      server, which the web server's and app's error logs can record in full.
    - **Error reports.** The report carries the window size, not the screen size; a user ID only after a password
      sign-in (it's read from the stored access token); the page's address, which the server keeps without its query;
      and credential-labelled details are "removed before the report is kept", where the approved text said "filtered
      out first". The text adds that a failed request's contents, which the browser sends with the error (a failed
      sign-in's password among them), are removed by the server before the report is kept
      (`sanitize_frontend_context`). Its random ID is made once per page load, so the text calls it an ID for that
      page visit.
    - **Abuse limits.** Counts are kept by IP address, by a scrambled (SHA-256) form of an email address for allauth's
      sign-up and password-reset limits, and by account for saves. Password session renewal uses the signed-in
      session account when Django recognizes one, or the IP address otherwise. Each counted request renews the
      expiry of the sliding counts, and a save count runs to the end of its fixed window. A count ends within a
      minute to a day of the last request it counted.
    - **Your movie lists** become what the code stores: the watchlist with join times, watched and liked with their
      times, the current rating, logged viewings and reviews, and the record of changes, which Library and History
      show for the signed-in account. The operator can view tracked films, their list marks and associated dates,
      and current ratings in Django admin. Deletion previews show viewing entry IDs and the fields and times of
      tracking changes. The tracking records are deleted with the account. The film details saved from TMDB add the
      score, vote count, runtime, overview and genres (`Movie`). The short version says an account keeps this record
      beside the watchlist.
    - **Your account** drops "plus your first and last name if you give them": the sign-up form asks for none.
      A timestamp updates when the full account record is saved. Email verification is recorded on the address.
    - **Google and GitHub** add when you first and last signed in with each (`SocialAccount.date_joined` and
      `last_login`). The buttons are named as the page names them ("sign in with Google", not a quoted label the page
      doesn't show). A Google sign-up's username is made from the name or email address (`populate_username`), as is a
      GitHub sign-up's when its GitHub username is taken or invalid. Linking by address needs Google to have verified
      the address (`authenticate_by_email`). Google user data goes to the email provider when the site emails that
      address, with the username a reset email names, so "we don't share Google user data with anyone" becomes a
      statement of the providers that hold it.
      After revoking access at Google or GitHub, signing in again finds the same account (`_lookup_by_socialaccount`).
      Unlinking on CineXplorer is by request.
      GitHub keeps only the primary, verified address (`CustomSocialAccountAdapter.populate_user`), and the GitHub
      username becomes the CineXplorer username only where it's available. A GitHub sign-in with no verified
      primary address leaves its pending sign-in, token included, in the session (§ 5). The policy gives its
      last-save expiry, clearance when a subsequent callback reaches the account checks and saves the removal,
      possible retention after a cancellation or other failure, and nightly cleanup. A password removed when Google
      links an unverified account can be reset by email (allauth's reset request doesn't need a usable password).
      A sign-in with a matching verified primary address from GitHub can link to the same account. Google's page
      for removing an app is now its linked apps under Sign in with Google (§ 6).
      The linked profile is deleted with the account. Admin activity records can retain a CineXplorer username
      generated from the Google name or email address.
    - **Email** names the sender of password-reset emails and explains that password registration sends the
      verification email, its resend and the welcome email after verification. The Owner writes only about the
      service itself, such as a policy change or the site closing (the notices the policy's "Changes" section and
      the terms' § 7 promise), through the same provider.
    - **Cookies.** The section's opening names `messages` as the cookie that holds a notice the site doesn't use.
      `sessionid` is set when any visitor views movie lists, Home's included, and the films already shown
      are kept for an hour after the last page of that list. `refresh_token` lasts 14 days only with "Remember me",
      otherwise until the browser
      closes. `messages` is set on sign-up, email verification and Google or GitHub sign-in, holds a notice that can
      include the email address or username, and can't be read by page scripts.
    - **Browser storage.** The introduction says saved error reports are sent once they can be. The list adds the
      signed-in marker beside the token (`isAuthenticated`), the advanced-filter fingerprint and the reload marker, and
      says what saved error reports hold. With "Remember me", the token and the signed-in marker last until sign-out
      or, once the sign-in has run out, until the next visit, when the site finds its renewal refused and removes them;
      scroll positions are kept for up to 20 lists, with any search text; and the sign-in-in-progress marker lasts
      until the tab closes.
    - **Who else handles your data.** The `placehold.co` bullet goes (the site loads images from no host but
      TMDB's); TMDB's bullet names backdrops beside posters. Cloudflare's bullet drops "nightly" from the backups it
      stores, since a deploy takes one too. ZeptoMail is now Zoho CPaaS, and its bullet says what it keeps: a log and
      a copy of each email for 60 days (§ 6).
    - **How long we keep things.** Abuse-limit counts last up to a day after the last request they count; the change
      record is kept with the lists; backups are taken before each deploy as well as nightly (`deploy.sh`), so
      "nightly" no longer limits them; a backup that fails, at whichever step (`backup.sh` makes the dump file before
      `pg_dump` runs and removes it only after its upload), and a copy the deploy runbook makes or downloads to repair
      or restore the site stay on the server until removed by hand, and "Your choices" excepts them from its 30 days;
      email records last 60 days. The policy gives the session expiry from its last save, the access and refresh
      token lifetimes and the records nightly maintenance clears. The database's admin activity records include
      action times and can include the fields changed in an account edit. They have no scheduled expiry.
    - **Your choices.** "Your profile shows your username, email address and name" goes (`Profile` is a
      placeholder). Deletion names the change record and the admin activity records that can remain. Deleting the
      account ends access to it. The existing session record can stay until it expires, and a new OAuth sign-in
      attempt in the same browser can extend that expiry. "Disconnect Google or GitHub" becomes what removing access
      there does, and how to have a sign-in unlinked.
    - **Where your data is processed** adds the backups, stored in western North America (§ 6).
    - **The opening** names the site without an address (D7). The terms' opening follows D11; its § 1 and § 5 name
      the lists, ratings and reviews the site now keeps. Section 5 points to the policy's disclosure about admin
      access.

  _ADR:_ `none`, obvious from code: each sentence restates what the code does.
- **D7: the texts name the site without an address.** The approved texts opened with the production address, which
  doesn't answer until launch, while the pages first go live on the staging host. They name the site as "CineXplorer,
  a free movie-discovery website run as a personal project by Andrew Creekmore", true on both hosts, over showing the
  page's own address, which would add code for a line of text. _ADR:_ `none`, a tactical choice of wording.
- **D8: the texts stay true as the app changes** (R11). They went out of date in eight days, mostly through changes to
  existing behavior rather than additions, so the rule covers any statement a change makes untrue, not only additions.
  A change to existing behavior gives its author no prompt unless the rule says where the texts' statements rest, so
  it names those areas of code and the provider facts, every area Appendix C cites, and the ADR names Appendix C as
  the full map at publication (R12). A provider setting changes in a console, with no pull request to carry the texts,
  so the rule has the texts updated first. Updating the texts can't make a new use of personal data true to a policy
  that promises notice first, and Google's user-data policy requires notice and consent before Google data is used in
  a new way, so the rule holds such a change until the people whose data it uses have been told, and limits the new
  use to those who consent where consent is required. Neither list is kept up to date as a second copy of the texts:
  the texts themselves are what a change corrects. _ADR:_ the new ADR.
- **D9: a new ADR** (R12) records how the legal texts live in the app. _ADR:_ the new ADR itself.
- **D10: unit tests and one public smoke spec** (R13 to R15). The smoke spec runs in CI before merge and on staging
  after each deploy, which shows the pages live where Google reads them; it also proves R1's opening position, R3's
  landing and R5's phone width, which unit tests can't measure. _ADR:_ `none`, a tactical choice.
- **D11: a sign-up notice where accounts are made** (R10). Google doesn't require it, and the terms already say that
  using the site means agreeing to them; it follows the usual practice the texts were written to, so the terms show
  where an account is made. Visitors agree to the terms, a contract, and acknowledge the policy, a notice: the
  policy's legal basis for account data is providing the service, not consent. The terms' opening says the same: "By
  using the site you agree to them. The Privacy Policy explains how we handle your data." _ADR:_ `none`, a tactical
  choice of wording.
- **D12: one change set.** The pages, their links, Home's line and the sign-up notice serve one concern, publishing the
  texts, and none of them lands usefully alone. The forecast, about 1,900 to 2,500 changed lines with this document,
  sits well under the sizes at which this project splits a change (a document near 1,500 lines, a task list near 1,000
  lines or past six phases, a change near 10,000 lines). _ADR:_ `none`, it meets none of the criteria.

**ADRs this work delivers:** one new ADR, _Publish the privacy policy and terms as pages of the app_ (R12).

## 9. Success Criteria

### Implemented

1. **The smoke spec passes** against a worktree's browsable stack and in CI's smoke job: from the bottom of signed-out
   Home, the footer's links open `/privacy` and `/terms` with each title in view; both pages pass the axe scan;
   `/privacy` at 360×800 doesn't scroll sideways; and its "Who else handles your data" heading lands below the top bar
   from the in-page link and on a direct load of its fragment. (R1, R3, R5, R8, R14)
2. **The texts are the appendices'.** A reviewer comparing each page's rendered text with Appendix A and Appendix B
   finds the same headings, paragraphs, lists, table and links, and unit tests find no review marker, placeholder date
   or `{{` on either page. (R2, R13)
3. **The texts are true at merge.** Every statement in Appendix A and Appendix B about what the site does holds at
   source on the merge commit, by Appendix C's map; any code merged after this PRD that touches a mapped path has been
   traced again. (R2, R16, D6)
4. **The links are in place.** Unit tests show the footer's two links, signed-out Home's line and its link (and its
   absence signed in), and the sign-up notice with both links on `Register` and `Login`. (R8 to R10, R13)
5. **The rule and the ADR are in the repository.** `DEVELOPMENT-RULES.md` carries R11's rule; the new ADR reads
   `Accepted` with its date. (R11, R12)
6. **The smoke documents count the new spec.** (R15)

### Proven live

1. After the merge deploys, staging serves `/privacy` and `/terms` to a signed-out visitor with the merge date as both
   effective dates, and the staging smoke passes over both pages. (R7, R14)
2. The Owner enters the homepage, privacy and terms links on Google's Branding page, and the console accepts them.

## 10. Open Questions

None.

## Amendments

- **2026-11-20.** Clarified which movie tracking data the operator can see in Django admin, that allauth reads the
  first page of GitHub's email results, and that GitHub can link to the same account after Google sign-in removes
  an unverified account's password. Updated Appendices A, B and C to match the traced behavior. ADR disposition
  remains `none` for these wording corrections under D6.
- **2026-11-20.** Updated Appendices A and C to reflect the missing URL that prevents the Google account-exists
  email from sending, the metadata in admin deletion previews, audit records that can outlast an account, and the
  two token lifetimes and nightly cleanup. These wording corrections fall under D6's `none` ADR disposition.
- **2026-11-20.** Distinguished loss of access on account deletion from session-record expiry. Added admin activity
  timestamps and changed field names to the retention disclosure and noted that admin records can retain a username
  generated from Google data. These wording corrections fall under D6's `none` ADR disposition.
- **2026-11-20.** Applied the last-save expiry rule and nightly cleanup to the pending GitHub sign-in disclosure in
  Appendices A and C. This wording correction falls under D6's `none` ADR disposition.
- **2026-11-20.** Clarified how callback errors affect pending GitHub data, what gets logged during admin searches,
  the account timestamp and which sign-up flow sends verification and welcome emails. D1 records the protections
  against automatic sign-in redirects on the legal routes. R14 includes the Home accessibility scan.
- **2026-11-20.** Distinguished cancellation from a callback that clears pending GitHub data. D1 covers provider
  sign-in finishing while either document is open. Recorded admin search redaction in Non-Goals and Technical
  Considerations, and named the password-reset email send call in Appendix C.
- **2026-11-20.** Clarified when the renewal rate limit uses the signed-in account or the IP address. On either
  legal route, failed renewal reloads that address for a fresh session read.

## Appendix A: Privacy Policy

```markdown
# CineXplorer Privacy Policy

**Effective:** {{EFFECTIVE_DATE}}

CineXplorer is a free movie-discovery website run as a personal project by Andrew Creekmore. This policy explains what
the site collects, why, who else handles it, how long it's kept, and what you can ask for. Questions or requests:
[cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev).

## The short version

- You can browse movies without an account. An account lets you keep a watchlist and a record of the films you watch,
  rate and review.
- We collect what's needed to run accounts and keep the site working, and nothing for advertising. There are no ads,
  no analytics or tracking scripts, and we don't sell or rent anyone's data.
- If you sign in with Google or GitHub, we receive your name, email address and basic profile. We read the first page
  of email addresses GitHub returns and keep your primary, verified address if it appears there.

## What we collect

### Your account

If you sign up with an email address, we store your email address, the username you choose, and your password as a
one-way hash (never in readable form). We also record whether you've verified your email address, when you joined, and
a timestamp that updates when we save your full account record.

### Signing in with Google

When you sign in with Google, Google asks you to share your basic profile and email address with CineXplorer.
That's all the site requests: it can't see your Gmail, Drive, contacts, calendar or anything else in your Google
account.

- **What we receive:** your Google account ID, your email address and whether Google has verified it, your name (full,
  given and family), a link to your profile picture, and your language setting if Google includes it, along with
  technical details of the sign-in itself.
- **How we use it:** to create your CineXplorer account or sign you in to it, to fill in your email address and name
  and make your username from them, and to recognize you the next time you sign in with Google. If your Google email
  address is verified by Google and matches an existing CineXplorer account, Google sign-in is linked to that account.
  If that account's email address had never been verified, its password is removed. You can sign in with Google or
  reset your password using that email address. GitHub sign-in can also link to the account if GitHub returns the
  same address as your verified primary address.
- **How we store it:** in the site's database on our server, together with a copy of the profile Google sent, which is
  updated each time you sign in, and when you first and last signed in with Google. We don't keep Google's access or
  refresh tokens, so the site can't act on your Google account after you've signed in.
- **Sharing:** we don't sell Google user data or use it for advertising, and we share it only with the providers that
  run the site: it's stored with the rest of the database at our hosting and backup providers, and when we email you,
  your email address and username go to our email provider (see
  [Who else handles your data](#who-else-handles-your-data)).
- **Protection:** see [Security](#security).
- **Keeping and deleting it:** we keep your linked Google profile while you have an account and delete it with your
  account. Admin activity records can retain your CineXplorer username, including one made from your Google name or
  email address (see [Your choices](#your-choices)). You can also remove CineXplorer from the linked apps in your
  Google Account, under Sign in with Google. If you remove the link at Google, you can still sign in to the same
  CineXplorer account the next time you choose Sign in with Google.

CineXplorer's use of information received from Google APIs adheres to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy).

### Signing in with GitHub

When you sign in with GitHub, GitHub asks you to share your public profile and your email addresses.

- **What we receive:** your GitHub user ID and username, your name and avatar link, the other public profile details
  GitHub includes (such as bio, location, company and website), and the first page of email addresses GitHub returns,
  with whether each is primary and verified.
- **How we use it:** to create your account or sign you in, with your GitHub username as your CineXplorer username
  where it's available (otherwise one made from your name or email address), and your GitHub name as your name. We
  keep only the primary, verified address from that page, if one appears. As with Google, a matching verified email
  address can link GitHub sign-in to an existing account.
- **How we store it:** in the site's database, with a copy of the profile GitHub sent, updated at each sign-in, and
  when you first and last signed in with GitHub. We don't keep GitHub's access token with your account, and we have no
  access to your repositories. Sign-up requires GitHub to return a verified primary email address. If that address is
  missing, we keep the pending sign-in in your browser's session on our server, including the profile GitHub sent and
  its access token. We clear the earlier pending sign-in if a later Google or GitHub sign-in in that browser reaches
  our account checks and the server saves the removal. If you cancel the later attempt or it fails, those details can
  remain in your session. The session expires two weeks after the server last saves it. Starting another sign-in can
  extend that expiry, and expired sessions are removed nightly.
- You can revoke CineXplorer's access in your GitHub settings, under authorized OAuth apps. As with Google, that
  changes nothing here: signing in with GitHub again signs you in to the same account.

### Your movie lists

When you're signed in, the site stores what you track:

- your watchlist, with when each film joined it;
- whether you've watched and liked each film, and when;
- each film's current rating, from 1 to 10;
- the viewings and reviews you log, as many per film as you like, each with the date you watched (if you give one),
  its own rating, a review of up to 10,000 characters, whether it was a rewatch, and when you logged and last edited
  it;
- a record of the changes you make to a film's watchlist, watched, liked and rating marks, removals as well as
  additions, each with its time and the day in your own time zone. Logging a viewing that changes a film's rating is
  recorded too, and undoing a change erases it from the record.

Your Library shows your lists, and its History shows your viewings, reviews and additions from the record. The site
limits access to your Library and History to your account. The site operator can view the films you track, their
watchlist, watched and liked marks and associated dates, and your current ratings in the admin area. Admin deletion
previews also show viewing entry IDs and which tracking fields changed and when. Your tracking records are deleted
with your account. To link your entries to the right film, the site also saves each film's details from TMDB (its
TMDB ID, title, poster, release date, score, vote count, runtime, overview and genres), which say nothing about you.

### When you use the site

This applies whether or not you have an account.

- **Server logs.** Our server records each request the site sends it as you use it (loading the site's own files isn't
  recorded): your IP address, your browser's identification string (user agent), the time, the address requested, the
  page you came from without its query, and the result. We remove movie search text and credentials in recognized
  fields from the logged address. Admin searches can leave search text in the request logs, such as a username or
  email address. Account events (signing up, signing in, renewing your session, verifying your email address and
  emails sent to you), including failed attempts, are also logged with your username or user ID where known, and
  sometimes your browser's identification string. If a request fails on the server, for example while the site
  restarts, the logs can also record it in full, including any search text and the full address of the page you came
  from.
- **Error reports.** If something breaks in your browser, the site sends us an error report: the error message and
  technical details, the page's address (which we keep without its query), your browser and device details (user
  agent, language, platform and window size), your user ID if you signed in with a password, and a random ID for that
  page visit. Details labelled as passwords, tokens or other credentials, and the contents of any request that failed,
  are removed before the report is kept.
- **Abuse limits.** To stop repeated or automated requests, the server briefly keeps counts of recent requests.
  It counts sign-ups, sign-ins, verification email resends, password resets and error reports by IP address.
  For sign-ups and password reset requests it also counts by a scrambled form of the email address you enter.
  It counts saves to your lists by account. For password session renewal, the server counts by the account
  tied to a valid signed-in session cookie when one is present, and by IP address otherwise. Each count ends
  within a minute to a day of the last request it counted, depending on the limit.

### Email

The site sends email only when it's part of using an account. If you sign up with an email address and password, we
send a verification email when you sign up (and again if you ask) and a welcome email once you've verified. We also
send password-reset emails. If someone asks for a password reset for an address that has no account, we email that
address to say so. Beyond these, we'd write to you only about the service itself, such as a change to this policy or
the site closing, through the same email provider. We don't send newsletters or marketing.

## Cookies and browser storage

The site sets cookies for signing in, security and showing lists correctly, and one, `messages`, that holds a notice
the site doesn't use. There are no advertising or analytics cookies.

| Cookie | What it's for | How long it lasts |
| --- | --- | --- |
| `sessionid` | Keeps you signed in after a Google or GitHub sign-in. It's also set when you view movie lists, Home's included, so the site doesn't show you the same film twice across pages; the films already shown are kept on our server for an hour after you last load a page of that list. | 2 weeks |
| `csrftoken` | Protects your requests against cross-site request forgery. | 1 year |
| `refresh_token` | Keeps you signed in after an email-and-password sign-in. Page scripts can't read it. | 14 days if you chose "Remember me", otherwise until you close the browser |
| `messages` | Set when you sign up, verify your email address, or sign in with Google or GitHub. It holds a confirmation notice the site doesn't display, which can include your email address or username. Page scripts can't read it. | Until you close the browser |

The site also keeps some things in your browser's own storage. They stay on your device, except the sign-in token,
which goes with each request, and saved error reports, which are sent to us once they can be:

- your sign-in token, when it expires, and a marker that you're signed in: with "Remember me", until you sign out or,
  once your sign-in has run out, until you next visit the site; otherwise until you close the tab;
- your theme and light or dark mode choice;
- where you'd scrolled to in up to 20 movie lists, including any search text, until you close the tab;
- a marker that a Google or GitHub sign-in is in progress, until you close the tab;
- a fingerprint of your advanced filters when you close that panel, so it stays closed, until you close the tab;
- a marker that the page reloaded after failing to load part of a new version of the site, until you close the tab;
- up to 10 reports of errors that stopped a page, if sending them to us failed, without your user ID and with the
  page's address cut to its site and path. Each is sent and removed once a later report gets through.

## Who else handles your data

- **DigitalOcean** hosts our server, in the United States (San Francisco).
- **Cloudflare** runs our domain's DNS. It doesn't carry the site's traffic. It also stores our database backups, in a
  private storage bucket, and forwards email sent to our contact address.
- **Zoho CPaaS** (formerly ZeptoMail) delivers the site's emails. It receives the recipient's address and the message,
  and keeps a log of each email (the sender and recipient, the subject, the time and whether it was delivered) and a
  copy of its content for 60 days.
- **Google and GitHub** handle sign-in when you choose them. Their own privacy policies apply to your use of their
  services.
- **The Movie Database (TMDB)** provides the film information and images. Our server asks TMDB for movie data,
  including the text you search for, but sends nothing that identifies you. Your browser loads posters and backdrops
  directly from TMDB's image servers, so TMDB receives your IP address and browser details, as any website hosting an
  image does.

We don't sell, rent or trade personal data, or share it for advertising. We'd disclose information to anyone else only
if the law required it.

## How long we keep things

- **Your account, its linked Google or GitHub profile, your movie lists and their record of changes:** until your
  account is deleted.
- **Accounts whose email address is never verified:** kept until deleted on request.
- **Sign-in sessions and tokens:** sessions expire two weeks after the server last saved them. Access tokens expire
  after five minutes and refresh tokens after 14 days. The server removes expired sessions and refresh-token records
  nightly.
- **Server logs:** each service keeps about its most recent 30 MB of logs, and older entries are overwritten. There's
  no fixed time limit.
- **Admin activity records:** when we add, change or delete an account in the admin area, or delete a movie tracking
  record there, the database records the action and when it occurred. It can also include the affected record's ID,
  your username, the film's title for a tracking record, and the names of fields changed in an account edit. These
  records have no scheduled expiry.
- **Backups:** copies of the database, taken nightly and before each update of the site, are kept for 30 days.
  Anything deleted from the site stays in backups until they expire. A copy can also stay on our server until it's
  removed by hand: one from a backup that failed, or one made or downloaded to repair or restore the site.
- **Abuse-limit counts:** up to a day after the last request they count.
- **Emails we send:** Zoho CPaaS keeps a log and a copy of each for 60 days.

## Your choices

- **See or correct your data.** To see, correct or get a copy of what we hold about you, write to
  [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev).
- **Delete your account.** The site has no delete button yet. Write to
  [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev) from your account's email address, and
  we'll delete your account, its email addresses, its linked Google or GitHub sign-ins, and your movie lists and their
  record of changes within 30 days. Copies remain in backups for up to 30 days, except a copy left on our server as
  described above, and in server logs until they're overwritten. Admin activity records can remain after your account
  is deleted. Deleting your account ends access to it. Existing session and refresh-token records can remain on our
  server until the nightly cleanup after they expire. Starting another Google or GitHub sign-in in the same browser
  can extend the session record's expiry.
- **Google and GitHub sign-in.** You can remove CineXplorer's access in your Google or GitHub settings, as described
  above. To unlink a Google or GitHub sign-in from your account, or delete what we keep from it, write to
  [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev).
- **Reset your password** from the sign-in page.

**If you're in the EU or UK.** We use your account and movie-list data because we need it to provide the service you
signed up for, and we keep server logs, error reports and abuse limits because we have a legitimate interest in keeping
the site secure and working. You can ask to access, correct, delete or receive a copy of your data, and to object to or
restrict how we use it, by writing to [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev). You
also have the right to complain to your local data-protection authority (in the UK, the Information Commissioner's
Office).

## Security

The site is served only over HTTPS. Passwords are stored as one-way hashes, the sign-in cookies can't be read by page
scripts, and the site's admin area sits behind an extra password. Backups go to a private bucket over encrypted
connections. No system is perfectly secure, but we work to protect what we hold.

## Children

CineXplorer isn't meant for children under 13. We don't knowingly collect personal data from them; if you believe a
child has created an account, write to [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev) and
we'll delete it.

## Where your data is processed

Our server and our email provider are in the United States, and our backups are stored in western North America. If
you use the site from elsewhere, your data is transferred to and processed in those places.

## Changes to this policy

We'll post any change here with a new effective date. Before using data in a way this policy doesn't describe, we'll
tell you and ask for your consent where that's required, including for data received from Google.

## Contact

Andrew Creekmore, [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev)
```

## Appendix B: Terms of Service

```markdown
# CineXplorer Terms of Service

**Effective:** {{EFFECTIVE_DATE}}

These terms cover your use of CineXplorer, a free movie-discovery website run as a personal project by Andrew
Creekmore ("we", "us"). By using the site you agree to them. The [Privacy Policy](/privacy) explains how we handle your
data. If you don't agree, please don't use the site.

## 1. The service

CineXplorer lets you browse and search movies and, with an account, keep a watchlist and a record of the films you
watch, rate and review. It's free and has no paid features.

## 2. Who can use it

You must be at least 13 years old, or older where your country's law requires it, to create an account.

## 3. Your account

- Give accurate information, and keep your password to yourself. You're responsible for what happens under your
  account.
- An account is for one person.
- If you sign in with Google or GitHub, their terms also apply to that sign-in.
- Tell us at [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev) if you think someone else has
  used your account.

## 4. Using the site fairly

Please don't:

- break the law, or use the site to harm anyone;
- try to get into accounts, systems or data that aren't yours, or probe, scan or test the site's security without our
  written permission;
- interfere with the site, overload it, or get around its rate limits;
- scrape or bulk-download content, or reach the site through bots or automated tools beyond ordinary browsing;
- copy the site's film information or images to use elsewhere, outside what TMDB's own terms allow (see section 6);
- pretend to be someone else.

## 5. What you add

What you add, such as your lists, ratings and reviews, stays yours. You let us store it and show it back to you so the
site can work. Access to your lists, ratings and reviews in the app is limited to your account. The Privacy Policy
explains what the site operator can see in the admin area.

## 6. Film information and images

Film information and images come from The Movie Database (TMDB). This product uses the TMDB API but is not endorsed or
certified by TMDB. TMDB's terms govern their content, and posters and other images belong to their owners. We can't
promise the film information is complete or correct.

## 7. Availability

CineXplorer is a personal project. We may change, pause or stop it, or any part of it, at any time. Before shutting it
down for good, we'll try to give notice by email, so you can ask for a copy of your data first. We back up the site's
data, but we can't promise nothing will ever be lost.

## 8. No warranties

The site is provided "as is" and "as available", without warranties of any kind, express or implied, including
fitness for a particular purpose and non-infringement, to the fullest extent the law allows.

## 9. Limitation of liability

To the fullest extent the law allows, we aren't liable for indirect, incidental, special or consequential damages, or
for lost data or profits, arising from your use of the site. Because the site is free, our total liability for any
claim about it is limited to US $50.

## 10. Ending your use

You can stop using CineXplorer at any time and ask us to delete your account, as the Privacy Policy describes. We may
suspend or delete an account that breaks these terms or puts the site or other people at risk.

## 11. Changes to these terms

We'll post any change here with a new effective date. If you keep using the site after a change takes effect, you
accept the updated terms.

## 12. Governing law

These terms are governed by the laws of the State of Arkansas, United States, and any dispute about them belongs in the
courts there, unless the law where you live gives you a right to bring it elsewhere.

## 13. Contact

Andrew Creekmore, [cinexplorer@andrewcreekmore.dev](mailto:cinexplorer@andrewcreekmore.dev)
```

## Appendix C: Grounding map

Every sentence of both texts is accounted for, in their order, read on `main` for this PRD; the effective-date lines are
R7's. The policy's tables enter each sentence: a row may group consecutive sentences that rest on the same thing, and a
sentence that makes several claims has an entry that accounts for each. The terms' table enters each sentence that
states what the site does, and its closing line accounts for the rest. An entry says what makes the sentence true: the
code, a provider setting the Owner confirmed or a provider's help page (marked _(provider)_, § 6), or the Owner's own
commitment or legal choice (marked _commitment_). Paths are from the repository root; `allauth` is `django-allauth`
65.21.1, the version `backend/requirements/req.prod.txt` locks, under `allauth/`, and `ninja_jwt` and `ninja` are the
installed packages of those names.

### Privacy policy

#### Opening

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "a free movie-discovery website run as a personal project by Andrew Creekmore" | No payment, plan or paid feature exists; _commitment_ for the rest | `frontend/package.json`, `backend/requirements/` |
| "This policy explains what the site collects…" | Describes the document | — |
| "Questions or requests:" the contact address, here and wherever else either text gives it | Cloudflare Email Routing forwards it to the Owner _(provider)_ | — |

#### The short version

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "You can browse movies without an account." | Catalog pages sit outside `ProtectedRoute`; catalog routes take `auth=None` | `frontend/src/App.tsx`, `backend/apps/movie/api.py` |
| "An account lets you keep a watchlist and a record of the films you watch, rate and review." | Tracking routes require sign-in and store the lists below | `backend/apps/user_movie_data/api.py`, `models.py` |
| "We collect what's needed to run accounts and keep the site working, and nothing for advertising." | Every collection below serves an account, the logs or the limits; no advertising code | as below |
| "There are no ads, no analytics or tracking scripts" | No analytics or advertising package; `index.html` loads the app and two inline scripts (startup background, sign-in marker); the browser loads nothing from another host but TMDB's images | `frontend/package.json`, `frontend/index.html`, image URLs under `frontend/src/components/movie/` |
| "we don't sell or rent anyone's data" | _commitment_ | — |
| "we receive your name, email address and basic profile" | Google: scopes `profile` and `email`, read from the ID token; GitHub: `/user` and `/user/emails` under scope `user:email` | allauth `socialaccount/providers/google/`, `socialaccount/providers/github/` |
| "We read the first page of email addresses GitHub returns and keep your primary, verified address if it appears there" | `get_emails` makes one GET request to `/user/emails`; GitHub defaults to page 1 _(provider)_. `populate_user` keeps the verified primary address from that response | allauth `github/views.py`, `docs.github.com/en/rest/users/emails`, `backend/apps/authentication/adapters.py` |

#### Your account

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "we store your email address, the username you choose, and your password as a one-way hash" | `register_user` creates the user with `create_user` (Django's password hasher) and its `EmailAddress`. The API also accepts a first and last name that the form never sends | `backend/apps/authentication/services/authentication_service.py`, `frontend/src/pages/user/Register.tsx` |
| "whether you've verified your email address, when you joined, and a timestamp that updates when we save your full account record" | `EmailAddress.verified` stores verification and `User.date_joined` stores account creation time. `User.updated_at` uses `auto_now` on a full user save. Verifying a primary address can save only `EmailAddress` | allauth `account/models.py`, `account/internal/flows/email_verification.py`; `backend/apps/users/models.py` |

#### Signing in with Google

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "Google asks you to share your basic profile and email address" | No scope configured, so allauth's default `profile` and `email` | `backend/config/settings.py` (`SOCIALACCOUNT_PROVIDERS`), allauth `google/provider.py` |
| "That's all the site requests: it can't see your Gmail…" | Those two scopes only; no token kept to use later | as above; `SOCIALACCOUNT_STORE_TOKENS` unset |
| "What we receive" | `complete_login` decodes the ID token, and its claims become `extra_data`: ID, address and its verified flag, names, picture, `locale` when sent, and the token's own fields (issuer, audience, times). `FETCH_USERINFO` is off | allauth `google/views.py` |
| "to create your CineXplorer account or sign you in to it" | Auto sign-up (`SOCIALACCOUNT_AUTO_SIGNUP`), or the lookup below | `settings.py`, allauth `socialaccount/internal/flows/signup.py`, `login.py` |
| "to fill in your email address and name and make your username from them" | `populate_user` sets the address and names; `save_user` calls `populate_username`, which builds the username from first name, last name and address | allauth `socialaccount/adapter.py`, `account/adapter.py` |
| "to recognize you the next time you sign in with Google" | `_lookup_by_socialaccount` finds the account by provider and ID | allauth `socialaccount/models.py` |
| "If your Google email address is verified by Google and matches an existing CineXplorer account, Google sign-in is linked" | `authenticate_by_email` matches verified addresses only; `SOCIALACCOUNT_EMAIL_AUTHENTICATION` and `_AUTO_CONNECT` connect the account (`_accept_login`) | allauth `socialaccount/adapter.py`, `models.py`; `settings.py` |
| "If that account's email address had never been verified, its password is removed" | `wipe_password` sets an unusable password unless the matched address is verified | allauth `socialaccount/internal/flows/email_authentication.py` |
| "You can sign in with Google or reset your password using that email address" | `_lookup_by_socialaccount` finds the linked Google account. `ResetPasswordForm`, which the headless input extends, finds the user by address without asking for a usable password and mails the reset link there | allauth `socialaccount/models.py`, `account/forms.py`, `account/internal/flows/password_reset.py` |
| "GitHub sign-in can also link to the account if GitHub returns the same address as your verified primary address" | The GitHub adapter keeps the verified primary address. `authenticate_by_email` looks it up regardless of whether the local account has a usable password; `_accept_login` connects the GitHub account | `backend/apps/authentication/adapters.py`, `backend/config/settings.py`, allauth `socialaccount/adapter.py`, `socialaccount/models.py` |
| "in the site's database on our server…, a copy of the profile Google sent, updated each time you sign in, and when you first and last signed in" | The database runs in the server's `db` container; `SocialAccount.extra_data`, saved again at each lookup; `date_joined`; `last_login` (`auto_now`) | `infrastructure/docker-compose.prod.yml`, allauth `socialaccount/models.py` |
| "We don't keep Google's access or refresh tokens" | `SOCIALACCOUNT_STORE_TOKENS` unset (default `False`). A new Google address can sign up and a verified match can link. For an unverified match, the account-exists email path stops before sending because the headless reset request URL is missing | `backend/config/settings.py`, allauth `socialaccount/app_settings.py`, `socialaccount/internal/flows/signup.py`, `account/adapter.py` (`send_account_already_exists_mail`), `account/internal/flows/password_reset.py` (`get_reset_password_url`), `core/internal/httpkit.py` |
| "we don't sell Google user data or use it for advertising" | _commitment_ | — |
| "we share it only with the providers that run the site: it's stored with the rest of the database at our hosting and backup providers" | The database runs on the server, and its backups go to R2. The server's other outbound requests go to the email API, to TMDB with no visitor detail, and to Google and GitHub during their own sign-ins | `infrastructure/docker-compose.prod.yml`, `infrastructure/deploy/backup.sh`, `backend/apps/core/email_backend.py`, `backend/apps/core/services/base_api_client.py`, allauth `socialaccount/providers/` |
| "when we email you, your email address and username go to our email provider" | Password-reset emails can go to a Google address through the ZeptoMail backend. The reset email names the username in both its HTML and text parts; a Google sign-up builds the username from the Google profile (`populate_username`) | `backend/apps/core/email_backend.py`, allauth `account/internal/flows/password_reset.py`, `templates/account/email/password_reset_key_message.txt`; `backend/templates/account/email/password_reset_key_message.html` |
| "Protection: see Security" | As Security | — |
| "we keep your linked Google profile while you have an account and delete it with your account" | `SocialAccount` cascades from the user; deletion is by request | allauth `socialaccount/models.py` |
| "Admin activity records can retain your CineXplorer username, including one made from your Google name or email address" | `populate_username` can generate the username from the name or address supplied at Google sign-up. `LogEntry` stores the username in `object_repr` and can remain after account deletion as described under "Your choices" | allauth `account/adapter.py`, `socialaccount/adapter.py`; Django `contrib/admin/models.py`, `contrib/auth/base_user.py`; `backend/apps/user_movie_data/models.py` |
| "remove CineXplorer from the linked apps in your Google Account, under Sign in with Google" | Google's linked apps page offers "Stop using Sign in with Google" _(provider)_ | `support.google.com/accounts/answer/13533235` |
| "If you remove the link at Google, you can still sign in to the same CineXplorer account the next time you choose Sign in with Google" | The next sign-in finds the existing `SocialAccount` by provider and ID | allauth `socialaccount/models.py` (`_lookup_by_socialaccount`) |
| "adheres to the Google API Services User Data Policy" | _commitment_ | — |

#### Signing in with GitHub

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "GitHub asks you to share your public profile and your email addresses" | Default scope `user:email`, since email is required | allauth `github/provider.py`, `settings.py` (`ACCOUNT_SIGNUP_FIELDS`) |
| "What we receive" | `complete_login` reads `/user` for the profile and requests the first page of `/user/emails`, with primary and verified flags | allauth `github/views.py`, `docs.github.com/en/rest/users/emails` _(provider)_ |
| "to create your account or sign you in" | As Google | as Google |
| "your GitHub username… where it's available (otherwise one made from your name or email address)" | `populate_user` sets `login`; auto sign-up clears a name that fails `clean_username`, and `populate_username` makes one | allauth `socialaccount/adapter.py`, `internal/flows/signup.py`, `account/adapter.py` |
| "your GitHub name as your name" | `populate_user` splits `name` into first and last name | allauth `socialaccount/adapter.py` |
| "We keep only the primary, verified address from that page, if one appears" | The adapter filters `email_addresses` to the primary verified address and sets the profile email to that address or `None`. The provider drops `emails` from `extra_data` | `backend/apps/authentication/adapters.py`, allauth `github/provider.py` (`extract_extra_data`) |
| "a matching verified email address can link GitHub sign-in to an existing account" | As Google; the one address kept is verified | as Google |
| "a copy of the profile GitHub sent, updated at each sign-in, and when you first and last signed in" | As Google | as Google |
| "We don't keep GitHub's access token with your account" | `SOCIALACCOUNT_STORE_TOKENS` unset | allauth `socialaccount/app_settings.py` |
| "we have no access to your repositories" | Scope `user:email` grants none | allauth `github/provider.py` |
| "Sign-up requires GitHub to return a verified primary email address"; if missing, "we keep the pending sign-in in your browser's session on our server, including the profile GitHub sent and its access token" | The adapter clears the email when no verified primary address is returned. With email required, `redirect_to_signup` stores the serialized sign-in, including the profile and token, in the database-backed session. The headless callback redirects back to the app and lets Django save the session | `backend/apps/authentication/adapters.py`, `backend/config/settings.py`, allauth `socialaccount/internal/flows/signup.py`, `socialaccount/models.py`, `headless/socialaccount/internal.py`; Django `contrib/sessions/middleware.py` |
| "We clear the earlier pending sign-in if a later Google or GitHub sign-in in that browser reaches our account checks and the server saves the removal" | `pre_social_login` calls `clear_pending_signup` before looking up the account. Django persists the removal when it saves the session | allauth `socialaccount/internal/flows/login.py`, `socialaccount/internal/flows/signup.py`; Django `contrib/sessions/middleware.py` |
| "If you cancel the later attempt or it fails, those details can remain in your session" | The callback's `_get_state` calls `unstash_state`, saving the session with the earlier details still present. A provider cancellation redirects before `pre_social_login`. If clearance occurs in memory and the response is 5xx, Django skips the subsequent save | allauth `socialaccount/providers/oauth2/views.py`, `socialaccount/internal/statekit.py`, `headless/socialaccount/internal.py`; Django `contrib/sessions/middleware.py` |
| "The session expires two weeks after the server last saves it. Starting another sign-in can extend that expiry, and expired sessions are removed nightly" | `stash_state` saves the current session when redirecting to a provider, giving the row a new expiry before the callback can clear the pending sign-in. The database backend sets expiry from the last save, and `clearsessions` removes expired rows nightly | allauth `socialaccount/internal/statekit.py`; Django `contrib/sessions/backends/db.py`, `contrib/sessions/backends/base.py`; `infrastructure/deploy/maintenance.sh` |
| "You can revoke CineXplorer's access in your GitHub settings, under authorized OAuth apps." | The Authorized OAuth Apps tab, under Settings and Applications, offers "Revoke" _(provider)_ | `docs.github.com/en/apps/oauth-apps/using-oauth-apps/reviewing-your-authorized-oauth-apps` |
| "As with Google, that changes nothing here: signing in with GitHub again signs you in to the same account." | As Google | as Google |

#### Your movie lists

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "When you're signed in, the site stores what you track" | Every tracking route authenticates (`JWTSessionAuth`) and writes the requesting user's rows | `backend/apps/user_movie_data/api.py` |
| "your watchlist, with when each film joined it" | `user_on_watchlist`, `watchlist_added_at` | `backend/apps/user_movie_data/models.py` (`UserMovieData`) |
| "whether you've watched and liked each film, and when" | `user_watched`, `watched_added_at`, `user_liked`, `liked_added_at` | as above |
| "each film's current rating, from 1 to 10" | `user_rating` with validators 1 to 10 | as above |
| "the viewings and reviews you log, as many per film as you like…" | `UserMovieEntry`: `watched_on`, `rating`, `review` (10,000 characters), `rewatch`, `made_on`, `created_at`, `updated_at` | as above |
| "a record of the changes… removals as well as additions, each with its time and the day in your own time zone" | `UserMovieChange`: `field`, `turned_on`, `rating`, `created_at`, `made_on`, written by `record_changes` | `models.py`, `services/movie_state_rules.py` |
| "Logging a viewing that changes a film's rating is recorded too" | `from_entry` changes | `services/movie_state_rules.py`, `services/user_movie_entry_service.py` |
| "undoing a change erases it from the record" | `record_changes(undo=True)` deletes the latest differing row | `services/movie_state_rules.py` |
| "Your Library shows your lists, and its History shows your viewings, reviews and additions" | Library and History routes; `SHOWN_CHANGES` keeps turned-on changes not made by an entry | `api.py`, `services/history_queries.py`, `frontend/src/pages/user/` |
| "The site limits access to your Library and History to your account" | Every tracking route authenticates (`JWTSessionAuth`) and reads the requesting user's rows | `backend/apps/user_movie_data/api.py` |
| "The site operator can view the films you track, their watchlist, watched and liked marks and associated dates, and your current ratings in the admin area" | `UserMovieDataAdmin` lists user, movie, watchlist, watched, liked and current rating in Django admin. Its read-only detail also includes the list timestamps | `backend/apps/user_movie_data/admin.py`, `backend/apps/user_movie_data/models.py`, `backend/apps/user_movie_data/tests/integration/test_admin.py` |
| "Admin deletion previews also show viewing entry IDs and which tracking fields changed and when" | Django admin's `get_deleted_objects` follows both cascading relationships and formats the related objects with `str`. `UserMovieEntry.__str__` includes the entry ID and `UserMovieChange.__str__` includes the field and `created_at` | `backend/apps/user_movie_data/models.py`, Django `contrib/admin/options.py`, `contrib/admin/utils.py`, `contrib/admin/templates/admin/delete_confirmation.html` |
| "Your tracking records are deleted with your account" | `UserMovieData` cascades from the user, and entries and changes from it | `models.py` |
| "To link your entries to the right film, the site also saves each film's details from TMDB…, which say nothing about you" | `UserMovieData` links each record to a `Movie`, whose fields are the TMDB ID, title, poster path, release date, score (`vote_average`), vote count, runtime, overview, genre IDs and its own timestamps; none refers to a user | `backend/apps/core/models.py`, `backend/apps/user_movie_data/models.py` |

#### When you use the site

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "This applies whether or not you have an account." | The request log covers every request Django serves, signed in or not; the error-report route takes `auth=None`; the IP-keyed limits count any visitor | `backend/middleware/logging.py`, `backend/apps/core/api.py`, `backend/apps/authentication/api.py` |
| "records each request the site sends it… (loading the site's own files isn't recorded)" | `RequestLoggingMiddleware` logs every request Django serves; Caddy serves the app's files and keeps no access log; Gunicorn's access log is off | `backend/middleware/logging.py`, `infrastructure/Caddyfile.prod`, `frontend/Dockerfile` (Caddy 2.11), `backend/gunicorn.conf.py` |
| "your IP address, your browser's identification string, the time, the address requested, the page you came from without its query, and the result" | First `X-Forwarded-For` address, which Caddy sets to the connecting address and won't take from a client (no `trusted_proxies`); user agent (first 100 characters); referrer through `sanitize_log_url`; status and duration; the JSON formatter adds the time | `backend/middleware/logging.py`, `backend/apps/core/utils/logging.py`, `backend/config/logging.py`, `infrastructure/Caddyfile.prod`, `frontend/Dockerfile` (Caddy 2.11) |
| "We remove movie search text and credentials in recognized fields from the logged address. Admin searches can leave search text in the request logs, such as a username or email address" | `SENSITIVE_PARAMS` contains `query`, the catalogue's search parameter, and named credential fields. Django admin searches use `q`, which is preserved. `UserAdmin` and `UserMovieDataAdmin` support searches by username and email | `backend/middleware/logging.py`, `backend/apps/movie/schemas.py`, `backend/apps/users/admin.py`, `backend/apps/user_movie_data/admin.py`; Django `contrib/admin/views/main.py`, `contrib/auth/admin.py` |
| "Account events…, including failed attempts, … with your username or user ID where known, and sometimes your browser's identification string" | `AuthenticationService`'s log lines: `register_user` logs each refusal (forbidden or taken username, taken address, weak password, a race lost to another sign-up) and the success, with the username; `obtain_token` logs wrong credentials with the user agent, an unverified address with the user ID, and the success with both; `hybrid_refresh_token` logs a renewal with the user ID and a revoked token's reuse with the user ID and user agent; `verify_email` and `resend_verification` log their outcomes with the user ID. Their `ip` is `REMOTE_ADDR`, the proxy's address (`get_client_info`). The welcome email logs the user ID, and the email backend logs each message the provider accepts or refuses, by its status | `backend/apps/authentication/services/authentication_service.py`, `backend/apps/core/utils/http.py`, `backend/apps/core/services/email_service.py`, `backend/apps/core/email_backend.py` |
| "If a request fails on the server… the logs can also record it in full" | Caddy's default error log writes a failed proxied request's URI, `Referer` and user agent; the API's unhandled-error handler logs the traceback | `infrastructure/Caddyfile.prod` (no `log` directive), `frontend/Dockerfile` (Caddy 2.11), `backend/apps/core/api_errors.py` |
| "If something breaks in your browser, the site sends us an error report" | Production logs errors and above only, and reports each | `frontend/src/services/logger.ts` (`level`, `backendReportingThreshold`) |
| "the error message and technical details, the page's address (which we keep without its query)" | `postReport` sends the message, data and full address; the server keeps the address's origin and path | `logger.ts`, `backend/apps/core/api.py` (`_process_log_entry`), `utils/logging.py` |
| "user agent, language, platform and window size" | `getBrowserInfo` (its time zone is a fixed `UTC`) | `logger.ts` |
| "your user ID if you signed in with a password" | `getCurrentUserId` reads the stored access token, which only a password sign-in stores | `logger.ts`, `frontend/src/utilities/tokenUtils.ts` |
| "a random ID for that page visit" | `sessionId`, made once per page load | `logger.ts` (`generateSessionId`) |
| "Details labelled as passwords, tokens or other credentials, and the contents of any request that failed, are removed before the report is kept" | The browser filters credential-named keys (`removeSensitiveFields`), but an axios error carries its request `config`, body included (a failed sign-in's password among it), which key filtering can't reach, and the browser sends it; the server drops `config`, `request`, `headers` and `body`, and string `data`, at any depth before logging | `frontend/src/services/logger.ts` (`sanitizeDataForBackend`), `frontend/src/hooks/auth/useAuth.ts`, `backend/apps/core/utils/logging.py` (`sanitize_frontend_context`) |
| "It counts sign-ups, sign-ins, verification email resends, password resets and error reports by IP address" | Registration 3 an hour, sign-in 5 a minute, resend 3 an hour, error reports 30 a minute. Allauth's reset request and reset from a link are limited to 20 a minute. Each keys on the `X-Forwarded-For` address Caddy sets, read with one trusted proxy (`NINJA_NUM_PROXIES`, `ALLAUTH_TRUSTED_PROXY_COUNT`) | `backend/apps/authentication/api.py`, `throttles.py`, `backend/apps/core/api.py`, `backend/config/settings.py`, allauth `account/app_settings.py`, `core/internal/httpkit.py`, ninja `throttling.py`, `infrastructure/Caddyfile.prod`, `frontend/Dockerfile` (Caddy 2.11) |
| "For sign-ups and password reset requests it also counts by a scrambled form of the email address you enter" | allauth's verification-email cooldown (one per 3 minutes, counted at sign-up) and reset request (5 a minute), keyed by the address's SHA-256 | allauth `account/internal/flows/email_verification.py`, `core/internal/ratelimit.py` |
| "It counts saves to your lists by account" | `SaveThrottle`, 30 a minute and 1,000 a day | `backend/apps/user_movie_data/throttles.py` |
| "For password session renewal, the server counts by the account tied to a valid signed-in session cookie when one is present, and by IP address otherwise" | Renewal sends cookies and is limited to 10 requests a minute. The route's `auth=None` leaves Django's session authentication in place. `TestAwareUserThrottle` inherits Ninja's `UserRateThrottle`, which uses `request.user.pk` for an authenticated user and `get_ident` for the IP address otherwise | `frontend/src/services/apiClient.ts`, `backend/apps/authentication/api.py`, `throttles.py`, `backend/config/settings.py`; Django `contrib/auth/middleware.py`; Ninja `operation.py`, `throttling.py` |
| "Each count ends within a minute to a day of the last request it counted, depending on the limit." | Each count is one cache entry. The sliding counts keep a list of recent request times that each counted request saves again with its window as the timeout, dropping times older than the window. The save count runs to the end of its fixed window. Windows run from a minute to a day | Ninja `throttling.py` (`SimpleRateThrottle`), allauth `core/internal/ratelimit.py` (`_consume_single_rate`), `backend/apps/user_movie_data/throttles.py` |
| "If you sign up with an email address and password, we send a verification email when you sign up (and again if you ask) and a welcome email once you've verified" | `register_user` calls `send_verification_email_to_address`, `resend_verification` calls `send_confirmation`, and `verify_email` sends the welcome message. Social sign-up runs through allauth with `SOCIALACCOUNT_EMAIL_VERIFICATION` set to `none` | `backend/apps/authentication/services/authentication_service.py`, `backend/apps/core/services/email_service.py`, `backend/config/settings.py`; allauth `socialaccount/internal/flows/signup.py` |
| "We also send password-reset emails" | For a matching account, `request_password_reset` builds the reset link and calls `send_password_reset_mail`. That method calls `CustomAccountAdapter.send_mail`, which renders the reset-key message and sends it through the configured backend | allauth `account/internal/flows/password_reset.py`, `account/adapter.py`; `backend/apps/authentication/adapters.py`, `backend/config/settings.py` |
| "If someone asks for a password reset for an address that has no account, we email that address" | `ACCOUNT_EMAIL_UNKNOWN_ACCOUNTS` (default `True`) | allauth `account/app_settings.py` |
| "The site sends email only when it's part of using an account"; "We don't send newsletters or marketing." | No other code sends mail, and allauth's security notices are off (`ACCOUNT_EMAIL_NOTIFICATIONS` unset, default `False`); _commitment_ | `backend/apps/` (`send_mail` only in `email_service.py` and the adapter), allauth `account/app_settings.py` |
| "Beyond these, we'd write to you only about the service itself, such as a change to this policy or the site closing, through the same email provider." | _commitment_: the notice of a new use of data that R11's rule requires, and the terms' § 7 notice before a shutdown, sent through Zoho CPaaS as the site's emails are | — |

#### Cookies and browser storage

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "cookies for signing in, security and showing lists correctly, and one, `messages`…" "no advertising or analytics cookies" | The site writes these four cookies and no others: the `refresh_token` and `csrftoken` writes, Django's session and messages | `backend/apps/authentication/utils.py`, `api.py`, `authentication_service.py`; `settings.py` |
| `sessionid` | Social sign-in signs in through Django's session; catalog routes create a session for any visitor that has none (`_create_dedup_tracker`), Home's lists included, and keep the films shown in the cache under the session's key, with an hour's expiry that each later page of the list renews and page 1 clears (`SESSION_TTL_SECONDS`); age 2 weeks (default) | `backend/apps/movie/api.py`, `backend/apps/movie/services/deduplication_tracker.py`, `frontend/src/pages/home/WhatsOn.tsx` |
| `csrftoken` | `CsrfProtectionMiddleware`, in `MIDDLEWARE`, checks the token on every unsafe request, Ninja's exempt views included (only the error-report route and two development-only paths are excepted); `CSRF_COOKIE_AGE` default, one year | `backend/apps/authentication/middleware.py`, `backend/config/settings.py`, `backend/apps/authentication/api.py` (`get_csrf_token`) |
| `refresh_token` | `obtain_token` sets it at a password sign-in, and `hybrid_refresh_token` reads it to issue a new access token and replaces it; HttpOnly; 14 days with "Remember me", otherwise a browser-session cookie | `backend/apps/authentication/services/authentication_service.py`, `backend/apps/authentication/utils.py` (`set_auth_cookie`) |
| `messages` | allauth's `add_message` skips only its own headless requests; sign-up, verification and social sign-in add messages, and Django's default `FallbackStorage` writes them to an HttpOnly browser-session cookie (seen after sign-up: "Confirmation email sent to {address}."). Never read, they gather in it; only what overflows its 2,048 bytes would move to the session, which takes about 260 sign-ups or 5,900 sign-ins in one browser session | allauth `account/adapter.py`, `django/contrib/messages/storage/` |
| "They stay on your device, except the sign-in token… and saved error reports"; "Each is sent and removed once a later report gets through." | The access token goes in the `Authorization` header; stored reports are sent and removed when a later report gets through | `frontend/src/services/apiClient.ts`, `logger.ts` |
| the sign-in token, its expiry and the signed-in marker, and their lifetime | `access_token`, `token_expiration`, `isAuthenticated`: `localStorage` with "Remember me", else `sessionStorage`. `clearAuthTokens` removes them at sign-out and whenever a renewal is refused: by the minute's expiry check and the API client while the site is open, and by `readSession` when it loads, so once the refresh cookie has run out they go at the next visit | `frontend/src/utilities/tokenUtils.ts`, `frontend/src/hooks/auth/useAuth.ts`, `frontend/src/lib/session.ts`, `frontend/src/services/apiClient.ts` |
| theme and light or dark mode | `cinexplorer-theme`, `theme`, `cinexplorer-bg` | `frontend/src/components/core/chakra/`, `frontend/index.html` |
| scroll positions in up to 20 lists, with search text, until the tab closes | `sessionStorage` scroll keys, capped at 20 | `frontend/src/components/movie/collection/shared/scrollStorage.ts` |
| the sign-in-in-progress marker, until the tab closes | `oauth_in_progress`, `oauth_start_time` in `sessionStorage` | `frontend/src/hooks/auth/useOAuthFlow.ts`, `frontend/index.html` |
| the advanced-filter fingerprint, until the tab closes | `advancedPanelUserClosed` in `sessionStorage` | `frontend/src/utilities/advancedPanelOverride.ts` |
| the reload marker, until the tab closes | `cinexplorer:preload-reload:*` in `sessionStorage` | `frontend/src/utilities/preloadRecovery.ts` |
| up to 10 saved error reports, without user ID, address cut to site and path | `cinexplorer_critical_logs`, at most 10, `sanitizeStoredUrl`, no `user_id` | `logger.ts` |

#### Who else handles your data

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "DigitalOcean hosts our server, in the United States (San Francisco)" | _(provider)_ | — |
| "Cloudflare runs our domain's DNS. It doesn't carry the site's traffic." | DNS only, proxy off _(provider)_ | — |
| "It also stores our database backups, in a private storage bucket" | rclone to R2, from the nightly timer and before each deploy's migrations _(provider: private bucket)_ | `infrastructure/deploy/backup.sh`, `bootstrap.sh`, `deploy.sh` |
| "and forwards email sent to our contact address" | Email Routing _(provider)_ | — |
| "Zoho CPaaS… delivers the site's emails. It receives the recipient's address and the message" | Outside development, the settings allow only the ZeptoMail backend, which posts each message to ZeptoMail's API | `backend/config/settings.py` (`EMAIL_BACKEND`), `backend/apps/core/email_backend.py` |
| "keeps a log of each email… and a copy of its content for 60 days" | Zoho's help pages put email logs and saved content at 60 days; the account keeps its defaults, content retention on and tracking off _(provider)_ | `zoho.com/zeptomail/help/processed-emails.html`, `zoho.com/zeptomail/help/content-setting.html` |
| "Google and GitHub handle sign-in when you choose them." | The two configured providers | `settings.py` |
| "Their own privacy policies apply to your use of their services." | _commitment_: a pointer to the providers' own policies | — |
| "The Movie Database (TMDB) provides the film information and images." | The catalog's film data comes from TMDB's API, and its images from `image.tmdb.org` | `backend/apps/core/services/tmdb_api_client.py`, `frontend/src/components/movie/` |
| "Our server asks TMDB for movie data, including the text you search for, but sends nothing that identifies you" | The server-side client sends the site's token and the query; no visitor detail; its logs redact `query` | `backend/apps/core/services/tmdb_api_client.py`, `base_api_client.py` |
| "Your browser loads posters and backdrops directly from TMDB's image servers, so TMDB receives your IP address and browser details" | Image URLs on `image.tmdb.org`: posters and `HeroArtwork`'s backdrops, no other kind. The browser requests each from TMDB's host itself, with no proxy, so the request carries its address and user agent | `frontend/src/components/movie/`, `frontend/src/pages/` |
| "We don't sell, rent or trade personal data… only if the law required it" | _commitment_ | — |

#### How long we keep things

| Sentence | What makes it true | Where |
| --- | --- | --- |
| Account, profile, lists and change record "until your account is deleted" | No code deletes them; deletion is by request and cascades | models above |
| "Accounts whose email address is never verified: kept until deleted on request" | No job removes them | `infrastructure/deploy/maintenance.sh` |
| "sessions expire two weeks after the server last saved them" | The database session backend sets `expire_date` when it saves the row. `get_expiry_date` uses the default two-week `SESSION_COOKIE_AGE` from the save time | `backend/config/settings.py`, Django `contrib/sessions/backends/db.py`, `contrib/sessions/backends/base.py` |
| "Access tokens expire after five minutes and refresh tokens after 14 days" | Ninja JWT's configured `ACCESS_TOKEN_LIFETIME` and `REFRESH_TOKEN_LIFETIME` | `backend/config/settings.py` |
| "The server removes expired sessions and refresh-token records nightly" | `clearsessions` removes expired database sessions and `flushexpiredtokens` removes expired `OutstandingToken` rows | `infrastructure/deploy/maintenance.sh`, Ninja JWT `token_blacklist/management/commands/flushexpiredtokens.py` |
| "each service keeps about its most recent 30 MB of logs, and older entries are overwritten. There's no fixed time limit." | `json-file`, 10 MB × 3, on every service; it rotates by size only | `infrastructure/docker-compose.prod.yml` |
| "when we add, change or delete an account in the admin area, or delete a movie tracking record there, the database records the action and when it occurred" | `UserAdmin` and `UserMovieDataAdmin` use Django's `log_addition`, `log_change` and `log_deletions` for their allowed operations. `LogEntry` records `action_flag` and `action_time` | `backend/apps/users/admin.py`, `backend/apps/user_movie_data/admin.py`, Django `contrib/admin/options.py`, `contrib/admin/models.py` |
| "It can also include the affected record's ID, your username, the film's title for a tracking record, and the names of fields changed in an account edit" | `LogEntry` stores the target's ID and up to 200 characters of `str(obj)`, the username for `User` and the username and film title for `UserMovieData`. `construct_change_message` stores labels for changed account fields in `change_message` | `backend/apps/user_movie_data/models.py`, Django `contrib/admin/models.py`, `contrib/admin/options.py`, `contrib/admin/utils.py`, `contrib/auth/base_user.py` |
| "These records have no scheduled expiry" | `LogEntry` has no expiry field. Nightly maintenance clears sessions and refresh-token records and refreshes movie cards | Django `contrib/admin/models.py`, `infrastructure/deploy/maintenance.sh` |
| "copies of the database, taken nightly and before each update of the site, are kept for 30 days" | The nightly timer and each deploy run `backup.sh`; R2 lifecycle rule _(provider)_ | `infrastructure/deploy/bootstrap.sh`, `deploy.sh`, `backup.sh` |
| "Anything deleted from the site stays in backups until they expire." | Each backup uploads a new full dump under its own name (`copyto`); nothing changes an uploaded dump, and the lifecycle rule removes it _(provider)_ | `backup.sh` |
| "A copy can also stay on our server until it's removed by hand: one from a backup that failed, or one made or downloaded to repair or restore the site." | `backup.sh` makes the dump file before `pg_dump` runs, `set -euo pipefail` stops it at any failed step (dump, check or upload), and the dump is removed only after the upload; the deploy runbook's restore downloads an archive to the server with no step to remove it, and its recovery and safety copies are removed by hand once the checks pass | `backup.sh`, `infrastructure/deploy/README.md` |
| "Abuse-limit counts: up to a day after the last request they count" | As the abuse limits; the longest window is a day | as above |
| "Emails we send: Zoho CPaaS keeps a log and a copy of each for 60 days" | As above _(provider)_ | — |

#### Your choices

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "To see, correct or get a copy…, write to…" | No export or edit route exists; by request | `backend/apps/authentication/api.py`, `frontend/src/pages/user/Profile.tsx` |
| "The site has no delete button yet." | No delete route | as above |
| "we'll delete your account, its email addresses, its linked Google or GitHub sign-ins, and your movie lists and their record of changes within 30 days" | Deleting the user removes its `EmailAddress` and `SocialAccount` rows and its `UserMovieData`, with their entries and changes, by cascade; _commitment_ for the request and the 30 days | allauth `account/models.py`, `socialaccount/models.py`, `backend/apps/user_movie_data/models.py` |
| "Copies remain in backups for up to 30 days, except a copy left on our server as described above, and in server logs until they're overwritten" | As retention | as above |
| "Admin activity records can remain after your account is deleted" | `LogEntry.user` is the administrator who acted. The target's ID is a text field, so deletion of the target account leaves the activity record linked to the administrator | Django `contrib/admin/models.py`, `contrib/admin/options.py` |
| "Deleting your account ends access to it" | `JWTSessionAuth` requires an existing user for an access token. Django's `get_user` resolves a session for a deleted user as anonymous. Refresh also requires an existing user | `backend/apps/authentication/auth_ninja.py`, `backend/apps/authentication/services/authentication_service.py`, Django `contrib/auth/__init__.py` |
| "Existing session and refresh-token records can remain on our server until the nightly cleanup after they expire" | Django's session row has no user foreign key and `get_user` leaves it when the user is missing. A deleted user's `OutstandingToken.user` is set to null. `clearsessions` and `flushexpiredtokens` remove expired rows nightly | Django `contrib/auth/__init__.py`, `contrib/sessions/base_session.py`; Ninja JWT `token_blacklist/models.py`; `infrastructure/deploy/maintenance.sh` |
| "Starting another Google or GitHub sign-in in the same browser can extend the session record's expiry" | On provider redirect, allauth's `stash_state` saves the current session. The database session backend gives the row a new `expire_date` | allauth `headless/socialaccount/views.py`, `socialaccount/internal/statekit.py`; Django `contrib/sessions/backends/db.py`, `contrib/sessions/backends/base.py` |
| "You can remove CineXplorer's access in your Google or GitHub settings, as described above." | As the Google and GitHub entries _(provider)_ | as above |
| "To unlink a Google or GitHub sign-in from your account, or delete what we keep from it, write to" | No unlink route: the project's API has none, and `AllauthEndpointMiddleware` answers allauth's own provider routes with 404; by request | `backend/apps/authentication/api.py`, `backend/apps/authentication/middleware.py` |
| "Reset your password from the sign-in page." | "Forgot password?" on `Login` | `frontend/src/pages/user/Login.tsx` |
| "If you're in the EU or UK…" | _commitment_: legal bases and rights | — |

#### Security, children, location, changes, contact

| Sentence | What makes it true | Where |
| --- | --- | --- |
| "served only over HTTPS" | Caddy's automatic HTTPS redirects plain HTTP; HSTS settings | `infrastructure/Caddyfile.prod`, `frontend/Dockerfile` (Caddy 2.11), `settings.py` |
| "Passwords are stored as one-way hashes" | Django's password hasher | `settings.py` |
| "the sign-in cookies can't be read by page scripts" | `SESSION_COOKIE_HTTPONLY`; `refresh_token` `httponly=True` | `settings.py`, `backend/apps/authentication/utils.py` |
| "the site's admin area sits behind an extra password" | `basic_auth` on `/admin/*` | `infrastructure/Caddyfile.prod`, `frontend/Dockerfile` (Caddy 2.11) |
| "Backups go to a private bucket over encrypted connections" | R2's HTTPS endpoint; private bucket _(provider)_ | `infrastructure/ops.env.example`, `backup.sh` |
| "No system is perfectly secure…" | _commitment_ | — |
| Children | _commitment_ | — |
| "Our server and our email provider are in the United States, and our backups are stored in western North America." "If you use the site from elsewhere, your data is transferred to and processed in those places." | DigitalOcean San Francisco; Zoho's US region; the R2 bucket's location, Western North America (WNAM) _(provider)_ | — |
| "We'll post any change here with a new effective date." | R7 and R11: a change to a text sets its date | — |
| "Before using data in a way this policy doesn't describe, we'll tell you and ask for your consent where that's required, including for data received from Google." | _commitment_, held by R11's rule: such a change doesn't merge until the people whose data it uses have been told, and where consent is required the new use applies only to those who give it | — |
| Contact | As the opening | as above |

### Terms of service

| Sentence | What makes it true | Where |
| --- | --- | --- |
| Opening: "a free movie-discovery website run as a personal project"; § 7 "CineXplorer is a personal project." | As the policy's opening | as above |
| Opening: "The Privacy Policy explains how we handle your data." | Describes the policy; the link opens `/privacy` (R4) | — |
| § 1 "lets you browse and search movies and, with an account, keep a watchlist and a record of the films you watch, rate and review" "free and has no paid features" | Catalog and search routes; tracking as the policy's lists; no payment code | `backend/apps/movie/api.py`, `backend/apps/user_movie_data/` |
| § 3 "If you sign in with Google or GitHub, their terms also apply" | The two providers sign users in | `settings.py` |
| § 3 and § 13: the contact address | As the policy's opening _(provider)_ | — |
| § 4 "get around its rate limits" | The limits exist, as the policy's abuse limits | as above |
| § 5 "Access to your lists, ratings and reviews in the app is limited to your account" and "The Privacy Policy explains what the site operator can see in the admin area" | The lists as § 1; account-scoped API and admin access as the policy's "Your movie lists" | `backend/apps/user_movie_data/api.py`, `backend/apps/user_movie_data/admin.py` |
| § 6 "Film information and images come from The Movie Database (TMDB)." | As the policy's TMDB entry | as above |
| § 6 attribution | The footer carries the same line | `frontend/src/components/layout/Footer.tsx` |
| § 7 "We back up the site's data" | Nightly and before each deploy | `infrastructure/deploy/bootstrap.sh`, `deploy.sh`, `backup.sh` |
| § 9 "Because the site is free" | As § 1 | as above |
| § 10 "ask us to delete your account, as the Privacy Policy describes" | As the policy's "Delete your account"; deletion is by request | as above |

Every other sentence of the terms is a rule for users, a legal term, or the Owner's commitment, such as § 7's notice
before a shutdown.
