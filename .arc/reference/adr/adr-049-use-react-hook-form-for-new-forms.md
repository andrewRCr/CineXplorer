# ADR-049: Use React Hook Form for New Forms

## Status

Proposed

## Context

The review and logging form combines asynchronous film selection, history-based defaults, half-star ratings and
conditional date validation. It needs one form-state owner that works with native fields and Chakra's controlled
widgets. Existing sign-in, registration and password-recovery forms use Formik.

Formik's latest release is [2.4.9, published in November 2025](https://github.com/jaredpalmer/formik/releases/tag/formik%402.4.9).
Continuing it for every new form would extend that dependency across another set of interactions. Replacing all
existing forms at once would also enlarge a change whose purpose is film tracking.

React Hook Form 7 provides field registration, controlled-widget integration and
[built-in validation](https://react-hook-form.com/docs/useform/register). The form's rules fit those facilities;
a separate schema-validation library would add another dependency without a requirement it serves.

## Decision

Use React Hook Form 7 for new forms and for forms rewritten as part of their own changes, beginning with the film
review and logging form. Register native fields directly, connect Chakra's controlled widgets with `Controller`,
and use the library's validation rules and custom validators.

Keep Formik in sign-in, registration and password recovery until those forms are rewritten. Do not migrate them as
part of adding film tracking, and do not add a schema-validation library for the entry form.

## Consequences

### Positive

- New forms share one state and validation approach, including conditional fields and submission progress.
- Native inputs and controlled Chakra widgets use the same form values.
- Existing authentication behavior stays within its current implementation and test coverage.

### Negative

- Two form libraries remain installed until the existing Formik forms are rewritten.
- Each asynchronous prefill must distinguish initialization from visitor edits so a refetch cannot overwrite a draft.
- Rewrites must move validation and interaction coverage together rather than only swapping input bindings.
