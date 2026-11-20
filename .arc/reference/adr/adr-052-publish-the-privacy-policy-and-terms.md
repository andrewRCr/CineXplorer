# ADR-052: Publish the Privacy Policy and Terms as Pages of the App

## Status

Proposed

Appendix C of `prd-privacy-terms.md` maps each statement at publication to the code or provider setting behind it,
or identifies it as a commitment.

## Context

Google's OAuth Branding page requires a homepage, privacy policy and terms of service URL for an external production
app. The home page must explain what the app does and link to the same privacy policy that appears on the consent
screen. The policy must share Home's domain, be easy to find within the app, and disclose how the app accesses, uses,
stores and shares Google user data. Google records the legal URLs in the published branding. [Google Cloud OAuth
branding requirements](https://support.google.com/cloud/answer/15549049?hl=en)

Home already uses the React app and its theme. Standalone HTML would duplicate styling and navigation for the
two documents. Django templates would add a second way to render pages. A Markdown renderer or build plugin would
add dependencies and element mappings for two documents that change infrequently.

## Decision

Serve the privacy policy at `/privacy` and the terms at `/terms` as public routes in the app's shared layout.
Keep both paths stable once Google Branding records them. A new URL would require updating the Branding
configuration and verifying the draft before publishing it. [Google brand verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification)

Keep the text in two page components as JSX using the app's theme. Link both pages from the footer and from the
notice where a visitor can create an account. Signed-out Home explains what data sign-in provides and why, and
links to the privacy policy. Keep that explanation in agreement with the current policy.

Follow the policy and terms maintenance rule in [Development Rules](../constitution/DEVELOPMENT-RULES.md).
When a change alters what the documents describe, update the affected document and its effective date in the same
pull request. Give affected people notice before a new use of their data and obtain consent where required.

## Consequences

### Positive

- Visitors get the same navigation and theme when they open the documents.
- Text changes are reviewed with the behavior they describe and require no additional rendering dependencies.
- Stable paths keep links in the app and on the consent screen aligned.

### Negative

- The documents depend on the app's JavaScript to render.
- Editing the texts requires a source change and deployment.
