import { HelpCircle, LayoutDashboard, ArrowLeftRight, PiggyBank, Wallet, Upload, Tag, ListFilter, Link, ChevronDown, ChevronRight, Info } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useState } from 'react'

function Section({ icon: Icon, title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 text-left"
      >
        <Icon size={20} className="text-brand-500 flex-shrink-0" />
        <h2 className="flex-1 text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>
      {open && <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">{children}</div>}
    </div>
  )
}

function Step({ n, children }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 text-xs font-bold flex items-center justify-center">{n}</span>
      <p className="pt-0.5">{children}</p>
    </div>
  )
}

function Tip({ children }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
      <span className="font-semibold text-slate-700 dark:text-slate-300">Tip: </span>{children}
    </div>
  )
}

export default function Help() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle size={28} className="text-brand-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Help &amp; Guide</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Everything you need to get started with FinApp</p>
        </div>
      </div>

      <Section icon={LayoutDashboard} title="Getting Started">
        <p>FinApp stores all your data in a single <strong className="text-slate-800 dark:text-slate-200">.db file</strong> on your device — nothing is sent to a server.</p>
        <div className="space-y-2">
          <Step n="1">On the Welcome screen, click <strong className="text-slate-800 dark:text-slate-200">New Database</strong> to create a fresh file, or <strong className="text-slate-800 dark:text-slate-200">Open Database</strong> to load an existing one.</Step>
          <Step n="2">Set up your <strong className="text-slate-800 dark:text-slate-200">Accounts</strong> first — these represent your bank accounts, credit cards, or investment accounts.</Step>
          <Step n="3">Add <strong className="text-slate-800 dark:text-slate-200">Categories</strong> to label your spending (e.g. Groceries, Rent, Insurance).</Step>
          <Step n="4">Import transactions or add them manually, then set up Budgets to track your spending goals.</Step>
        </div>
        <Tip>Enable Auto-Save in the header so your changes are saved automatically whenever you make edits.</Tip>
      </Section>

      <Section icon={Wallet} title="Accounts">
        <p>Accounts track where your money lives. Go to <strong className="text-slate-800 dark:text-slate-200">Accounts</strong> and click <strong className="text-slate-800 dark:text-slate-200">Add Account</strong> to create one.</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Supported types: Checking, Savings, Credit, Investment, Loan</li>
          <li>Each account has a color for easy identification in charts</li>
          <li>Archived accounts are hidden from dropdowns but their transactions are preserved</li>
        </ul>
        <Tip>Enter an opening balance when creating an account so your net worth on the Dashboard starts accurate.</Tip>
      </Section>

      <Section icon={ArrowLeftRight} title="Transactions">
        <p>Transactions are individual income or expense entries tied to an account.</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Use the month/year controls at the top to navigate between periods</li>
          <li>Search by description, or filter by account, category, or tag</li>
          <li>Click a row to edit the category, tag, amount, or linked budget item</li>
          <li>Negative amounts are expenses; positive amounts are income</li>
          <li>Toggle <strong className="text-slate-800 dark:text-slate-200">Transfer</strong> on a transaction to mark it as a transfer between your own accounts — transfers are excluded from income/expense totals and budget spending</li>
        </ul>
        <Tip>Assign categories to transactions so the Dashboard pie chart and Budget progress bars stay accurate.</Tip>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tags</p>
          <p>Tags are free-form labels you can add to transactions for tracking that doesn't fit into categories — for example "Business", "Reimbursable", or "Vacation".</p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>To create a tag, open any transaction, click the tag field, type a name, choose a color, and click <strong className="text-slate-800 dark:text-slate-200">Add tag</strong></li>
            <li>A transaction can have multiple tags</li>
            <li>Filter the transaction list by tag using the tag row that appears below the search bar</li>
            <li>Tags can also be attached to Rules so they are applied automatically whenever a matching transaction is imported</li>
          </ul>
        </div>
      </Section>

      <Section icon={Upload} title="Importing Transactions">
        <p>Go to <strong className="text-slate-800 dark:text-slate-200">Import</strong> and drop a CSV, Excel, or PDF file exported from your bank.</p>
        <div className="space-y-2">
          <Step n="1">Upload your file. For PDFs, map the columns (date, description, amount) to the correct fields.</Step>
          <Step n="2">Review the preview table. FinApp auto-assigns categories based on your Rules — you can override any row before confirming.</Step>
          <Step n="3">Click <strong className="text-slate-800 dark:text-slate-200">Save as Rule</strong> on any row to create a permanent auto-categorization rule for similar transactions in the future.</Step>
          <Step n="4">Click <strong className="text-slate-800 dark:text-slate-200">Import</strong> to confirm. Duplicate transactions (same account, date, amount, description) are flagged and skipped.</Step>
        </div>
      </Section>

      <Section icon={PiggyBank} title="Budgets">
        <p>Budgets let you set spending targets per category — for both expenses and income. Go to <strong className="text-slate-800 dark:text-slate-200">Budgets</strong> and click <strong className="text-slate-800 dark:text-slate-200">Add Budget Item</strong>.</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Choose a category and enter the budgeted amount and period (weekly, monthly, quarterly, semi-annual, or annual)</li>
          <li>Toggle between <strong className="text-slate-800 dark:text-slate-200">Monthly</strong> and <strong className="text-slate-800 dark:text-slate-200">Annual</strong> view using the buttons at the top</li>
          <li>Expense progress bars turn yellow at 80% and red when over budget</li>
          <li>Click a category name to collapse or expand its detail — click a group header to collapse the whole group</li>
          <li>Click the arrow on any budget line item to expand it and see all matched transactions</li>
        </ul>
        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Income Budgets</p>
          <p>If any of your categories are marked as <strong className="text-slate-800 dark:text-slate-200">Income</strong>, you can create budget items for them to track expected earnings alongside expenses.</p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>When income budget items exist, the page splits into <strong className="text-slate-800 dark:text-slate-200">Income</strong> and <strong className="text-slate-800 dark:text-slate-200">Expenses</strong> sections</li>
            <li>A summary bar at the top shows <strong className="text-slate-800 dark:text-slate-200">Expected Income</strong>, <strong className="text-slate-800 dark:text-slate-200">Budgeted Expenses</strong>, and <strong className="text-slate-800 dark:text-slate-200">Projected Net</strong> — green when you expect to come out ahead, red when expenses exceed income</li>
            <li>Income progress bars track how much has been received — receiving more than expected is shown positively (no red warning)</li>
          </ul>
          <Tip>Mark a category as Income when creating or editing it on the Categories page, then add a budget item for it (e.g. Salary → $5,000/month).</Tip>
        </div>
      </Section>

      <Section icon={Link} title="Linking Transactions to Budget Items">
        <p>
          By default, FinApp matches transactions to budget items by category. You can also <strong className="text-slate-800 dark:text-slate-200">explicitly link</strong> a transaction to a specific budget item — this is especially useful for non-monthly budgets like annual insurance premiums.
        </p>
        <div className="space-y-2">
          <Step n="1">Open a transaction by clicking it in the Transactions list.</Step>
          <Step n="2">Select a <strong className="text-slate-800 dark:text-slate-200">Category</strong>. Once a category is chosen, a <strong className="text-slate-800 dark:text-slate-200">Budget Item</strong> dropdown appears showing all budget items in that category.</Step>
          <Step n="3">Pick the specific budget item this transaction belongs to (e.g. "Car Insurance — $1,200/annual") and save.</Step>
        </div>
        <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-3 py-2 text-xs text-brand-800 dark:text-brand-300 space-y-1">
          <p className="font-semibold">How amortization works in Monthly view:</p>
          <p>When a transaction is linked to a non-monthly budget item, its amount is spread across the budget period. For example, a $1,200 annual budget item shows as $100/month. A single $300 payment linked to it counts as $25 against each month's $100 target.</p>
        </div>
        <p>In the Budgets expanded view, explicitly linked transactions show a <span className="inline-block w-2 h-2 rounded-full bg-brand-500 align-middle mx-0.5"></span> green dot; implicitly matched ones (same category, unlinked) appear without it.</p>
        <Tip>Use explicit linking when one category has multiple budget items — for example, two different insurance policies both categorized as "Insurance."</Tip>
      </Section>

      <Section icon={Tag} title="Categories & Auto-Categorization">
        <p>Categories label your transactions. Go to <strong className="text-slate-800 dark:text-slate-200">Categories</strong> to manage them.</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>Each category has a custom icon and color</li>
          <li>Add keyword rules in Categories to auto-assign a category when a matching description is imported</li>
          <li>For more control, use the <strong className="text-slate-800 dark:text-slate-200">Rules</strong> page to set pattern type (contains, starts with, regex) and priority order</li>
        </ul>
        <Tip>Higher priority numbers are matched first. Put specific rules (like exact merchant names) at a higher priority than generic ones.</Tip>
      </Section>

      <Section icon={ListFilter} title="Rules">
        <p>Rules automatically assign categories (and optional tags) to transactions when they are imported.</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li><strong className="text-slate-800 dark:text-slate-200">Contains</strong> — matches if the description includes the pattern anywhere</li>
          <li><strong className="text-slate-800 dark:text-slate-200">Starts with</strong> — matches if the description begins with the pattern</li>
          <li><strong className="text-slate-800 dark:text-slate-200">Regex</strong> — full regular expression for complex matching (<a href="https://regex101.com" target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 underline hover:text-brand-800 dark:hover:text-brand-200">regex101.com</a> is a useful reference)</li>
          <li>Drag rows to reorder priority, or edit the priority number directly</li>
        </ul>
      </Section>

      <div className="mt-2 flex justify-center">
        <RouterLink
          to="/about"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
        >
          <Info size={13} />
          About FinApp &amp; source code
        </RouterLink>
      </div>
    </div>
  )
}
