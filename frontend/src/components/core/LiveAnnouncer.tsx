import { VisuallyHidden } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { connectAnnouncer } from "@/lib/announcer";

/**
 * Live Announcer
 *
 * The app's one polite live region for notices, fed by `announce` (`@/lib/announcer`). Screen readers announce a
 * change inside a live region they already track, not a region that arrives with its text or one hidden behind a
 * modal dialog, so this region:
 *
 * - mounts once at app start (beside the toasters), long before any notice;
 * - renders straight into `<body>`, outside the app root, where a modal dialog's page hiding skips it as a live
 *   region;
 * - clears itself before each message and writes the message after a short delay, so a repeated message is announced
 *   again and a message sent just after the region mounts waits until screen readers track it;
 * - empties once a message has had time to be read, so a notice the visitor dismissed or left behind isn't still
 *   there for a screen reader to find later.
 *
 * Visible notices carry no live role of their own: show the notice where it belongs and call `announce` with its
 * text. Errors use `role="alert"` instead (see `FloatingAlert`).
 */

// The same settle times as the UI library's own live region (@zag-js/live-region)
const SETTLE_AFTER_MOUNT_MS = 200;
const GAP_AFTER_CLEAR_MS = 100;
// Long enough for a screen reader to reach and speak a short notice; emptying the region doesn't cut speech short
const READ_TIME_MS = 7000;

export const LiveAnnouncer = () => {
  const [text, setText] = useState("");

  useEffect(() => {
    const readyAt = Date.now() + SETTLE_AFTER_MOUNT_MS;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const disconnect = connectAnnouncer((message) => {
      clearTimeout(timer);
      setText("");
      timer = setTimeout(
        () => {
          setText(message);
          timer = setTimeout(() => setText(""), READ_TIME_MS);
        },
        Math.max(GAP_AFTER_CLEAR_MS, readyAt - Date.now()),
      );
    });
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, []);

  return createPortal(
    <VisuallyHidden role="status" aria-live="polite" aria-atomic="true">
      {text}
    </VisuallyHidden>,
    document.body,
  );
};
