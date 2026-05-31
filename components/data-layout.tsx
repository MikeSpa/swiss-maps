'use client'

import { useState } from 'react'
import { AppHeader } from './app-header'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

function Tag({ color, children }: { color: 'green' | 'amber' | 'red' | 'blue'; children: React.ReactNode }) {
  const cls = {
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    red:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    blue:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  }[color]
  return <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
}

function LimitationList({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950/30">
      {children}
    </div>
  )
}

export function DataLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Data Sources</h1>
          <p className="mb-10 text-sm text-muted-foreground">
            Every dataset used in Swiss Maps — where it comes from, how fresh it is, what it covers, and what it doesn't.
          </p>

          {/* ── VOTATIONS ── */}
          <Section title="Votations">
            <p className="mb-4 text-sm text-muted-foreground italic">Coming soon.</p>
          </Section>

          {/* ── DEMOGRAPHICS ── */}
          <Section title="Demographics">
            <p className="mb-4 text-sm text-muted-foreground italic">Coming soon.</p>
          </Section>

          {/* ── TRADE ── */}
          <Section title="Trade">
            <dl className="mb-6 grid grid-cols-1 gap-x-8 gap-y-0 rounded-lg border p-4 sm:grid-cols-2">
              <Field label="Bilateral totals">
                <a href="https://www.bazg.admin.ch" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2">
                  BAZG Annual Report 2024
                </a>{' — '} 245 countries, 2024 actuals
              </Field>
              <Field label="Sector breakdown">
                <a href="https://www.swissimpex.admin.ch" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2">
                  SwissImpex (BAZG)
                </a>{' — '} HS8 tariff × country, 2025 (full year)
              </Field>
              <Field label="Currency">CHF millions</Field>
              <Field label="Freshness">
                <Tag color="green">Bilateral: 2024 final</Tag>{' '}
                <Tag color="green">Sectors: 2025</Tag>
              </Field>
            </dl>

            <h3 className="mb-2 text-sm font-semibold">What is "Business cycle total"?</h3>
            <p className="mb-3 text-sm">
              BAZG publishes two trade totals. This app uses the <strong>business cycle total</strong> (CHF 283B exports).
              The broader <strong>general total</strong> (CHF 394B) adds precious metals, rough diamonds, gemstones,
              works of art, and antiques — assets that transit Switzerland primarily as financial instruments
              through Geneva and Zurich commodity markets, not as goods made or consumed here.
              Excluding them gives a clearer picture of the productive economy.
            </p>
            <Callout>
              The CHF ~111B gap is almost entirely gold. Switzerland is one of the world's largest gold refining
              and trading hubs — significant economic activity, but it inflates bilateral trade figures in ways
              that distort a geographic visualization.
            </Callout>

            <h3 className="mb-2 mt-5 text-sm font-semibold">The Slovenia anomaly</h3>
            <p className="mb-3 text-sm">
              Slovenia ranks #3 in both Swiss exports (CHF 26.4B) and imports (CHF 17.9B) — striking for a
              country of 2 million people. This is real data. It reflects pharmaceutical supply chains:
              several large pharma companies have major manufacturing sites in Slovenia producing active
              pharmaceutical ingredients, which are shipped to Switzerland for formulation then exported globally.
              The bilateral figures capture these intermediate flows.
            </p>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Trade agreement status</h3>
            <p className="mb-2 text-sm">Each partner is tagged with its current agreement status with Switzerland:</p>
            <div className="mb-3 space-y-1.5 text-sm">
              {[
                ['EU Bilateral', 'blue', '27 EU member states — covered by the 1999/2004 Bilateral Agreements and the 1972 FTA on industrial goods. Bilaterals III (signed March 2026) is in parliamentary ratification.'],
                ['FTA in force', 'green', 'Free trade agreements currently in effect, concluded bilaterally or through EFTA. Includes China (2014), Japan (2009), South Korea, Singapore, Hong Kong, Canada, Mexico, GCC states, and others.'],
                ['Framework agreed', 'amber', 'US–Switzerland–Liechtenstein Trade and Investment Framework Agreement. A dialogue mechanism, not a preferential agreement.'],
                ['Under negotiation', 'amber', 'UK and Vietnam: enhanced FTAs under active negotiation.'],
                ['Signed, pending', 'amber', 'EFTA–India Trade and Economic Partnership Agreement (signed March 2024, awaiting ratification).'],
                ['No FTA', 'red', 'No preferential agreement. Includes Brazil, Turkey, Taiwan, Russia, and others.'],
              ].map(([label, color, desc]) => (
                <div key={label as string} className="flex items-start gap-2">
                  <Tag color={color as 'green' | 'amber' | 'red' | 'blue'}>{label}</Tag>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold">About the sector breakdown</h3>
            <p className="mb-3 text-sm">
              The per-country sector breakdown (visible in the sidebar and on hover) comes from a
              separate dataset: SwissImpex transaction-level data at the 8-digit HS tariff number,
              covering 2025. Because the sector data is one year newer than the bilateral totals,
              the sector <em>shares</em> (percentages) are used rather than absolute values —
              the sector mix changes slowly year to year, so 2025 shares are a reliable approximation
              of 2024 sector composition.
            </p>
            <Callout>
              Financial trading hubs (Singapore, Hong Kong, UAE) show lower import volumes in the sector
              dataset than in the bilateral totals. This is a known methodological difference: some commodity
              and financial goods flows are not captured by transport-mode declarations. The sector
              <em> shares</em> for these countries remain reliable; only the absolute volumes are
              underrepresented.
            </Callout>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Known limitations</h3>
            <LimitationList items={[
              'Partners with very small bilateral trade (below CHF 100M) are not displayed.',
              'Precious metals and gems are deliberately excluded from all figures. See SwissImpex for the full general total including these flows.',
              '2024 bilateral figures are based on monthly accumulations published through May 2025 and may be subject to minor revision.',
              'Sector breakdown uses 2025 data (full year) as a proxy for 2024 sector composition. The sector mix changes slowly, making this a reliable approximation.',
            ]} />
          </Section>
        </div>
      </main>
    </div>
  )
}
