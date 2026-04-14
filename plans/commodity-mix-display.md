---
status: active
branch: wt-cor-9-search-system
worktree: /Users/azendo/WebstormProjects/wt-cor-9-search-system
created: 2026-04-14
topic: commodity-mix-display
---

# Commodity Mix Display Implementation Plan

**Goal:** Replace the single-string "top commodity" cell on company cards with a top-2 chip display plus overflow popover, sourced from a share-of-total-shipments distribution — so "unknown" never appears in the UI and small percentages imply sparsity by themselves.

**Architecture:** Three isolated layers. (1) dbt `companies_baseline.sql` recomputes `commodity_mix.share` against total shipments instead of tagged subset. (2) `unifiedSearch.ts` exposes the mix array through the API with dedup/floor/sort applied in the row mapper. (3) New `CommodityMixChips` + `CommodityMixPopover` components replace the current string cell in `CompanyCard.tsx`.

**Tech Stack:** ClickHouse / dbt, Next.js API + Zod, React + Tailwind + Radix Popover.

**Design spec:** `docs/specs/2026-04-14-commodity-mix-display-design.md`
**Total tasks:** 3 (1 [LOW], 2 [MED])
**Estimated agent budget:** 5 agents (1×1 LOW + 2×2 MED)

---

## Task 1: dbt — recompute commodity_mix.share against total shipments `[LOW]`

**Files:**
- Modify: `coreties/models/example/companies_baseline.sql` (commodity_ranked CTE, ~line 436–454)
- Modify: `coreties/models/example/_companies_baseline_unit_tests.yml`

**Context:** Today `company_shipments = sum(shipments) OVER (PARTITION BY company_slug)` inside `commodity_ranked` — but the window runs over `commodity_counts`, which is already filtered to rows with `commodity_group != '' OR commodity_name != '' OR industry_sector != ''`. So the denominator is "shipments that have commodity tags", not total shipments. A company with 8% tagged Apparel gets `share = 1.0` (100% of tagged), which then renders as "Apparel 100%" in the UI — the exact misleading display the spec is eliminating.

The fix: join `company_core.shipments_total` into `commodity_ranked` and use that as the share denominator. `company_core` is already computed upstream in the same file (~line 206) and keys on `company_slug`.

**Steps:**
- [ ] Open `coreties/models/example/companies_baseline.sql`. In the `commodity_ranked` CTE (~line 436), replace `sum(shipments) OVER (PARTITION BY company_slug) AS company_shipments` with a LEFT JOIN to `company_core` pulling `shipments_total`. Rename the column `total_shipments_for_share` for clarity.
- [ ] In the `commodity_agg` CTE (~line 469), update the share tuple element to use the new column: `toFloat32(round(toFloat64(shipments) / nullIf(total_shipments_for_share, 0), 4))`.
- [ ] Open `coreties/models/example/_companies_baseline_unit_tests.yml`. Add a unit test case: company with 100 total shipments, 5 Apparel shipments tagged, 3 Electronics tagged, 92 untagged. Assert `commodity_mix` contains exactly `(Apparel, share=0.05)` and `(Electronics, share=0.03)`, and `arraySum(arrayMap(cm -> tupleElement(cm, 7), commodity_mix)) = 0.08` (NOT 1.0).
- [ ] Run the dbt unit test locally: `cd coreties && dbt test --select companies_baseline` (or the equivalent command the repo uses — check `coreties/README*` if unsure). Expect PASS.
- [ ] Commit: `fix(dbt): compute commodity_mix share against total shipments`

---

## Task 2: API — expose commodityMix array through /api/search/unified `[MED]`

**Files:**
- Modify: `src/coreties-app/lib/unifiedSearch.ts`
- Modify: `src/coreties-app/__tests__/unit/unifiedSearchResponseSchema.test.ts`
- Modify: `src/coreties-app/__tests__/unit/unifiedSearch.test.ts` (mapper unit test)

**Context:** `companies_search` already exposes `commodity_mix AS commodity_mix_top10` (see `coreties/models/example/companies_search.sql:210`). The API currently only selects `top_commodity_group` (`unifiedSearch.ts:170`). This task selects the tuple array, adds a Zod `commodityMixEntrySchema`, extends `unifiedSearchCompanySchema` with a `commodityMix` array field, and implements the row mapper transformation: tuple-array → dedup-by-group → filter share ≥ 0.02 → sort DESC → cap at 10. `topCommodityGroup` stays in the schema for backward compatibility (other callers may read it).

**Tuple positions in `commodity_mix_top10`** (from `companies_baseline.sql:461–473`):
`(mode=0, role=1, commodity_group=2, commodity_name=3, industry_sector=4, shipments=5, share=6, volume_teu=7, volume_kg=8, last_shipment_date=9)`.

Note ClickHouse tuple indexing is 1-based in SQL (`tupleElement(cm, 3)` = group), but the Node client returns tuples as JS arrays with 0-based indexing — so `row[2]` = group, `row[5]` = shipments, `row[6]` = share. Verify this matches how `lane_country_pairs` (also a groupArray tuple) is parsed elsewhere in the file before implementing.

**Steps:**

- [ ] **Extend the Zod schema.** In `src/coreties-app/lib/unifiedSearch.ts`, after `unifiedSearchQuerySchema` (before `unifiedSearchCompanySchema`), add:
  ```ts
  export const commodityMixEntrySchema = z.object({
    group: z.string(),
    share: z.number().min(0).max(1),
    shipments: z.number().int().nonnegative(),
  });
  export type CommodityMixEntry = z.infer<typeof commodityMixEntrySchema>;
  ```
  Then add to `unifiedSearchCompanySchema` (keep existing fields as-is):
  ```ts
  commodityMix: z.array(commodityMixEntrySchema).default([]),
  ```

- [ ] **Extend `UnifiedSearchRow` interface** (~line 62): add `commodity_mix_top10?: unknown;` — the raw tuple array comes back as `unknown` until parsed.

- [ ] **Update the SELECT.** In `buildUnifiedSearchQueries`, add `c.commodity_mix_top10` to the `dataQuery` SELECT list (~line 170, next to `top_commodity_group`).

- [ ] **Write the failing mapper test first.** Open `src/coreties-app/__tests__/unit/unifiedSearch.test.ts` (create if absent — follow pattern from `unifiedSearchResponseSchema.test.ts`). Add a `describe('mapUnifiedSearchRow commodityMix', ...)` block with three cases:

  ```ts
  describe('mapUnifiedSearchRow commodityMix', () => {
    const baseRow = { /* minimal valid UnifiedSearchRow — copy from existing fixture */ };

    it('dedups same group across modes/roles by summing shares', () => {
      const row = {
        ...baseRow,
        commodity_mix_top10: [
          ['ocean', 'shipper', 'Apparel', '', '', 40, 0.40, 0, 0, '2026-01-01'],
          ['ocean', 'consignee', 'Apparel', '', '', 30, 0.30, 0, 0, '2026-01-01'],
          ['ocean', 'shipper', 'Electronics', '', '', 10, 0.10, 0, 0, '2026-01-01'],
        ],
      };
      const result = mapUnifiedSearchRow(row);
      expect(result.commodityMix).toEqual([
        { group: 'Apparel', share: 0.70, shipments: 70 },
        { group: 'Electronics', share: 0.10, shipments: 10 },
      ]);
    });

    it('filters entries with share < 0.02', () => {
      const row = {
        ...baseRow,
        commodity_mix_top10: [
          ['ocean', 'shipper', 'Apparel', '', '', 50, 0.50, 0, 0, '2026-01-01'],
          ['ocean', 'shipper', 'Tail', '', '', 1, 0.01, 0, 0, '2026-01-01'],
        ],
      };
      expect(mapUnifiedSearchRow(row).commodityMix.map(e => e.group)).toEqual(['Apparel']);
    });

    it('sorts by share DESC and returns [] for empty/missing input', () => {
      const emptyRow = { ...baseRow, commodity_mix_top10: undefined };
      expect(mapUnifiedSearchRow(emptyRow).commodityMix).toEqual([]);

      const unsortedRow = {
        ...baseRow,
        commodity_mix_top10: [
          ['ocean', 'shipper', 'B', '', '', 10, 0.10, 0, 0, '2026-01-01'],
          ['ocean', 'shipper', 'A', '', '', 40, 0.40, 0, 0, '2026-01-01'],
        ],
      };
      const result = mapUnifiedSearchRow(unsortedRow);
      expect(result.commodityMix.map(e => e.group)).toEqual(['A', 'B']);
    });
  });
  ```

- [ ] Run the tests: `cd src/coreties-app && npm run test -- unifiedSearch.test.ts`. Expect FAIL (mapper doesn't produce `commodityMix` yet).

- [ ] **Implement the mapper.** In `mapUnifiedSearchRow` (~line 261), before the `return` statement, add:

  ```ts
  const commodityMix = parseCommodityMix(row.commodity_mix_top10);
  ```

  And add `commodityMix,` to the returned object. Then add the helper at the bottom of the file (alongside `parseStringArray` et al.):

  ```ts
  function parseCommodityMix(raw: unknown): CommodityMixEntry[] {
    if (!Array.isArray(raw)) return [];
    const byGroup = new Map<string, { shipments: number; share: number }>();
    for (const tup of raw) {
      if (!Array.isArray(tup) || tup.length < 7) continue;
      const group = String(tup[2] ?? '').trim();
      if (!group) continue;
      const shipments = Number(tup[5] ?? 0);
      const share = Number(tup[6] ?? 0);
      if (!Number.isFinite(share) || share <= 0) continue;
      const existing = byGroup.get(group);
      if (existing) {
        existing.shipments += shipments;
        existing.share += share;
      } else {
        byGroup.set(group, { shipments, share });
      }
    }
    return Array.from(byGroup.entries())
      .map(([group, v]) => ({ group, shipments: v.shipments, share: v.share }))
      .filter(e => e.share >= 0.02)
      .sort((a, b) => b.share - a.share)
      .slice(0, 10);
  }
  ```

- [ ] Run the tests again: `cd src/coreties-app && npm run test -- unifiedSearch.test.ts`. Expect PASS.

- [ ] **Update the response-schema fixture test.** Open `src/coreties-app/__tests__/unit/unifiedSearchResponseSchema.test.ts`. Add `commodityMix: []` (or a populated array) to at least one fixture company, and add an assertion that the parsed response's first item has `commodityMix` as an array. Run: `npm run test -- unifiedSearchResponseSchema.test.ts`. Expect PASS.

- [ ] Commit: `feat(api): expose commodityMix array via unified search`

---

## Task 3: UI — CommodityMixChips + popover on CompanyCard `[MED]`

**Files:**
- Create: `src/coreties-app/components/search/CommodityMixChips.tsx`
- Create: `src/coreties-app/components/search/CommodityMixPopover.tsx`
- Modify: `src/coreties-app/components/search/CompanyCard.tsx` (commodity cell at ~line 229–233)
- Check: `src/coreties-app/package.json` for `@radix-ui/react-popover`

**Context:** Replace the single-string commodity cell with up to 2 colored chips. If more than 2 groups are present above the 2% floor, render a `+N more` badge after the chips that opens a popover listing the top 5 groups. Visual reference: `coreties/factory/pages/commodity-mix-chips/commodity-mix-chips-v4.html`, Card B (NOTE: this path is in the `main` checkout, not this worktree — inspect there for the exact markup). The current commodity cell's label uses the class `text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2` (not `cell-label` as abbreviated in the spec).

**Color scheme** (deterministic by chip index, not group name):

| Index | Chip classes | Popover dot |
|---|---|---|
| 0 | `bg-indigo-50 text-indigo-700` (add `font-semibold` when `share >= 0.5`) | `bg-indigo-500` |
| 1 | `bg-emerald-50 text-emerald-700` | `bg-emerald-500` |
| 2 | `bg-amber-50 text-amber-700` | `bg-amber-500` |
| 3 | `bg-rose-50 text-rose-700` | `bg-rose-400` |
| 4 | `bg-sky-50 text-sky-700` | `bg-sky-400` |

**Steps:**

- [ ] **Confirm Radix Popover is available.** Check `src/coreties-app/package.json` for `@radix-ui/react-popover`. If absent, add it with the exact version currently used by other `@radix-ui/*` packages in the file (no caret — pin exact version per project convention). Install: `cd src/coreties-app && npm install --save-exact @radix-ui/react-popover@<version>`.

- [ ] **Create `CommodityMixChips.tsx`.** Minimal implementation:

  ```tsx
  import * as Popover from '@radix-ui/react-popover';
  import { CommodityMixEntry } from '@/lib/unifiedSearch';
  import { CommodityMixPopover } from './CommodityMixPopover';

  const CHIP_CLASSES = [
    'bg-indigo-50 text-indigo-700',
    'bg-emerald-50 text-emerald-700',
  ];

  interface Props {
    mix: CommodityMixEntry[];
    totalShipments: number;
  }

  export function CommodityMixChips({ mix, totalShipments }: Props) {
    if (!mix || mix.length === 0) {
      return <p className="text-[15px] font-medium text-slate-400">—</p>;
    }
    const top2 = mix.slice(0, 2);
    const overflow = mix.length - 2;

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {top2.map((entry, i) => (
          <span
            key={entry.group}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] ${CHIP_CLASSES[i]} ${i === 0 && entry.share >= 0.5 ? 'font-semibold' : 'font-medium'}`}
          >
            {entry.group} {Math.round(entry.share * 100)}%
          </span>
        ))}
        {overflow > 0 && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-600 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={`Show ${overflow} more commodity groups`}
              >
                +{overflow} more
              </button>
            </Popover.Trigger>
            <CommodityMixPopover mix={mix} totalShipments={totalShipments} />
          </Popover.Root>
        )}
      </div>
    );
  }
  ```

- [ ] **Create `CommodityMixPopover.tsx`.** Renders inside `Popover.Portal` + `Popover.Content`:

  ```tsx
  import * as Popover from '@radix-ui/react-popover';
  import { CommodityMixEntry } from '@/lib/unifiedSearch';

  const DOT_CLASSES = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-400',
    'bg-sky-400',
  ];

  interface Props {
    mix: CommodityMixEntry[];
    totalShipments: number;
  }

  export function CommodityMixPopover({ mix, totalShipments }: Props) {
    const top5 = mix.slice(0, 5);
    return (
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg focus:outline-none"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Commodity Mix · Top {top5.length}
          </p>
          <ul className="mt-2 space-y-1.5">
            {top5.map((entry, i) => (
              <li key={entry.group} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className={`h-2 w-2 rounded-full ${DOT_CLASSES[i] ?? 'bg-slate-400'}`} />
                  {entry.group}
                </span>
                <span className="font-medium tabular-nums text-slate-900">
                  {Math.round(entry.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500">
            Share of {totalShipments.toLocaleString()} total shipments · based on customs filings
          </p>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    );
  }
  ```

- [ ] **Wire into `CompanyCard.tsx`.** Open at ~line 229. Replace:
  ```tsx
  {/* Commodity */}
  <div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Commodity</p>
    <p className="text-[15px] font-medium text-slate-800 truncate">{item.topCommodityGroup ?? '—'}</p>
  </div>
  ```
  With:
  ```tsx
  {/* Commodity */}
  <div>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Commodity</p>
    <CommodityMixChips mix={item.commodityMix} totalShipments={item.shipments12m} />
  </div>
  ```
  Add import at the top: `import { CommodityMixChips } from './CommodityMixChips';`

- [ ] **Type check.** `cd src/coreties-app && npm run lint` (or `npx tsc --noEmit` if lint doesn't cover TS). Expect PASS.

- [ ] **Run full test suite.** `cd src/coreties-app && npm run test`. Expect PASS.

- [ ] **Visual verification (manual, non-blocking for commit).** Start `npm run dev`, open the search page, and confirm against the three scenarios from the spec:
  - Specialist — single chip >50% rendered in bold
  - Diversified — two chips + "+N more" badge; popover opens on click and Tab+Enter
  - Sparse — single or no chips, no badge, small percentages implying coverage gap
  - Esc closes popover and returns focus to the badge.

- [ ] Commit: `feat(search): commodity mix chips with overflow popover on company card`

---

## Post-execution

After all three tasks are committed on `wt-cor-9-search-system`, mark the plan completed (frontmatter `status: completed`) and hand off to the user for WebStorm review before PR. Per the session rule, DO NOT open or merge a PR autonomously — the user reviews line-by-line in WebStorm first.
