'use client'

import { useState } from 'react'
import { AppHeader } from './app-header'
import { Section, Field, Tag, LimitationList, Callout } from './data-layout-elements'

export function DataLayout() {
  const [, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Data Sources</h1>
          <p className="mb-10 text-sm text-muted-foreground">
            Every dataset used in Swiss Maps — where it comes from, how fresh it is, what it covers, and what it doesn&apos;t.
          </p>

          {/* ── VOTATIONS ── */}
          <Section title="Votations">
            <dl className="mb-6 grid grid-cols-1 gap-x-8 gap-y-0 rounded-lg border p-4 sm:grid-cols-2">
              <Field label="Source">
                <a href="https://opendata.swiss/en/dataset/echtzeitdaten-am-abstimmungstag-zu-eidgenoessischen-abstimmungsvorlagen" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2">
                  BFS / opendata.swiss
                </a>{' — '} official federal votation results
              </Field>
              <Field label="Coverage">National + 26 cantons + districts + municipalities</Field>
              <Field label="Available dates">Sep 2025, Nov 2025, Mar 2026, Jun 2026</Field>
              <Field label="Freshness">
                <Tag color="green">Published on vote day, updated as communes report in</Tag>
              </Field>
            </dl>

            <h3 className="mb-2 text-sm font-semibold">How results are structured</h3>
            <p className="mb-3 text-sm">
              Each votation date contains all proposals voted on that day, with results at four
              geographic levels: national, cantonal, district, and municipality. Results appear
              incrementally as communes finish counting on the evening of the vote.
            </p>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Proposal types</h3>
            <p className="mb-2 text-sm">Swiss federal ballots can include several types of proposal:</p>
            <div className="mb-3 space-y-1.5 text-sm">
              {[
                ['Mandatory referendum', 'Constitutional amendments — always requires both a popular majority and a cantonal majority (Ständemehr: at least 12 of 23 cantonal votes). Both thresholds must be met.'],
                ['Optional referendum', 'Challenges to acts of parliament — requires only a simple popular majority to reject the law.'],
                ['Popular initiative', 'Citizen-proposed constitutional change — requires both a popular majority and a cantonal majority.'],
                ['Counter-proposal', 'Parliamentary alternative to an initiative — can appear on the same ballot, with a tiebreaker question.'],
              ].map(([label, desc]) => (
                <div key={label as string} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 text-xs font-semibold">{label}:</span>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold">The cantonal majority (Ständemehr)</h3>
            <p className="mb-3 text-sm">
              For mandatory referendums and initiatives, a proposal must win in a majority of cantons,
              not just nationally. Half-cantons (Obwald, Nidwald, Basel-Stadt, Basel-Landschaft,
              Appenzell Ausserrhoden, Appenzell Innerrhoden) count as half a vote each, giving 23 total
              cantonal votes. The threshold is 12. This means a proposal can win the popular vote and
              still fail — or pass with less than 50% nationally — if the cantonal distribution goes
              the other way.
            </p>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Known limitations</h3>
            <LimitationList items={[
              'Only the four most recent dates are available. Older results exist back to 1981 but are not included.',
              'Results may be partial if not all communes have finished counting on vote day.',
              '~1 municipality per canton may not match the boundary file due to commune mergers since 2022.',
            ]} />
          </Section>

          {/* ── DEMOGRAPHICS ── */}
          <Section title="Demographics">
            <dl className="mb-6 grid grid-cols-1 gap-x-8 gap-y-0 rounded-lg border p-4 sm:grid-cols-2">
              <Field label="Main source">
                <a href="https://opendata.swiss/en/dataset/regionalportrats-2021-kennzahlen-aller-gemeinden" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2">
                  BFS Regionalportraits 2021
                </a>{' — '} 30 indicators, ~2130 communes
              </Field>
              <Field label="Religion source">
                BFS Volkszählung 2000 (PxWeb <code className="rounded bg-muted px-1 py-0.5 text-xs">px-x-4003000000_122</code>)
              </Field>
              <Field label="Typology source">
                <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2">
                  swisstopo
                </a>{' — '} agglomeration classification g1a22, 2022
              </Field>
              <Field label="Freshness">
                <Tag color="amber">Most indicators: 2019</Tag>{' '}
                <Tag color="red">Religion: 2000</Tag>{' '}
                <Tag color="green">Typology: 2022</Tag>
              </Field>
            </dl>

            <h3 className="mb-2 text-sm font-semibold">Indicator groups</h3>
            <p className="mb-2 text-sm">
              The 37 indicators are organised into 10 groups, all at municipality level:
            </p>
            <div className="mb-4 space-y-1.5 text-sm">
              {[
                ['Context', 'Urban / periurban / rural typology (swisstopo 2022).'],
                ['Population', 'Total, foreign nationals share, population growth, density, household size.'],
                ['Age', 'Share aged 0–19, 20–64, and 65+.'],
                ['Vital statistics', 'Birth, death, marriage, and divorce rates per 1,000 inhabitants.'],
                ['Land use', 'Share of settlement, agricultural, and wooded area.'],
                ['Economy', 'Employment share in primary (agriculture), secondary (industry), and tertiary (services) sectors.'],
                ['Housing', 'Vacant dwelling rate and new housing units per 1,000 inhabitants.'],
                ['Social', 'Social assistance (Sozialhilfe) rate.'],
                ['Religion', 'Reformed, Catholic, Muslim, Jewish, no religion, and other — from the 2000 census.'],
                ['Politics', 'Vote shares for SVP, SP, FDP, Die Mitte, Greens, GLP, EVP, BDP, and small right parties (2019 National Council elections) plus a computed left–right index.'],
              ].map(([group, desc]) => (
                <div key={group as string} className="flex items-start gap-2">
                  <span className="mt-0.5 w-28 shrink-0 text-xs font-semibold">{group}</span>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Why religion data is from 2000</h3>
            <p className="mb-3 text-sm">
              The 2000 census (<em>Volkszählung</em>) was the last full-population survey where
              religion was recorded for every resident in every commune. Since 2010 the BFS uses
              the <em>Strukturerhebung</em> — a stratified sample of ~200,000 people per year.
              That sample is statistically representative at canton level and for the ~50–60
              largest municipalities, but not for a choropleth covering all ~2,100 Swiss communes.
              No better source exists for municipality-level religion data.
            </p>
            <Callout>
              Commune mergers and renumbering between 2000 and 2022 mean approximately 5–10% of
              BFS numbers won&apos;t match the current boundary file. Those communes appear grey
              (no data) on the religion map.
            </Callout>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Urban / periurban / rural classification</h3>
            <p className="mb-3 text-sm">
              The typology comes from the swisstopo agglomeration shapefile (<em>g1a22</em>).
              Communes are assigned to one of three classes based on their relationship to
              agglomerations: urban cores and suburban belts → <strong>Urban</strong>; periurban
              communes on the agglomeration fringe → <strong>Periurban</strong>; all remaining
              communes → <strong>Rural</strong>. The map uses a categorical 3-colour scale
              rather than a continuous choropleth.
            </p>

            <h3 className="mb-2 mt-5 text-sm font-semibold">Left–right index</h3>
            <p className="mb-3 text-sm">
              A composite score computed as{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">(SVP + FDP) − (SP + Greens + GLP)</code>{' '}
              vote share in the 2019 National Council elections. Positive values (blue) indicate
              a right-leaning commune; negative (red) a left-leaning one. The scale runs roughly
              from −40 to +60 across Swiss municipalities.
            </p>

            <h3 className="mb-2 mt-5 text-sm font-semibold">What is not available</h3>
            <LimitationList items={[
              'Income / median taxable income: BFS Steuerstatistik exists at municipality level but is only distributed as Excel files with no confirmed programmatic API.',
              'Unemployment rate: SECO publishes monthly registered unemployment but no clean municipality-level API endpoint was found.',
              'Religion post-2000: the Strukturerhebung sample is not statistically representative for most of the ~2,100 communes.',
              'Nationality by country of origin: BFS data exists but only down to canton level via the public API.',
              'Language spoken at home: same limitation as post-2000 religion — sample data only, not suitable for a full municipality-level choropleth.',
            ]} />
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

            <h3 className="mb-2 text-sm font-semibold">What is &quot;Business cycle total&quot;?</h3>
            <p className="mb-3 text-sm">
              BAZG publishes two trade totals. This app uses the <strong>business cycle total</strong> (CHF 283B exports).
              The broader <strong>general total</strong> (CHF 394B) adds precious metals, rough diamonds, gemstones,
              works of art, and antiques — assets that transit Switzerland primarily as financial instruments
              through Geneva and Zurich commodity markets, not as goods made or consumed here.
              Excluding them gives a clearer picture of the productive economy.
            </p>
            <Callout>
              The CHF ~111B gap is almost entirely gold. Switzerland is one of the world&apos;s largest gold refining
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
