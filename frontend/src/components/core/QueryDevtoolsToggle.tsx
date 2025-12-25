import { useState, useEffect } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

declare global {
  interface Window {
    toggleQueryDevtools?: () => void;
  }
}

/**
 * Wrapper for TanStack Query Devtools with toggle functionality.
 * Hidden by default - call `window.toggleQueryDevtools()` in browser console to show/hide.
 */
export function QueryDevtoolsToggle() {
  const [showQueryDevtools, setShowQueryDevtools] = useState(false);

  useEffect(() => {
    window.toggleQueryDevtools = () => setShowQueryDevtools((old) => !old);
    return () => {
      delete window.toggleQueryDevtools;
    };
  }, []);

  if (!showQueryDevtools) return null;

  return <ReactQueryDevtools initialIsOpen={false} />;
}
