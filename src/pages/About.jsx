import {
  Github,
  Heart,
  Database,
  Shield,
  ExternalLink,
} from "lucide-react";
import markIron from "@/assets/mark-iron.svg";
import markWhite from "@/assets/mark-white.svg";

const GITHUB_URL = "https://github.com/Stoneguard001/finapp";
const KOFI_URL = "https://ko-fi.com/philallion0979";
const HOSTED_URL = "https://evenkeel.online";

export default function About() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <img src={markIron} alt="EvenKeel" className="w-9 h-9 dark:hidden" />
        <img src={markWhite} alt="EvenKeel" className="w-9 h-9 hidden dark:block" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            About <span className="text-slate-900 dark:text-slate-100">Even</span><span className="text-brand-500">Keel</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Open source personal finance, entirely on your device
          </p>
        </div>
        <a
          href={KOFI_URL}
          target="_blank"
          rel="noreferrer"
          className="ml-auto flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5E5B] text-white text-xs font-medium hover:bg-[#e54e4b] transition-colors"
        >
          <Heart size={13} />
          Buy me a coffee
        </a>
      </div>

      <div className="card mb-4 space-y-4">
        <div className="flex items-start gap-3">
          <Database size={20} className="text-brand-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              What is EvenKeel?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              I built EvenKeel to help plan my own budget. There are plenty of budgeting
              apps out there, but most are more complicated than I need — and nearly all
              of them want your personal finances in the cloud. I didn't want that. So I
              made a{" "}
              Progressive Web App{" "}
              that runs entirely in the browser and keeps your data in a file locally.
              No account, no server, no tracking of any kind.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The core budgeting, tracking, and stats will always be free. If EvenKeel
              takes off I may expand it with additional financial tools down the road —
              but the fundamentals stay free regardless.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              That said, nothing is ever truly free. If EvenKeel saves you time or helps
              you get a handle on your finances, please consider{" "}
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 dark:text-brand-400 underline hover:text-brand-800 dark:hover:text-brand-200 font-medium"
              >
                buying me a coffee on Ko-fi
              </a>
              . It means a lot and helps keep the project going.
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
          The live site is available at evenkeel.online — no install required.
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
          EvenKeel is open source. Bug reports, feature requests, and pull
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
          EvenKeel is free and always will be. If it saves you money (or at least
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
