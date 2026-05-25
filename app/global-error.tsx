"use client";

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0b1220] text-white antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-8 text-center">
            <h1 className="text-xl font-semibold text-red-200">
              KONSTRUKT Academy — Critical Error
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              The application encountered a critical error.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
