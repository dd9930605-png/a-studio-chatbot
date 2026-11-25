import * as XLSX from 'xlsx';
import {
  ParticipantData,
  extractBotMessages,
  extractUserMessages,
  normalizeParticipantData,
} from '@/lib/dataRecorder';
import { getQuestionnaireItemIds } from '@/lib/questionnaire';

const METADATA_COLUMNS = [
  'participantId',
  'conditionId',
  'surpriseMode',
  'favoriteOutfitId',
  'expectedOutfitBeforeAI',
  'finalRecommendedOutfit',
  'expectationMismatch',
  'selectedOutfitCategory',
  'explainability',
  'twoSidedMessage',
  'anthropomorphism',
  'proactivity',
  'sessionStartTime',
  'sessionEndTime',
  'chatPageEnteredAt',
  'chatPageExitedAt',
  'chatDurationSec',
  'userMessageCount',
  'metMinimumChatDuration',
  'metMinimumChatRequirements',
  'clickedViewRecommendation',
  'viewRecommendationClickedAt',
  'finalRecommendationVersion',
  'viewedChatLog',
  'viewedChatLogAt',
  'viewedChatLogFrom',
  'surveyPageEnteredAt',
  'surprisePreChatOutfit',
  'chatPreferenceAdjusted',
  'surpriseSelectionMode',
  'chatPreferenceSummary',
  'preferenceFormality',
  'preferenceImpression',
  'preferenceColor',
  'quickPreferencesCompletedAt',
  'proSummaryEligibleAt',
  'proSummaryInitiator',
  'proSummaryOpenedAt',
  'proSummaryOpened',
  'proSummaryOpenCount',
  'proSummaryTriggeredOnce',
  'proSummaryContent',
  'exEvidenceItems',
  'exJudgmentPoints',
  'positiveAId',
  'positiveBId',
  'cautionId',
  'resultLayoutVersion',
  'directCheckExplainability',
  'directCheckTwoSided',
  'directCheckAnthropomorphism',
  'directCheckProactivity',
  'directCheckEXCorrect',
  'directCheckTSCorrect',
  'directCheckANCorrect',
  'directCheckPROCorrect',
  'directCheckCompletedAt',
  'favoritePkWins',
  'favoritePkAppearances',
  'pkConsistencyWithFavorite',
  'pkFinalChallengerId',
  'pkFinalWinnerId',
  'favoriteRetainedInFinalPK',
  'pkRoundsJson',
  'clickedSurveyButton',
  'surveyClickedAt',
  'questionnaireCompletedAt',
  'completionCode',
  'stylePreferenceInput',
  'bodyShapeInput',
  'websitePreferenceInput',
  'koreanClothingExperienceInput',
  'usualStyleInput',
  'allUserMessages',
  'allBotMessages',
  'invalidInputCount',
  'invalidInputs',
  'correctedInputs',
  'finalRecommendationText',
] as const;

export function flattenParticipantForExport(participant: ParticipantData): Record<string, string | number> {
  const data = normalizeParticipantData(participant);
  const row: Record<string, string | number> = {
    participantId: data.participantId,
    conditionId: data.conditionId,
    surpriseMode: data.surpriseMode,
    favoriteOutfitId: data.favoriteOutfitId ?? '',
    expectedOutfitBeforeAI: data.expectedOutfitBeforeAI,
    finalRecommendedOutfit: data.finalRecommendedOutfit,
    expectationMismatch: data.expectationMismatch ?? '',
    selectedOutfitCategory: data.selectedOutfitCategory,
    explainability: data.conditionInfo.explainability,
    twoSidedMessage: data.conditionInfo.twoSidedMessage,
    anthropomorphism: data.conditionInfo.anthropomorphism,
    proactivity: data.conditionInfo.proactivity,
    sessionStartTime: data.sessionStartTime,
    sessionEndTime: data.sessionEndTime ?? '',
    chatPageEnteredAt: data.chatPageEnteredAt ?? '',
    chatPageExitedAt: data.chatPageExitedAt ?? '',
    chatDurationSec: data.chatDurationSec ?? 0,
    userMessageCount: data.userMessageCount ?? 0,
    metMinimumChatDuration: data.metMinimumChatDuration ? 1 : 0,
    metMinimumChatRequirements: data.metMinimumChatRequirements ? 1 : 0,
    clickedViewRecommendation: data.clickedViewRecommendation ? 1 : 0,
    viewRecommendationClickedAt: data.viewRecommendationClickedAt ?? '',
    finalRecommendationVersion: data.finalRecommendationVersion ?? '',
    viewedChatLog: data.viewedChatLog ? 1 : 0,
    viewedChatLogAt: data.viewedChatLogAt ?? '',
    viewedChatLogFrom: data.viewedChatLogFrom ?? '',
    surveyPageEnteredAt: data.surveyPageEnteredAt ?? '',
    surprisePreChatOutfit: data.surprisePreChatOutfit ?? '',
    chatPreferenceAdjusted: data.chatPreferenceAdjusted ? 1 : 0,
    surpriseSelectionMode: data.surpriseSelectionMode ?? '',
    chatPreferenceSummary: data.chatPreferenceSummary ?? '',
    preferenceFormality: data.preferenceFormality ?? '',
    preferenceImpression: data.preferenceImpression ?? '',
    preferenceColor: data.preferenceColor ?? '',
    quickPreferencesCompletedAt: data.quickPreferencesCompletedAt ?? '',
    proSummaryEligibleAt: data.proSummaryEligibleAt ?? '',
    proSummaryInitiator: data.proSummaryInitiator ?? '',
    proSummaryOpenedAt: data.proSummaryOpenedAt ?? '',
    proSummaryOpened: data.proSummaryOpened ? 1 : 0,
    proSummaryOpenCount: data.proSummaryOpenCount ?? 0,
    proSummaryTriggeredOnce: data.proSummaryTriggeredOnce ? 1 : 0,
    proSummaryContent: data.proSummaryContent ?? '',
    exEvidenceItems: (data.exEvidenceItems ?? [])
      .map((item) => `${item.source}:${item.value}`)
      .join(' | '),
    exJudgmentPoints: (data.exJudgmentPoints ?? []).join(' | '),
    positiveAId: data.positiveAId ?? '',
    positiveBId: data.positiveBId ?? '',
    cautionId: data.cautionId ?? '',
    resultLayoutVersion: data.resultLayoutVersion ?? '',
    directCheckExplainability: data.directCheckExplainability ?? '',
    directCheckTwoSided: data.directCheckTwoSided ?? '',
    directCheckAnthropomorphism: data.directCheckAnthropomorphism ?? '',
    directCheckProactivity: data.directCheckProactivity ?? '',
    directCheckEXCorrect:
      data.directCheckEXCorrect == null ? '' : data.directCheckEXCorrect ? 1 : 0,
    directCheckTSCorrect:
      data.directCheckTSCorrect == null ? '' : data.directCheckTSCorrect ? 1 : 0,
    directCheckANCorrect:
      data.directCheckANCorrect == null ? '' : data.directCheckANCorrect ? 1 : 0,
    directCheckPROCorrect:
      data.directCheckPROCorrect == null ? '' : data.directCheckPROCorrect ? 1 : 0,
    directCheckCompletedAt: data.directCheckCompletedAt ?? '',
    favoritePkWins: data.favoritePkWins ?? '',
    favoritePkAppearances: data.favoritePkAppearances ?? '',
    pkConsistencyWithFavorite: data.pkConsistencyWithFavorite ?? '',
    pkFinalChallengerId: data.pkFinalChallengerId ?? '',
    pkFinalWinnerId: data.pkFinalWinnerId ?? '',
    favoriteRetainedInFinalPK:
      data.favoriteRetainedInFinalPK == null ? '' : data.favoriteRetainedInFinalPK ? 1 : 0,
    pkRoundsJson: JSON.stringify(data.pkRounds ?? []),
    clickedSurveyButton: data.clickedSurveyButton ? 1 : 0,
    surveyClickedAt: data.surveyClickedAt ?? '',
    questionnaireCompletedAt: data.questionnaireCompletedAt ?? '',
    completionCode: data.completionCode ?? '',
    stylePreferenceInput: data.answers.stylePreferenceInput,
    bodyShapeInput: data.answers.bodyShapeInput,
    websitePreferenceInput: data.answers.websitePreferenceInput,
    koreanClothingExperienceInput: data.answers.koreanClothingExperienceInput,
    usualStyleInput: data.answers.usualStyleInput,
    allUserMessages: extractUserMessages(data).join(' | '),
    allBotMessages: extractBotMessages(data).join(' | '),
    invalidInputCount: data.invalidInputCount,
    invalidInputs: data.invalidInputs.map((item) => `${item.step}:${item.message}`).join(' | '),
    correctedInputs: data.correctedInputs.map((item) => `${item.step}:${item.message}`).join(' | '),
    finalRecommendationText: data.finalRecommendationText,
  };

  for (const itemId of getQuestionnaireItemIds()) {
    const value = data.questionnaireResponses[itemId];
    row[itemId] = value ?? '';
  }

  return row;
}

export function getExportColumns(): string[] {
  return [...METADATA_COLUMNS, ...getQuestionnaireItemIds()];
}

export function participantsToRows(participants: ParticipantData[]): Record<string, string | number>[] {
  return participants.map((participant) => flattenParticipantForExport(participant));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function timestampSuffix(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function downloadParticipantsCSV(participants: ParticipantData[]): void {
  const columns = getExportColumns();
  const rows = participantsToRows(participants);
  const lines = [
    columns.join(','),
    ...rows.map((row) =>
      columns
        .map((column) => {
          const value = row[column] ?? '';
          const text = String(value).replace(/"/g, '""');
          return `"${text}"`;
        })
        .join(','),
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  downloadBlob(blob, `participant-data-${timestampSuffix()}.csv`);
}

export function downloadParticipantsExcel(participants: ParticipantData[]): void {
  const columns = getExportColumns();
  const rows = participantsToRows(participants);
  const sheetRows = rows.map((row) => {
    const sheetRow: Record<string, string | number> = {};
    for (const column of columns) {
      sheetRow[column] = row[column] ?? '';
    }
    return sheetRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'participants');
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `participant-data-${timestampSuffix()}.xlsx`);
}
