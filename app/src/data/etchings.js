/** Authoring skeleton only; no renderer, evaluator, minting or save integration. */
import { SERIES_KINDS } from "./series.js";

export const ETCHING_POLICY = Object.freeze({
  schemaVersion: 1,
  mapping: "one_badge_per_lifelong_family",
  effectiveEvidence: "on_or_after_family_release_season",
  firstSeasonFamilyBudget: 8,
  newFamiliesPerLaterSeasonMax: 2,
  firstSeasonInlaidFamiliesMax: 5,
  completionPrimaryFamiliesMax: 1,
  currencyExchange: false,
  trading: false,
  bonusXp: 0,
  bonusLumens: 0,
});

// Cumulative AND requirements. Thresholds are design decisions, not live economy.
export const ETCHING_TIERS = Object.freeze([
  {
    id: "plain",
    rank: 1,
    name: "素刻",
    requiredMilestoneSlots: ["m1"],
    distinctGoalsMin: 1,
    difficulty: null,
    distinctSeasonsMin: 1,
  },
  {
    id: "inlaid",
    rank: 2,
    name: "嵌纹",
    requiredMilestoneSlots: ["m1", "m2", "m3"],
    distinctGoalsMin: 3,
    difficulty: { atLeast: "B", distinctGoalsMin: 1 },
    distinctSeasonsMin: 1,
  },
  {
    id: "gilded",
    rank: 3,
    name: "镀彩",
    requiredMilestoneSlots: ["m1", "m2", "m3", "m4", "m5", "m6"],
    distinctGoalsMin: 6,
    difficulty: { atLeast: "A", distinctGoalsMin: 2 },
    distinctSeasonsMin: 3,
  },
]);

export const ETCHING_TEMPLATES = SERIES_KINDS.map((kind) => ({
  schemaVersion: 1,
  templateKey: kind,
  status: "draft",
  enabled: false,
  id: null,
  familyId: null,
  revision: null,
  title: "",
  meaning: "",
  seriesIds: [],
  tierPolicy: "family-v1",
  tiers: ETCHING_TIERS.map((tier) => ({
    tierId: tier.id,
    milestoneIds: [], // author binds the matching required slots to stable ids
    art: {
      concept: "",
      silhouette: "",
      motif: "",
      relief: "",
      material: "",
      finish: "",
      accent: "",
      assetRef: null,
      approval: "not_started",
    },
  })),
  catalog: {
    mapPlaceId: "journal",
    sectionId: "etchings",
    title: "",
    description: "",
    sortKey: null,
  },
  npc: { guideId: "buddy", craftRoleId: "woodworker" },
  exchange: { purchasable: false, sellable: false, currencyValue: 0 },
}));
export const ETCHINGS = Object.freeze([]);
