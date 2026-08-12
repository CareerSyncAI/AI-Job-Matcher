import { Candidate, EvidenceItem } from "@/types";

export interface ScoringWeights {
  skillsWeight: number;      // 0 - 100
  experienceWeight: number;  // 0 - 100
  educationWeight: number;   // 0 - 100
  semanticWeight: number;    // 0 - 100
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skillsWeight: 40,
  experienceWeight: 25,
  educationWeight: 15,
  semanticWeight: 20
};

export interface CalculatedCandidate extends Candidate {
  computedMatchScore: number;
  originalRank: number;
  newRank: number;
  rankDelta: number; // e.g. +2 (moved up), -1 (moved down), 0
}

/**
 * Deterministically computes the compound match score for a candidate
 * based on customizable category weights.
 */
export function calculateCandidateScore(
  candidate: Candidate,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  const totalWeight =
    weights.skillsWeight +
    weights.experienceWeight +
    weights.educationWeight +
    weights.semanticWeight;

  if (totalWeight === 0) return candidate.matchScore;

  const weightedSum =
    candidate.skillScore * (weights.skillsWeight / totalWeight) +
    candidate.experienceScore * (weights.experienceWeight / totalWeight) +
    candidate.educationScore * (weights.educationWeight / totalWeight) +
    candidate.semanticScore * (weights.semanticWeight / totalWeight);

  return Math.round(weightedSum);
}

/**
 * Re-ranks a list of candidates according to dynamic weights
 * and outputs rank deltas.
 */
export function reRankCandidates(
  candidates: Candidate[],
  weights: ScoringWeights
): CalculatedCandidate[] {
  // First, assign initial order based on default score
  const withDefaultRank = candidates
    .slice()
    .sort((a, b) => b.matchScore - a.matchScore)
    .map((c, idx) => ({
      ...c,
      originalRank: idx + 1,
      computedMatchScore: calculateCandidateScore(c, weights)
    }));

  // Sort by new computed score
  const sorted = withDefaultRank.sort(
    (a, b) => b.computedMatchScore - a.computedMatchScore
  );

  return sorted.map((cand, idx) => {
    const newRank = idx + 1;
    const rankDelta = cand.originalRank - newRank; // positive means moved up
    return {
      ...cand,
      newRank,
      rankDelta
    };
  });
}

/**
 * Simulates the effect of adding a skill to an applicant's resume
 */
export function simulateSkillAddition(
  currentScore: number,
  targetSkills: string[],
  userSkills: string[],
  newSkill: string
): { updatedScore: number; gainedPoints: number; isCritical: boolean } {
  const isTargetSkill = targetSkills.some(
    (s) => s.toLowerCase() === newSkill.toLowerCase()
  );
  if (!isTargetSkill || userSkills.includes(newSkill)) {
    return { updatedScore: currentScore, gainedPoints: 0, isCritical: false };
  }

  // Calculate proportional boost
  const weightPerSkill = Math.round(40 / Math.max(targetSkills.length, 1));
  const gainedPoints = Math.max(weightPerSkill, 6);
  const updatedScore = Math.min(currentScore + gainedPoints, 99);

  return {
    updatedScore,
    gainedPoints,
    isCritical: true
  };
}
