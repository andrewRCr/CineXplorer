# ADR-048: Expose Film Tracking Through Shared Controls

## Status

Proposed

Supersedes ADR-044 in part (adds Log to the wide bar and "Log a film" to the phone drawer).

## Context

[ADR-047](adr-047-track-film-facts-and-viewing-entries.md) separates current film facts from private viewing and review
entries. Visitors need quick tracking actions while discovering films, and a way to record a viewing or review
without leaving the page they were using. A film can be on the watchlist for a rewatch, and server rules can change
fields beyond the one a visitor saved.

A screen-width breakpoint does not identify whether a device can hover: a touch tablet can be wide, and a mouse can
operate a narrow window. Long-press actions are hard to discover and compete with browser gestures. Rendering two
sets of controls and hiding one leaves duplicated interaction structure.

Separate logging forms at each entry point would duplicate prefill, validation, feedback and focus handling. A
separate destination would also interrupt browsing. Toasts for every plain toggle would repeat visible changes;
silent removals would hide changes a visitor may want to reverse. Restoring an entire old record during Undo would
also overwrite unrelated later saves.

[ADR-044](adr-044-navigate-through-one-top-bar-into-one-film-catalog.md) defines the top bar and phone drawer. The phone
row already needs room for navigation, the wordmark, search and account access. Signed-out cards do not need a set
of unusable controls, while the film page can explain what an account adds in one place.

## Decision

We will expose one set of tracking controls per card, chosen by the primary input's hover capability. Pointers that
can hover reveal Watched, Like, Watchlist and Review or log over the poster on hover or keyboard focus. Touch input
uses a visible menu trigger with the same actions. Cards show these actions only to authenticated visitors. The
controls overlay the poster, so their presence does not change the card's text height.

We will mount one entry-dialog host over the current page and open it through `useEntryDialog`. Card actions, the
film panel, the wide bar's Log and the phone drawer's "Log a film" share that host, form and feedback. Card and
film-panel entry points fix the film. Navigation actions allow changing it, prefill a successfully loaded film page,
and otherwise start on the picker. The phone drawer closes before opening the form. Log appears in the wide bar for
authenticated visitors, and "Log a film" appears above the drawer's links.
This adds those two actions to ADR-044; its navigation links and other contracts continue to stand.

The film page will keep its panel visible when signed out. Its controls take no input or save, and activation
explains that signing in enables watching, rating, logging and a watchlist, with a return link to the film. While
sign-in resolves, the controls remain inert without an anonymous-visitor explanation.

Feedback will describe the visitor's action in the title and the returned record's additional rule effects in the
description. Watchlist changes, cleared ratings, rule-cleared likes and dialog saves receive feedback; ordinary
watched, like and rating changes remain silent unless one of those effects occurs. Entry edits confirm without
Undo, and entry deletion shows its result without a success toast. A refused un-mark of Watched displays the server's
reason and retains the confirmed state. Shared save mutation options own record-save feedback; the dialog host owns
its save feedback, so one action produces one message.

Undo will compare the state shown when the action started, including pending saves, with the server's complete
answer. It restores only differing film fields. When Watched differs, it also supplies watchlist and Liked companions
to preserve those choices against the rules. The server's Undo mark preserves a restored list position. An Undo can
still encounter rules after a later save; it does not pin unrelated fields to prevent them. A dialog-created entry's
Undo deletes that entry first, then restores differing film fields only if deletion succeeds. These writes work
after the dialog closes and stop when ownership changes. A save with no changed fields offers no Undo; an entry
create still does. Undo offers no further Undo and only toasts when its own answer changes watchlist membership.

## Consequences

### Positive

- Discovery and film pages share tracking behavior while serving pointer, touch and keyboard input.
- Logging preserves the current page and uses one form, prefill and focus lifecycle.
- Signed-out cards stay quiet, while the film page explains the value of signing in when asked.
- Feedback exposes server-applied removals, and Undo restores the visitor's shown choices without broadly reverting
  later changes.
- The phone row retains its existing controls while logging remains available through the drawer.

### Negative

- Mouse users discover card actions through hover or focus, and touch users open a menu before choosing an action.
- One dialog host must preserve entry-point context and restore focus when its original control disappears.
- Undo must retain the shown state and ownership of each operation after the initiating component closes.
- Selective restoration deliberately leaves later unrelated saves in place, so later server rules can affect an Undo.
