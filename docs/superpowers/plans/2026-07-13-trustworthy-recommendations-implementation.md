# Trustworthy School Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an evidence-aware, versioned Top 10 recommendation workflow that ranks strict 408 school-major offerings without treating missing or low-granularity data as reliable admission evidence.

**Architecture:** Normalize each offering into separate evidence dimensions and comparable admissions metrics, then calculate match, competition, confidence, and risk as independent outputs. The API binds every result to a snapshot hash, algorithm version, and normalized query; the UI presents a compact Top 10 plus complete results. Snapshot validation blocks anomalous data before deployment.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Vitest, Node.js sync scripts, GitHub Actions, Vercel.

## Global Constraints

- Strict 408 means the fourth exam subject code is exactly `408`.
- Recommendation scores are relative rankings, never admission probabilities.
- School lines and national lines cannot be presented as professional lines.
- Records with only school/national lines, conflicting evidence, or missing critical evidence are `待核验`.
- Low-confidence records cannot enter the trusted Top 10.
- Institution tier is a filter and tie-break explanation, not a direct score component.
- Background-friendliness reputation does not affect score or hard eligibility.
- Recommendation reasons are deterministic and traceable to structured fields.
- Data refresh runs every 6 hours; invalid snapshots do not replace the current verified snapshot.

---

### Task 1: Evidence And Admissions Metric Model

**Files:**
- Create: `src/lib/recommendation/types.ts`
- Create: `src/lib/recommendation/evidence.ts`
- Create: `src/lib/recommendation/evidence.test.ts`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Consumes: existing `MajorOffering` records.
- Produces: `EvidenceDimensions`, `NormalizedAdmissionMetrics`, `RecommendationCandidate`, `deriveEvidenceDimensions(offering)`.

- [ ] **Step 1: Write failing evidence classification tests**

```ts
import { describe, expect, test } from "vitest";
import { deriveEvidenceDimensions } from "./evidence";

describe("deriveEvidenceDimensions", () => {
  test("official professional line is specific and verified", () => {
    expect(deriveEvidenceDimensions({
      lineScope: "professional", sourceAuthority: "college-official",
      verificationStatus: "verified", sourceYear: 2026, completeness: 0.75,
    })).toMatchObject({ granularity: "professional", confidence: "high", canClassifySafe: true });
  });

  test("national line always requires verification", () => {
    expect(deriveEvidenceDimensions({
      lineScope: "national", sourceAuthority: "ministry-official",
      verificationStatus: "verified", sourceYear: 2026, completeness: 0.25,
    })).toMatchObject({ granularity: "national", confidence: "low", canClassifySafe: false });
  });
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/lib/recommendation/evidence.test.ts`

Expected: FAIL because `./evidence` does not exist.

- [ ] **Step 3: Define focused recommendation types**

```ts
export type SourceAuthority = "college-official" | "school-official" | "chsi" | "institution" | "web";
export type EvidenceGranularity = "professional" | "college" | "school" | "national";
export type VerificationStatus = "verified" | "auto-review" | "conflict" | "pending";
export type Confidence = "high" | "medium" | "low";

export type EvidenceDimensions = {
  authority: SourceAuthority;
  granularity: EvidenceGranularity;
  completeness: number;
  freshness: "current" | "previous" | "historical";
  verification: VerificationStatus;
  sourceCount: number;
  confidence: Confidence;
  canClassifySafe: boolean;
};

export type NormalizedAdmissionMetrics = {
  totalPlan: number | null;
  recommendedExempt: number | null;
  generalExamPlan: number | null;
  specialPlan: number | null;
  firstChoiceRetestCount: number | null;
  firstChoiceAdmittedCount: number | null;
  firstChoiceRetestRatio: number | null;
  professionalLine: number | null;
  collegeLine: number | null;
  schoolLine: number | null;
  nationalLine: number;
  admittedMinimum: number | null;
  admittedMedian: number | null;
};
```

- [ ] **Step 4: Implement deterministic evidence classification**

```ts
export function deriveEvidenceDimensions(input: {
  lineScope: EvidenceGranularity;
  sourceAuthority: SourceAuthority;
  verificationStatus: VerificationStatus;
  sourceYear: number;
  completeness: number;
  sourceCount?: number;
}): EvidenceDimensions {
  const current = input.sourceYear === 2026;
  const official = ["college-official", "school-official", "chsi"].includes(input.sourceAuthority);
  const specific = ["professional", "college"].includes(input.lineScope);
  const verified = input.verificationStatus === "verified";
  const confidence = official && specific && verified && input.completeness >= 0.5
    ? "high"
    : verified && input.completeness >= 0.4 ? "medium" : "low";
  return {
    authority: input.sourceAuthority,
    granularity: input.lineScope,
    completeness: input.completeness,
    freshness: current ? "current" : input.sourceYear === 2025 ? "previous" : "historical",
    verification: input.verificationStatus,
    sourceCount: input.sourceCount ?? 1,
    confidence,
    canClassifySafe: specific && verified && confidence !== "low",
  };
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/lib/recommendation/evidence.test.ts`

Expected: PASS, 2 tests.

Commit:

```bash
git add src/lib/types.ts src/lib/recommendation
git commit -m "feat: model recommendation evidence dimensions"
```

---

### Task 2: Normalize Competitive Seats And Retest Ratios

**Files:**
- Create: `src/lib/recommendation/normalize.ts`
- Create: `src/lib/recommendation/normalize.test.ts`
- Modify: `src/app/api/exam-offerings/route.ts`

**Interfaces:**
- Consumes: `MajorOffering`, published plan text, optional first-choice list counts.
- Produces: `normalizeAdmissionMetrics(offering): NormalizedAdmissionMetrics`.

- [ ] **Step 1: Write failing normalization tests**

```ts
test("uses explicit general exam plan before total plan", () => {
  const result = normalizeAdmissionMetrics({
    plannedEnrollment: "专业：30(不含推免)", enrollment2026: 30,
    generalExamPlan2026: 18, recommendedExempt2026: 12,
  } as MajorOffering);
  expect(result.generalExamPlan).toBe(18);
});

test("computes only first-choice ordinary retest ratio", () => {
  const result = normalizeAdmissionMetrics({
    firstChoiceRetestCount2026: 24, firstChoiceAdmittedCount2026: 20,
  } as MajorOffering);
  expect(result.firstChoiceRetestRatio).toBe(1.2);
});
```

- [ ] **Step 2: Run test and confirm missing implementation**

Run: `npm test -- src/lib/recommendation/normalize.test.ts`

Expected: FAIL because `normalizeAdmissionMetrics` is undefined.

- [ ] **Step 3: Add explicit plan and list-count fields to `MajorOffering`**

```ts
generalExamPlan2026?: number | null;
recommendedExempt2026?: number | null;
specialPlan2026?: number | null;
firstChoiceRetestCount2026?: number | null;
firstChoiceAdmittedCount2026?: number | null;
lineScope?: "professional" | "college" | "school" | "national";
admittedMinimum2026?: number | null;
admittedMedian2026?: number | null;
```

- [ ] **Step 4: Implement normalization without inventing values**

```ts
export function normalizeAdmissionMetrics(item: MajorOffering): NormalizedAdmissionMetrics {
  const retest = item.firstChoiceRetestCount2026 ?? null;
  const admitted = item.firstChoiceAdmittedCount2026 ?? null;
  return {
    totalPlan: item.enrollment2026 ?? null,
    recommendedExempt: item.recommendedExempt2026 ?? null,
    generalExamPlan: item.generalExamPlan2026 ?? null,
    specialPlan: item.specialPlan2026 ?? null,
    firstChoiceRetestCount: retest,
    firstChoiceAdmittedCount: admitted,
    firstChoiceRetestRatio: retest && admitted ? retest / admitted : null,
    professionalLine: item.lineScope === "professional" ? item.retestLineReference ?? null : null,
    collegeLine: item.lineScope === "college" ? item.retestLineReference ?? null : null,
    schoolLine: item.lineScope === "school" ? item.retestLineReference ?? null : null,
    nationalLine: item.retestLineKind === "国家线兜底" ? item.retestLineReference ?? 264 : 264,
    admittedMinimum: item.admittedMinimum2026 ?? null,
    admittedMedian: item.admittedMedian2026 ?? null,
  };
}
```

- [ ] **Step 5: Use normalized metrics in the API and commit**

Run: `npm test -- src/lib/recommendation/normalize.test.ts && npm run lint`

Expected: PASS and no lint errors.

Commit:

```bash
git add src/lib/types.ts src/lib/recommendation src/app/api/exam-offerings/route.ts
git commit -m "feat: normalize competitive admission metrics"
```

---

### Task 3: Replace The Recommendation Engine

**Files:**
- Replace: `src/lib/recommendation.ts`
- Create: `src/lib/recommendation/scoring.ts`
- Create: `src/lib/recommendation/scoring.test.ts`
- Create: `src/lib/recommendation/reasons.ts`
- Create: `src/lib/recommendation/reasons.test.ts`

**Interfaces:**
- Consumes: normalized metrics, evidence dimensions, expected score.
- Produces: `scoreCandidate(input): RecommendationScore`, `buildReasons(input): TraceableReason[]`.

- [ ] **Step 1: Write failing hard-cap and scoring tests**

```ts
test("national line candidate is pending regardless of score margin", () => {
  const result = scoreCandidate(candidate({ granularity: "national", expectedScore: 400 }));
  expect(result.riskLevel).toBe("pending");
  expect(result.trustedTopTenEligible).toBe(false);
});

test("missing seats and ratio cannot be stable or safe", () => {
  const result = scoreCandidate(candidate({ generalExamPlan: null, firstChoiceRetestRatio: null }));
  expect(["pending", "reach"]).toContain(result.riskLevel);
});

test("shrinking seats and high ratio lower final rank", () => {
  const friendly = scoreCandidate(candidate({ generalExamPlan: 30, firstChoiceRetestRatio: 1.15, enrollmentChange: 5 }));
  const risky = scoreCandidate(candidate({ generalExamPlan: 5, firstChoiceRetestRatio: 1.8, enrollmentChange: -5 }));
  expect(friendly.finalScore).toBeGreaterThan(risky.finalScore);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/lib/recommendation/scoring.test.ts`

Expected: FAIL because `scoreCandidate` is missing.

- [ ] **Step 3: Implement separate score dimensions**

```ts
export type RecommendationScore = {
  matchScore: number;
  competitionScore: number;
  confidenceScore: number;
  riskPenalty: number;
  finalScore: number;
  riskLevel: "reach" | "stable" | "safe" | "pending";
  trustedTopTenEligible: boolean;
};

const weights = { score: 0.45, ratio: 0.25, seats: 0.2, trend: 0.1 };

export function scoreCandidate(input: CandidateInput): RecommendationScore {
  const available = [
    input.scoreMargin == null ? null : [weights.score, scoreMarginValue(input.scoreMargin)],
    input.metrics.firstChoiceRetestRatio == null ? null : [weights.ratio, ratioValue(input.metrics.firstChoiceRetestRatio)],
    input.metrics.generalExamPlan == null ? null : [weights.seats, seatValue(input.metrics.generalExamPlan)],
    input.enrollmentChange == null ? null : [weights.trend, trendValue(input.enrollmentChange)],
  ].filter(Boolean) as Array<[number, number]>;
  const validWeight = available.reduce((sum, [weight]) => sum + weight, 0);
  const effective = validWeight ? available.reduce((sum, [weight, value]) => sum + weight * value, 0) / validWeight : 0;
  const confidenceScore = confidenceValue(input.evidence);
  const riskPenalty = explicitRiskPenalty(input);
  const pending = !input.evidence.canClassifySafe || (input.metrics.generalExamPlan == null && input.metrics.firstChoiceRetestRatio == null);
  const finalScore = Math.max(0, Math.round(effective * confidenceScore - riskPenalty));
  return classify({ input, finalScore, confidenceScore, riskPenalty, pending });
}
```

- [ ] **Step 4: Implement deterministic reasons with field references**

```ts
export type TraceableReason = {
  ruleCode: string;
  tone: "positive" | "warning" | "neutral";
  text: string;
  fields: string[];
  sourceUrls: string[];
};

if (input.scoreMargin != null && input.scoreMargin >= 30) reasons.push({
  ruleCode: "SCORE_MARGIN_30", tone: "positive",
  text: `你的预期分高于该专业参考线 ${input.scoreMargin} 分`,
  fields: ["expectedScore", "professionalLine"], sourceUrls: [input.lineSourceUrl],
});
```

- [ ] **Step 5: Run scoring and reason tests**

Run: `npm test -- src/lib/recommendation/scoring.test.ts src/lib/recommendation/reasons.test.ts`

Expected: PASS.

- [ ] **Step 6: Remove the old opaque score implementation and commit**

```bash
git add src/lib/recommendation.ts src/lib/recommendation
git commit -m "feat: score recommendations with evidence and hard risk caps"
```

---

### Task 4: Versioned Query Results And Top 10 Diversification

**Files:**
- Create: `src/lib/recommendation/version.ts`
- Create: `src/lib/recommendation/version.test.ts`
- Create: `src/lib/recommendation/top-ten.ts`
- Create: `src/lib/recommendation/top-ten.test.ts`
- Modify: `src/app/api/exam-offerings/route.ts`
- Modify: `src/lib/subject-snapshot.ts`

**Interfaces:**
- Produces: `buildResultVersion(snapshot, query)`, `selectTrustedTopTen(candidates)`.
- API returns `dataVersion`, `snapshotHash`, `snapshotStatus`, `algorithmVersion`, `queryHash`, `summary`, `topTen`, `pendingCandidates`, `items`.

- [ ] **Step 1: Write failing version and diversity tests**

```ts
test("snapshot changes produce a different result key", () => {
  expect(buildResultVersion({ snapshotHash: "a", query: { score: 340 } }).resultKey)
    .not.toBe(buildResultVersion({ snapshotHash: "b", query: { score: 340 } }).resultKey);
});

test("trusted top ten contains at most two offerings per school", () => {
  const top = selectTrustedTopTen(makeCandidates({ sameSchool: 5, otherSchools: 8 }));
  expect(top.filter((item) => item.schoolCode === "10001")).toHaveLength(2);
});
```

- [ ] **Step 2: Implement stable SHA-256 version keys**

```ts
export const ALGORITHM_VERSION = "recommendation-v2.0.0";

export function buildResultVersion(input: { snapshotHash: string; query: Record<string, unknown> }) {
  const normalizedQuery = JSON.stringify(Object.fromEntries(Object.entries(input.query).sort(([a], [b]) => a.localeCompare(b))));
  const queryHash = createHash("sha256").update(normalizedQuery).digest("hex").slice(0, 16);
  return { algorithmVersion: ALGORITHM_VERSION, queryHash, resultKey: `${input.snapshotHash}:${ALGORITHM_VERSION}:${queryHash}` };
}
```

- [ ] **Step 3: Implement non-mechanical diversified selection**

```ts
export function selectTrustedTopTen(candidates: RecommendationCandidate[]) {
  const trusted = candidates.filter((item) => item.score.trustedTopTenEligible);
  const limits = { reach: 3, stable: 4, safe: 3 };
  const schoolCounts = new Map<string, number>();
  return trusted.sort((a, b) => b.score.finalScore - a.score.finalScore).filter((item) => {
    const count = schoolCounts.get(item.schoolCode) ?? 0;
    if (count >= 2 || limits[item.score.riskLevel as keyof typeof limits] <= 0) return false;
    schoolCounts.set(item.schoolCode, count + 1);
    limits[item.score.riskLevel as keyof typeof limits] -= 1;
    return true;
  }).slice(0, 10);
}
```

- [ ] **Step 4: Return versioned recommendation payload from API**

The route response must include:

```ts
{
  dataVersion: snapshot.syncedAt,
  snapshotHash,
  snapshotStatus: "verified",
  algorithmVersion,
  queryHash,
  summary: { trusted: topTen.length, reach, stable, safe, pending: pendingCandidates.length },
  topTen,
  pendingCandidates,
  items: paginatedAllResults,
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- src/lib/recommendation/version.test.ts src/lib/recommendation/top-ten.test.ts && npm run build`

Expected: PASS and successful production build.

Commit:

```bash
git add src/lib/recommendation src/app/api/exam-offerings/route.ts src/lib/subject-snapshot.ts
git commit -m "feat: version and diversify recommendation results"
```

---

### Task 5: Compact Filters And Recommendation Cards

**Files:**
- Create: `src/components/recommendation/basic-filters.tsx`
- Create: `src/components/recommendation/advanced-filters.tsx`
- Create: `src/components/recommendation/recommendation-summary.tsx`
- Create: `src/components/recommendation/recommendation-card.tsx`
- Create: `src/components/recommendation/top-ten-results.tsx`
- Modify: `src/components/subject-explorer.tsx`

**Interfaces:**
- Consumes the Task 4 API payload.
- Produces a compact basic workflow, collapsible advanced filters, trusted Top 10, pending section, and complete table.

- [ ] **Step 1: Extract filter state into a typed value**

```ts
export type RecommendationFilters = {
  expectedScore: string;
  region: string;
  english: string;
  math: string;
  schoolTier: string;
  maxRetestRatio: string;
  maxRetestLine: string;
  minEnrollment: string;
  expansion: string;
  degreeType: string;
  studyMode: string;
  sort: string;
};
```

- [ ] **Step 2: Build basic and advanced controls**

Basic controls render expected score, region, English, mathematics, tier, and submit. Advanced controls use a native button with `aria-expanded`, retain all existing filters, and show an active-filter count.

- [ ] **Step 3: Build the trusted recommendation card**

```tsx
<article className="rounded-lg border border-emerald-200 bg-white p-4">
  <header className="flex items-start justify-between gap-3">
    <div><h3>{item.schoolName}</h3><p>{item.collegeName} · {item.majorCode} {item.majorName}</p></div>
    <RiskBadge level={item.score.riskLevel} />
  </header>
  <ScoreBreakdown match={item.score.matchScore} competition={item.score.competitionScore} confidence={item.score.confidenceScore} final={item.score.finalScore} />
  <ReasonList reasons={item.reasons} />
</article>
```

- [ ] **Step 4: Preserve complete results below Top 10**

The existing table remains paginated. Its recommendation column uses the new four-part score and distinguishes `待核验` from `冲`.

- [ ] **Step 5: Add states and accessibility behavior**

Implement loading skeletons, empty trusted-result state, API error state retaining the last result, keyboard-operable advanced filter toggle, labels for every input, and mobile single-column recommendation cards.

- [ ] **Step 6: Run checks and commit**

Run: `npm run lint && npm test && npm run build`

Expected: all pass.

Commit:

```bash
git add src/components/recommendation src/components/subject-explorer.tsx
git commit -m "feat: add compact filters and trusted top ten cards"
```

---

### Task 6: Snapshot Validation, Retention, And Six-Hour Sync

**Files:**
- Create: `scripts/validate-snapshot.ts`
- Create: `scripts/validate-snapshot.test.ts`
- Modify: `scripts/sync-408.ts`
- Modify: `.github/workflows/sync-data.yml`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `validateSnapshot(previous, next): ValidationReport` and immutable snapshots under `data/snapshots/`.

- [ ] **Step 1: Write failing anomaly tests**

```ts
test("blocks a strict 408 count drop above fifteen percent", () => {
  expect(validateSnapshot(snapshot(1569), snapshot(1200))).toMatchObject({ publishable: false });
});

test("blocks duplicate composite professional records", () => {
  expect(validateSnapshot(snapshot(10), snapshotWithDuplicate())).toMatchObject({ publishable: false });
});
```

- [ ] **Step 2: Implement validation report**

```ts
export type ValidationReport = {
  publishable: boolean;
  errors: string[];
  warnings: string[];
  counts: { previous: number; next: number; changeRate: number };
  snapshotHash: string;
};
```

Validation rejects invalid subject codes, duplicate composite keys, nonpositive lines, nonpositive plan counts, missing sources above threshold, and strict 408 count drops greater than 15%.

- [ ] **Step 3: Save immutable snapshots only after validation**

Write `data/snapshots/<syncedAt>-408.json`, `data/snapshots/<syncedAt>-admission-units.json`, and a difference report. Keep the ten newest snapshot pairs and delete older generated snapshot files only after validating their paths remain inside `data/snapshots`.

- [ ] **Step 4: Update workflow schedule and validation gate**

```yaml
on:
  schedule:
    - cron: "20 0,6,12,18 * * *"
  workflow_dispatch:

steps:
  - run: npm ci
  - run: npm run sync:data
  - run: npm run sync:408 -- --force
  - run: npm run validate:snapshot
  - run: npm test
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- scripts/validate-snapshot.test.ts && npm run validate:snapshot`

Expected: PASS and report `publishable: true` for the current snapshot.

Commit:

```bash
git add scripts package.json .github/workflows/sync-data.yml .gitignore
git commit -m "feat: validate and retain admission snapshots"
```

---

### Task 7: End-To-End Verification And Deployment

**Files:**
- Modify: `README.md`
- Modify: `DEPLOY.md`
- Modify: `docs/superpowers/specs/2026-07-13-evidence-ranked-recommendations-design.md` only if implementation exposes a verified discrepancy.

**Interfaces:**
- Verifies the complete public workflow and deploys through the existing GitHub Actions/Vercel pipeline.

- [ ] **Step 1: Run complete local verification**

Run:

```powershell
npm run lint
npm test
npm run build
```

Expected: no lint errors, all tests pass, production build completes.

- [ ] **Step 2: Verify recommendation invariants through the local API**

Check expected score 340 and assert: every trusted Top 10 item has medium/high confidence; no school occurs more than twice; national-line-only candidates are pending; changing a fixture line or ratio changes the score.

- [ ] **Step 3: Verify desktop and mobile UI**

At desktop and mobile widths, verify basic filters, advanced toggle, Top 10 cards, pending candidates, complete results, loading/error/empty states, and no unintended horizontal page overflow. The complete table may retain its own synchronized horizontal scroller.

- [ ] **Step 4: Update documentation**

Document score dimensions, hard caps, data version fields, six-hour sync, snapshot rollback, and the statement that recommendation is not admission probability.

- [ ] **Step 5: Commit and push**

```bash
git add README.md DEPLOY.md
git commit -m "docs: explain trustworthy recommendation workflow"
git push origin master
```

- [ ] **Step 6: Watch deployment and verify public API**

Run:

```powershell
gh run list --repo zhwen2703-hash/kaoyan-recommendation-platform --limit 1
```

Expected: `Deploy website` completes with `success`.

Verify `https://kaoyan-recommendation-platform.vercel.app/api/exam-offerings?subjectCode=408&expectedScore=340&sort=recommended&page=1` returns HTTP 200, a verified snapshot status, algorithm version, diversified Top 10, pending candidates, and complete paginated items.
