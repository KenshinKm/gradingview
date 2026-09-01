"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex min-h-screen flex-col items-center justify-center py-20 text-center">
      <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-ink-muted">
        An unexpected error occurred. You can try again — if this keeps happening,
        refresh the page.
      </p>
      <button className="btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
