/**
 * Authoring-only declarations. NOT imported by the app/store; no tasks or rewards.
 * Contract, evaluation order and migration: docs/SERIES.md §§4–9.
 * null / '' / [] are deliberately unfilled author slots, never usable defaults.
 */
export const SERIES_SCHEMA_VERSION = 1;
export const SERIES_KINDS = Object.freeze([
  "seasonal",
  "staged",
  "first",
  "cumulative",
  "combination",
  "exploration",
  "creation",
  "reflection",
]);

// A milestone criterion consumes settled, deduplicated completion evidence only.
// No arbitrary JS expressions, timers, NPC actions or balances in the rule language.
const criterionFor = (kind) => {
  const base = { taskIds: [], canonicalGoalIds: [], target: null };
  switch (kind) {
    case "seasonal":
      return { ...base, kind: "completed_goals", variantId: null };
    case "staged":
      return { ...base, kind: "chain_stage", chainId: null, stage: null };
    case "first":
      return {
        ...base,
        kind: "first_or_followthrough",
        firstKey: null,
        phase: null,
        requiresSelfAttestation: true,
      };
    case "cumulative":
      return { ...base, kind: "settled_metric_sum", metric: null, unit: null };
    case "combination":
      return {
        ...base,
        kind: "all_groups",
        groups: [
          {
            slot: "group-1",
            taskIds: [],
            canonicalGoalIds: [],
            cat: null,
            target: null,
          },
          {
            slot: "group-2",
            taskIds: [],
            canonicalGoalIds: [],
            cat: null,
            target: null,
          },
        ],
        evidenceReuseAcrossGroups: false,
      };
    case "exploration":
      return {
        ...base,
        kind: "distinct_real_places",
        placeKeys: [],
        requiresSelfAttestation: true,
        requireGps: false,
      };
    case "creation":
      return {
        ...base,
        kind: "distinct_works",
        workKind: null,
        requiresSelfAttestation: true,
        attachmentRequired: false,
      };
    case "reflection":
      return {
        ...base,
        kind: "distinct_reviewed_records",
        sourceTaskIds: [],
        requiresSelfAttestation: true,
        minimumTextLength: null,
      };
    default:
      throw new Error("Unknown series kind");
  }
};

/**
 * One row per authoring category, NOT one live series and NOT a future task.
 * familyId = enduring theme/one badge; id = series edition; revision immutable.
 * milestones m1..m6 are structural slots. Counts/thresholds/content stay empty.
 */
const seriesTemplate = (kind) => ({
  schemaVersion: SERIES_SCHEMA_VERSION,
  templateKey: kind,
  status: "draft",
  enabled: false,
  id: null,
  familyId: null,
  familyReleasedSeasonId: null,
  revision: null,
  kind,
  title: "",
  premise: "",
  completionExplanation: "",
  cats: [], // keys from tasks.js CATS; do not add a second attribute system
  clock: {
    scope: kind === "seasonal" ? "season" : "lifetime",
    seasonId: null,
    chapterIndex: null,
    variantId: null,
    returningFamilyId: null,
    windowSource: kind === "seasonal" ? "season.js" : null,
    closePolicy: kind === "seasonal" ? "archive_and_return" : "none",
    acceptedTaskPolicy: "finish_with_pinned_revision",
    progressCarry: "family_lifetime",
    countdown: false,
  },
  publishedMilestoneIds: [],
  milestoneSlots: Array.from({ length: 6 }, (_, i) => ({
    slot: `m${i + 1}`,
    id: null,
    title: "",
    description: "",
    prerequisiteSlots: i ? [`m${i}`] : [],
    criterion: criterionFor(kind),
    proofPolicy: {
      source: "settled_completion",
      ownership: "primary_family_only",
      dedupeBy: ["completionId", "canonicalGoalId", "evidenceId"],
      retroactive: "explicit_mapping_only",
    },
  })),
  taskBindingSlot: {
    taskId: null,
    primaryFamilyId: null,
    seriesId: null,
    seriesRevision: null,
    milestoneSlots: [],
    canonicalGoalId: null,
    firstKey: null,
    evidenceKind: null,
    // Existing tasks.js continues owning cat/diff/type/tier/target/chain/stage/metric/mv.
  },
  badgeId: null,
  guideNpcId: null,
  entry: { mapPlaceId: "tasks", detailKey: null },
  rewardPolicy: "existing_task_settlement_only",
  seriesBonus: { xp: 0, lumens: 0 },
  author: { taskTextOwner: "user", notes: "", readiness: "unfilled" },
});

export const SERIES_TEMPLATES = SERIES_KINDS.map(seriesTemplate);
// Deliberately empty. Templates must never be mistaken for released content.
export const SERIES = Object.freeze([]);
