import {
  Info,
  Github,
  Heart,
  Database,
  Shield,
  ExternalLink,
} from "lucide-react";

const GITHUB_URL = "https://github.com/Stoneguard001/finapp";
const KOFI_URL = "https://ko-fi.com/philallion0979";
const HOSTED_URL = "https://stoneguardian.com/finapp/";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Info size={28} className="text-brand-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            About FinApp
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Open source personal finance, entirely on your device
          </p>
        </div>
      </div>

      <div className="card mb-4 space-y-4">
        <div className="flex items-start gap-3">
          <Database size={20} className="text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              What is FinApp?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              FinApp is a fully local budgeting app. Your data lives in a{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                .sqlite file on your own machine
              </strong>{" "}
              — no account, no server, no tracking of any kind. It runs entirely
              in the browser using SQLite compiled to WebAssembly.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Shield size={20} className="text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Privacy
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Nothing leaves your browser. There are no analytics, no telemetry,
              no cookies, and no external API calls. Your financial data is
              yours alone.
            </p>
          </div>
        </div>
      </div>

      <div className="card mb-4 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Live site
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The live site is available at stoneguardian.com — no install required.
          Your data stays entirely in your browser; nothing is sent to the
          server.
        </p>
        <a
          href={HOSTED_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <ExternalLink size={16} />
          Open live site
        </a>
      </div>

      <div className="card mb-4 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Source &amp; feedback
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          FinApp is open source. Bug reports, feature requests, and pull
          requests are welcome on GitHub.
        </p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
        >
          <Github size={16} />
          View on GitHub
        </a>
      </div>

      <div className="card mb-4 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Support development
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          FinApp is free and always will be. If it saves you money (or at least
          helps you track it), a coffee is appreciated but never expected.
        </p>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5E5B] text-white text-sm font-medium hover:bg-[#e54e4b] transition-colors"
        >
          <Heart size={16} />
          Buy me a coffee on Ko-fi
        </a>
      </div>

      <div className="card space-y-2">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Tech stack
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          {[
            ["UI", "React 18 + React Router"],
            ["Styling", "Tailwind CSS"],
            ["Database", "sql.js (SQLite in WASM)"],
            ["State", "Zustand"],
            ["Charts", "Recharts"],
            ["Build", "Vite + PWA"],
          ].map(([layer, lib]) => (
            <div key={layer} className="flex gap-2">
              <span className="font-medium text-slate-500 dark:text-slate-500 w-20 flex-shrink-0">
                {layer}
              </span>
              <span>{lib}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600 pt-1">
          MIT License &mdash;{" "}
          <a
            href={`${GITHUB_URL}/blob/main/LICENSE`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-brand-500 transition-colors"
          >
            view license
          </a>
        </p>
      </div>
    </div>
  );
}
