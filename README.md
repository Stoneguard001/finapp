# EvenKeel

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live site](https://img.shields.io/badge/site-live-brightgreen)](https://evenkeel.online)

A fully local personal finance app. No account, no server, no tracking — your data lives in a SQLite file on your own machine.

## How it works

EvenKeel runs entirely in the browser using [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly). When you open or create a database, the entire `.sqlite` file is loaded into memory. The File System Access API lets the app write changes back to the same file directly; on browsers without that API it falls back to downloading a new copy.

## Live site

Available at **[evenkeel.online](https://evenkeel.online)** — no install required. Your data stays entirely in your browser.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You'll be greeted with the Welcome screen — choose **New Database** to start fresh or **Open Database** to load an existing `.sqlite` file.

## Pages

| Page             | What it does                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard**    | KPI cards (spent, income, budget total, over-budget count), 6-month income vs. expenses bar chart, top spending categories, and budget progress bars |
| **Transactions** | Browse, filter, add, and edit individual transactions                                                                                                |
| **Accounts**     | Manage accounts (checking, savings, credit, investment, loan)                                                                                        |
| **Budgets**      | Set per-category spending limits with weekly / monthly / quarterly / semi-annual / annual periods                                                    |
| **Categories**   | View and manage spending categories; each has an icon, color, and optional parent                                                                    |
| **Import**       | Import bank statements and auto-categorize transactions                                                                                              |

## Importing transactions

The Import page accepts three file formats:

- **CSV** — auto-detects institution format: Chase, Bank of America, American Express, Capital One, or generic fallback
- **Excel** (`.xlsx` / `.xls`) — same column detection logic as generic CSV
- **PDF** — extracts text from bank statement PDFs using pdf.js

After parsing, each transaction is run through **category rules** (substring / starts-with / regex patterns stored in the database) to auto-assign a category. You can override any category in the preview table before confirming the import. Duplicate detection (same account + date + amount + description) automatically skips rows that are already in the database.

## Data model

```
accounts          — financial accounts with type and currency
categories        — hierarchical spending categories with icon and color
category_rules    — pattern-matching rules that auto-categorize transactions on import
transactions      — dated entries linked to an account and optional category
budgets           — spending limits linked to a category, with a recurrence period
import_sessions   — audit log of each file import
settings          — key/value store for app preferences
```

## Tech stack

| Layer         | Library                    |
| ------------- | -------------------------- |
| UI            | React 18 + React Router v6 |
| Styling       | Tailwind CSS               |
| Database      | sql.js (SQLite in WASM)    |
| State         | Zustand                    |
| Charts        | Recharts                   |
| CSV parsing   | PapaParse                  |
| Excel parsing | SheetJS (xlsx)             |
| PDF parsing   | pdf.js                     |
| Build         | Vite + vite-plugin-pwa     |

## Saving your data

Use the **Save** / **Save As** buttons in the header to persist changes. The app saves to a `.sqlite` file named `evenkeel-YYYY-MM-DD.sqlite`. If your browser supports the File System Access API (Chrome / Edge), it can write back to the same file you opened so you never need to think about it. Firefox falls back to a download prompt.

## Self-hosting

Each [GitHub Release](https://github.com/Stoneguard001/finapp/releases) includes a pre-built zip you can drop onto any static web server.

1. Download `evenkeel-vX.Y.Z.zip` from the Releases page
2. Extract the contents to your web server's document root (or a subdirectory)
3. Configure your server to send these two headers on **every** response — they are required for the SQLite WASM engine (`SharedArrayBuffer`):

   ```
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
   ```

**Nginx**

```nginx
add_header Cross-Origin-Opener-Policy "same-origin";
add_header Cross-Origin-Embedder-Policy "require-corp";
```

**Apache** (`.htaccess`)

```apache
Header always set Cross-Origin-Opener-Policy "same-origin"
Header always set Cross-Origin-Embedder-Policy "require-corp"
```

**Caddy**

```caddy
header {
    Cross-Origin-Opener-Policy "same-origin"
    Cross-Origin-Embedder-Policy "require-corp"
}
```

> **Subdirectory hosting:** The standard release zip expects to be served from a domain root. To host at a subdirectory (e.g. `example.com/budget/`), clone the repo and build with:
>
> ```bash
> npx vite build --base=/budget/
> ```
>
> Then deploy the `dist/` folder to your subdirectory.

## Contributing

Bug reports and feature requests are welcome — please [open an issue](https://github.com/Stoneguard001/finapp/issues).

Pull requests are also welcome. For larger changes, open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
