# Draft: Privacy Policy and Terms of Service Pages

**Type:** Technical
**Class:** Heavy
**Readiness:** formalization-ready
**Created:** 2026-11-19

**Purpose:** Publish CineXplorer's privacy policy and terms of service as pages of the app, linked from every page's
footer and from signed-out Home, with Home's line on why the app asks for sign-in data, so Google's console can publish
the OAuth app and verify its branding. It finishes the ROADMAP's Stage 4 design-track item 3, after the landing page.

---

## Problem / Motivation

**Google won't publish the app without them.** The Google Cloud console refuses to move the OAuth app from Testing to
In production until its Branding page carries homepage, privacy policy and terms of service links ("These links are
required for all external production apps"). Brand verification, which puts the app's name and logo on the consent
screen, also requires:

- a homepage that explains why the app requests user data and links to the privacy policy;
- a privacy policy on the homepage's domain, at a URL other than the homepage's, that describes how the app handles
  Google user data;
- the privacy link in the app's interface as well as on the homepage.

Home already describes the app and serves `/` without a redirect. The landing page left the policy links and the
data-use line to this work, since the line must agree with the policy it publishes. The branding names the staging host
now and is verified again with the production host at launch.

**The site has none of it.** `App` (`frontend/src/App.tsx`) has no privacy or terms route, `Footer`
(`frontend/src/components/layout/Footer.tsx`) carries theme controls, the copyright line and TMDB's attribution, and
`HomeBand` (`frontend/src/pages/home/HomeBand.tsx`) has three points on what the app does and nothing on sign-in data.
Nothing in `frontend/src/` mentions privacy or terms.

**The text exists and is approved, but parts of it are out of date.** Both texts were drafted from the code on
2026-11-11, claiming only what the code did, and the Owner approved them that day. They carry bracketed markers for
facts to confirm in provider consoles (`[C1]`–`[C7]`), sentences that fixes on the way would change (`[F#]`), and
sentences to re-check at publication (`[R#]`), with `[publication date]` for the effective date. Fixes and the
tracking work have merged since, so several sentences no longer match the code (decision 6). Published, the pages carry
no marker and no placeholder.

## Alternatives

**How the pages are served.**

- **Two routes of the app, `/privacy` and `/terms` (chosen).** Lazy-loaded pages inside `AppLayout`, like every other
  page, public (outside `ProtectedRoute`), with the top bar and footer. They follow the theme and modes, and need no
  new serving path: Caddy's catch-all already hands any path to `index.html`.
- **Static HTML files in `frontend/public/`.** Served as files by the same catch-all, readable without JavaScript.
  Rejected: their own styles outside the theme, no top bar or footer to get back into the app, and the benefit is moot,
  since Home itself renders in the browser and Google's reviewers read the pages in one.
- **Django-rendered templates.** Rejected: a second way of rendering pages for two pages of text.

**How the text gets into the pages.**

- **Hand-written page components on Chakra's primitives (chosen).** Headings, paragraphs, lists, one table and links,
  written out in the two page components with semantic tokens. No new dependency; a change to the text is a reviewed
  change to source like any other.
- **Markdown files rendered at run time** (`react-markdown` with `remark-gfm` for the cookie table). The approved text
  would drop in almost as written, and later edits read as prose. Rejected: a dependency tree of a few dozen packages
  for two pages that change rarely, and a mapping layer from Markdown elements to themed components.
- **Markdown compiled at build time** by a Vite plugin. Rejected for the same reasons, as a build dependency.

**Where Home's data-use line goes.** Google reads signed-out Home.

- **Under the band's three points, on signed-out Home (chosen).** The band already explains what an account is for
  ("Track your films"); the line follows it, with the privacy policy's link. Signed-in Home doesn't need it: the visitor
  has already signed in, and the footer carries the links on every page.
- **In the hero, beside "Create account" and "Sign in".** Rejected: the hero's composition was settled with care, and a
  sentence of terms there competes with the headline.
- **A section of its own.** Rejected: one sentence doesn't make a section.

## Decisions

1. **The pages live at `/privacy` and `/terms`,** as routes of the app inside `AppLayout`, public, lazy-loaded. Each has
   one `h1` (the text's title), the effective date beneath it, `h2` sections, and `h3` for the policy's subsections.
   The cookie table scrolls sideways inside itself at phone width; the page never does. The paths are what Google's
   Branding page records, so changing them later sends the app back through brand verification. ADR disposition:
   covered by the new ADR (decision 9).
2. **The text is written into two page components** on Chakra's primitives and semantic tokens, with no Markdown
   dependency. Contact addresses are `mailto:` links, the terms' link to the policy opens `/privacy`, and links to other
   sites (Google's API Services User Data Policy) open as ordinary links. Section headings carry ids, and the policy's
   three links to its own sections ("Who else handles your data", "Your choices", "Security") jump to them, landing
   clear of the sticky top bar. ADR disposition: covered by the new ADR (decision 9).
3. **The footer links both pages on every page.** `BaseLayout` renders `Footer` on the app's pages and on sign-in,
   sign-up and password reset, so one row of two links ("Privacy Policy", "Terms of Service") puts them in the app's
   interface everywhere. ADR disposition: `none`, a tactical choice.
4. **Signed-out Home says why the app asks for sign-in data.** One line under the band's three points, linking the
   policy, in the wording the Owner approved:

   > An account keeps your lists. If you sign in with Google or GitHub, CineXplorer receives your name, email address
   > and basic profile, and uses them only for your account, never for advertising. [Privacy Policy]

   It repeats what the policy's short version says sign-in receives ("your name, email address and basic profile").
   "Basic profile" covers what differs by provider: Google's profile picture and language; GitHub's username, which
   becomes the CineXplorer username, and its public profile details. "Only for your account" covers signing in and
   the account's own use of the name, such as signed-in Home's greeting (`SignedInHome`). The line changes when the
   policy does. ADR disposition: covered by the new ADR (decision 9).
5. **One effective date for both pages: the day they go live on staging.** CI deploys `main` to staging on
   merge, and staging is where Google's reviewers and every visitor read the pages before launch, so the date is the
   merge's. The pull request's last commit before merging sets it; a merge that slips a day moves it. Launch changes the
   host, not what the texts say, so it needs no new date unless the texts change (decision 8). Launch day was the
   alternative; until then, staging would show a future or placeholder date, as if no policy were in effect. ADR
   disposition: `none`, a tactical choice.
6. **The texts are brought up to date with `main` before they publish.** Every sentence that states what the site
   does says what the code does then; the rest stays as approved, with its marker removed. The approved drafts live
   outside the repository, so the PRD carries both complete revised texts in an appendix: the Owner approves the final
   words there, and the build copies them from it. The PRD stage grounds every sentence of both texts against the code,
   tracing each one's path at source, and its review checks them. The changes below are the ones found so far, while
   drafting and in this draft's review; they are where the PRD starts, not a complete list.

   **Privacy policy:**

   - **Server logs** (`[F5]`). Gunicorn's access log is off (`accesslog = None` in `backend/gunicorn.conf.py`).
     `RequestLoggingMiddleware.process_request` (`backend/middleware/logging.py`) logs each request's method, path and
     query with search text and credentials redacted (`SENSITIVE_PARAMS`, which includes `query`), the client's IP
     (`_get_client_ip`, the first `X-Forwarded-For` address), the user agent cut to 100 characters, and the referring
     page reduced to its origin and path (`sanitize_log_url`). It runs first in `MIDDLEWARE`, before
     `AuthenticationMiddleware` sets `request.user`, so its user context is always anonymous. The TMDB client logs its
     parameters with `query` redacted (`TMDBApiClient.get_sanitized_params`). The sentence drops "including any search
     text" and adds the referring page.
   - **Account events in the logs.** The approved text says sign-up and sign-in events record a username or user ID.
     At the production level (INFO and above), user IDs and usernames are logged on more events than those:
     `AuthenticationService` logs a sign-up's username (attempted or created) and user ID, a sign-in's user ID, and a
     session renewal's user ID (`hybrid_refresh_token`, at every renewal of the five-minute access token), each with an
     IP address; a refused reuse of a revoked token, with the IP address and user agent; and the user ID when an email
     address is verified or a verification email is resent. The welcome email logs the user ID (`send_welcome_email`
     in `backend/apps/core/services/email_service.py`), and so does a verification resend whose delivery fails
     (`AuthenticationService`). A failed sign-in with a wrong password records only the IP address and user
     agent. Error reports carry the user ID, as the policy already says. The sentence becomes: account events
     (signing up, signing in, renewing your session, verifying your email address and emails sent to you), including
     failed attempts, record your username or user ID where known, usually with your IP address and browser.
   - **Abuse limits** (`[R2]`). Sign-up and email-verification resends are limited per IP address at 3 an hour, sign-in
     at 5 a minute, and error reports at 30 a minute (`RegistrationThrottle`, `ResendVerificationThrottle` and
     `LoginThrottle` on the routes in `backend/apps/authentication/api.py`, `FrontendLogThrottle` in
     `backend/apps/core/api.py`); session renewals at 10 a minute (`TestAwareUserThrottle` on `/auth/refresh`, counted
     per IP address, since only password sign-ins renew through it (`refreshAccessToken` needs a stored access token)
     and they aren't a signed-in server session); saves to a visitor's lists and entries are limited per account at 30 a
     minute and 1,000 a day (`SaveThrottle`, `backend/apps/user_movie_data/throttles.py`, counted by user ID in Redis).
     allauth's default limits also run, since the settings set no `ACCOUNT_RATE_LIMITS`: a password-reset request at 20
     a minute per IP address and 5 a minute per email address, a reset from its link at 20 a minute per IP address, and
     one verification email per address every three minutes, which each sign-up counts against (`register_user` sends
     through `send_verification_email_to_address`). The app's own resend calls `EmailAddress.send_confirmation`
     directly, which counts against no allauth limit, so resends are capped only per IP address. allauth keys an
     address's count by its SHA-256 hash (`allauth/core/internal/ratelimit.py`), and counts addresses with no account
     too. Its sign-in, sign-up and password-change limits sit on endpoints the site doesn't open
     (`AllauthEndpointMiddleware` for the headless API, `HEADLESS_ONLY` for allauth's page views) or in flows it doesn't
     use (the app's own sign-in calls Django's `authenticate`, not allauth's adapter). The sentence becomes counts "by
     IP address, by a scrambled form of your email address, or by your account, for between a minute and a day", and
     "How long we keep things" reads "up to a day".
   - **Your movie lists** (`[R1]`, `[R2]`). From `UserMovieData`, `UserMovieEntry` and `UserMovieChange`
     (`backend/apps/user_movie_data/models.py`): the watchlist, with when each film joined it; whether you've watched
     and liked a film, and when; its current rating from 1 to 10; logged viewings, many per film, each with its own
     date, rating, review of up to 10,000 characters and rewatch mark; and a record of the changes you make to a film's
     watchlist, watched, liked and rating marks, removals as well as additions, each with its time and the day in your
     own time zone (`record_changes`, `backend/apps/user_movie_data/services/movie_state_rules.py`). Logging a viewing
     that changes the film's rating records that too. The Library's History shows a part of the record, your additions
     (`history_queries.py`); undoing a change erases it from the record. All of it stays visible only to its owner:
     every endpoint on the `user_movie_data` router authenticates (`JWTSessionAuth`) and reads the requesting user's
     rows, and nothing in `backend/apps/*/api.py` shows one person's data to another. The saved film details (`Movie`,
     `backend/apps/core/models.py`) are TMDB's: ID, title, poster, release date, score, vote count, runtime, overview
     and genres. The section names all of this, and says the record is deleted with the account.
   - **GitHub sign-in** (`[F4]`). `CustomSocialAccountAdapter.populate_user` (`backend/apps/authentication/adapters.py`)
     keeps only the primary, verified address. The sentence says so.
   - **Error reports kept in the browser** (`[F6]`). `logger.ts` (`frontend/src/services/logger.ts`) stores only
     critical reports whose sending failed, up to 10, with the page address cut to its origin and path and no user ID,
     and removes each once a later send succeeds (`acknowledgeReport`). The browser-storage bullet says so.
   - **The `refresh_token` cookie.** `AuthenticationService` passes the 14-day lifetime to `set_auth_cookie`
     (`backend/apps/authentication/utils.py`) only when "Remember me" is ticked; otherwise the cookie ends when the
     browser closes. The cookie table's row says so.
   - **The `sessionid` row** (`[F9]`). `_create_dedup_tracker` (`backend/apps/movie/api.py`) creates a session for any
     visitor without one when they browse the catalog, signed in with a password or not, and it lasts two weeks. The
     row drops "without signing in"; the session itself stays as disclosed.
   - **The `messages` row** (`[C6]`). Three paths add a Django message through `DefaultAccountAdapter.add_message`:
     sign-up (`AuthenticationService.register_user` calls allauth's `send_verification_email_to_address`, which adds
     "Confirmation email sent to {email}."), email verification (`AuthenticationService.verify_email` confirms through
     allauth's `verify_email`, which adds "You have confirmed {email}."), and a Google or GitHub sign-in (allauth's
     post-login adds "Successfully signed in as {username}."). `add_message` returns early only for allauth's own
     headless API requests (`is_headless_request`), and none of the three is one, so Django's default
     `FallbackStorage` writes a `messages` cookie. The single-page app never displays Django messages, so the cookie
     stays until the browser closes. The row says it's set when you sign up, verify your email address or sign in with
     Google or GitHub, holds a confirmation notice the site doesn't display, which can include your email address or
     username, and lasts until you close the browser.
   - **Browser storage.** Two tab-scoped keys are missing from the list: `advancedPanelUserClosed`
     (`frontend/src/utilities/advancedPanelOverride.ts`), a hash of your advanced filters kept when you close that
     panel, and `cinexplorer:preload-reload:*` (`frontend/src/utilities/preloadRecovery.ts`), a marker that the page
     reloaded after failing to load part of a new version. The list adds both, kept until you close the tab.
   - **`placehold.co`** (`[F2]`). `FilmPoster` draws a missing poster with the local `PosterPlaceholder`, and loading
     states use skeletons; nothing in `frontend/src/` requests a third-party image host but TMDB's. The bullet goes. The
     TMDB bullet names backdrops beside posters, since Home's hero loads them from TMDB too (`HeroArtwork`).
   - **"Your profile shows your username, email address and name."** `Profile` (`frontend/src/pages/user/Profile.tsx`)
     is a placeholder, and the account menu (`AccountControl`) shows only the username. The sentence goes; seeing,
     correcting or getting a copy of your data is by email, as for deletion.
   - **Backups.** `backup.sh` (`infrastructure/deploy/backup.sh`) deletes the local archive once it's uploaded; a
     failed upload leaves its archive on the server for diagnosis until it's removed by hand. The backups line adds
     that a failed backup can stay on the server until it's removed.
   - **"An account lets you keep a watchlist"** in the short version becomes a watchlist and a record of the films you
     watch, rate and review.

   **Terms of service** (`[R1]`): § 1 names the watchlist and the record of films watched, rated and reviewed; § 5's
   example of what you add names lists, ratings and reviews. "Your lists are private to you" holds, so § 5 needs no
   licence for content shown to others.

   **Unchanged and still true:** no account deletion, export or change of email, username or password in the app
   (`[F3]`; only password reset exists); never-verified accounts are never removed (`[F8]`); logs are kept to 10 MB in
   three files per service (`docker-compose.prod.yml`); a reset request for an unknown address is answered by email
   (allauth's `ACCOUNT_EMAIL_UNKNOWN_ACCOUNTS`, true by default); expired sessions and tokens are cleared nightly
   (`maintenance.sh`). The nightly jobs' heartbeat pings carry job status and, on failure, the job's last output
   lines, none of it visitor data, so the policy doesn't list the monitor.

   ADR disposition: `none`, obvious from code: each sentence restates what the code does.
7. **The texts name the site without an address.** Both drafts open by naming
   `https://cinexplorer.andrewcreekmore.dev`, the production host, which doesn't answer until launch, while the pages
   first go live on the staging host. They name it instead as "CineXplorer, a free movie-discovery website run as a
   personal project by Andrew Creekmore", true on both hosts. Keeping the production address would point at a host
   that doesn't answer until launch; showing the page's own address would add code for a line of text. ADR
   disposition: `none`, a tactical choice of wording.
8. **The texts stay true as the app changes.** The texts went out of date in eight days, mostly through changes to
   existing behavior rather than additions (decision 6), so a rule joins DEVELOPMENT-RULES: a change that makes any
   statement in the privacy policy or the terms untrue, or adds something they must describe (new personal data, a
   cookie or browser-storage key, a logged field, a party that receives data, anything shown to other people), updates
   them in the same pull request, with a new effective date, and keeps Home's line in agreement. Error tracking (the
   TODO in `backend/apps/core/services/metrics.py`), analytics, embeds and public reviews or shared lists, which need
   the terms' licence for content shown to others, are the expected cases. ADR disposition: covered by
   the new ADR (decision 9).
9. **A new ADR** records how the legal texts live in the app: the two routes and why their paths hold, the text written
   into source rather than rendered from Markdown, Home's line agreeing with the policy, and the rule in decision 8,
   with Google's requirements as its context. ADR disposition: the new ADR itself.
10. **Verification.** Unit tests: each page renders its title and effective date at its route; the footer's two links
    open the pages; signed-out Home shows the data-use line with the policy's link, and signed-in Home doesn't. One new
    smoke spec opens signed-out Home, follows the footer's links to both pages, and scans each with axe; it runs in
    CI's end-to-end smoke job and in the staging smoke after each deploy, which shows the pages live where Google
    reads them. Unit tests also cover decision 11's notice and its two links on both pages. ADR disposition: `none`, a
    tactical choice.
11. **A sign-up notice, where accounts are made.** "By creating an account, you agree to the Terms of Service and
    acknowledge the Privacy Policy.", with both names linking their pages, under `Register`'s submit button and under
    `Login`'s Google and GitHub buttons, since a first sign-in with either creates an account
    (`SOCIALACCOUNT_AUTO_SIGNUP`). Google doesn't require it, and the terms already say that using the site means
    agreeing to them; the Owner added it as the usual practice the texts were written to follow, so the terms show where
    an account is made. Visitors agree to the terms, a contract, and acknowledge the policy, a notice: the policy's
    legal basis for account data is providing the service, not consent. The terms' opening says the same, so its "By
    using the site you agree to them and to the Privacy Policy" becomes "By using the site you agree to them. The
    Privacy Policy explains how we handle your data." ADR disposition: `none`, a tactical choice of wording.

### Success signal

After the merge deploys, staging serves `/privacy` and `/terms` to a signed-out visitor, reachable from every page's
footer and from signed-out Home's line, and the staging smoke passes over both pages. Neither page carries a bracketed
marker or a placeholder date, and every sentence stating what the site does says what the code does. The Owner can then
enter the three links on Google's Branding page, and the console accepts them and publishes the app.

### Boundary fit

Stays one work unit: two pages, their links, Home's line and the sign-up notice serve one concern, publishing the
texts, and none of them lands usefully alone. The forecast is about 1,700–2,300 changed lines in three or four phases,
well under this project's size marks (a PRD near 1,500 lines, a task list near 1,000 lines or past six phases, a change
near 10,000 lines).

### Class

Heavy, on the scale trigger. The pages and links compose existing patterns, but the texts' claims reach across the
code: request and account logging, every rate limit (the app's own and allauth's defaults), the messages framework
through allauth's flows, browser storage, the data model and the deployment scripts. Three looks of this draft's review
found claims that only a trace of each path to its end gets right. The PRD's review checks that grounding.

### Next

Formalize into the PRD.

## Unknowns and Assumptions

- **Facts held in provider consoles,** confirmed by the Owner before publication, without changing anything:
    - `[C1]` the droplet is at DigitalOcean, San Francisco;
    - `[C2]` Cloudflare is DNS-only (proxy off) for the app's hosts;
    - `[C3]` the R2 bucket is private and its lifecycle rule deletes backups after 30 days;
    - `[C4]` ZeptoMail sends from its US region (no example environment sets `ZEPTOMAIL_HOSTED_REGION`, so the
      library's US host applies unless the server's environment does), and whether it keeps copies of sent mail;
    - `[C5]` the sender is on `andrewcreekmore.dev` (`ZEPTOMAIL_SENDER_EMAIL`; the code's fallback is on `.com`).

  `[C7]`, the production address, needs no check: decision 7 drops it from the texts.
- **`[C6]`, the `messages` cookie,** traced at source in decision 6 and still to observe: sign up on a worktree stack
  and look for the cookie in the browser.
- **Assumed, risk accepted:** Google's reviewers read the pages in a browser, which renders the app. Home already
  relies on this. If an automated check reads the raw HTML instead, Home fails it as well, since `index.html` carries
  only the app's root element. The fallback then is static content for both: a block in `index.html` with Home's
  description, its data-use line and the two links, and static copies of the two pages served beside the app, a
  change made at that point.

## Scope Boundary (Won't Do)

- **Changing what the code does** to make the texts simpler: the texts describe the code as it stands. Account deletion,
  export and email or username change; removing never-verified accounts; pruning a failed backup's local archive;
  shortening the catalog's two-week session; and stopping the `messages` cookie the app never shows (its own fix,
  captured separately; if it lands first, the row goes) stay as they are, each disclosed.
- **A cookie banner:** every cookie is necessary for the site to work.
- **The Profile and Settings placeholders:** the policy stops pointing at Profile; the pages themselves are other work.
- **The footer's hard-coded copyright year:** its own fix, though it shares the footer.
- **A per-page document title:** the app has none on any page.
- **Google's console:** entering the links, publishing the app and submitting brand verification are the Owner's,
  after the pages are live; re-verifying with the production host is launch's.
- **The tablet-width check:** the responsive finish's.
- **A Content Security Policy:** its own work before launch.
