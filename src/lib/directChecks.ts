import { DirectCheckLevel, ParticipantConditionInfo } from '@/lib/dataRecorder';

export function isDirectCheckCorrect(
  answer: DirectCheckLevel | '',
  actual: DirectCheckLevel,
): boolean | null {
  if (answer !== 'high' && answer !== 'low') return null;
  return answer === actual;
}

export function scoreDirectChecks(
  answers: {
    directCheckExplainability: DirectCheckLevel | '';
    directCheckTwoSided: DirectCheckLevel | '';
    directCheckAnthropomorphism: DirectCheckLevel | '';
    directCheckProactivity: DirectCheckLevel | '';
  },
  condition: ParticipantConditionInfo,
) {
  return {
    directCheckEXCorrect: isDirectCheckCorrect(
      answers.directCheckExplainability,
      condition.explainability,
    ),
    directCheckTSCorrect: isDirectCheckCorrect(
      answers.directCheckTwoSided,
      condition.twoSidedMessage,
    ),
    directCheckANCorrect: isDirectCheckCorrect(
      answers.directCheckAnthropomorphism,
      condition.anthropomorphism,
    ),
    directCheckPROCorrect: isDirectCheckCorrect(
      answers.directCheckProactivity,
      condition.proactivity,
    ),
  };
}
