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
  'favoriteOutfitBeforeAI',
  'finalRecommendedOutfit',
  'expectationMismatch',
  'selectedOutfitCategory',
  'explainability',
  'twoSidedMessage',
  'anthropomorphism',
  'proactivity',
  'sessionStartTime',
  'sessionEndTime',
  'questionnaireCompletedAt',
  'completionCode',
  'stylePreferenceInput',
  'bodyShapeInput',
  'websitePreferenceInput',
  'koreanClothingExperienceInput',
  'usualStyleInput',
  'allUserMessages',
  'allBotMessages',
  'finalRecommendationText',
] as const;

export function flattenParticipantForExport(participant: ParticipantData): Record<string, string | number> {
  const data = normalizeParticipantData(participant);
  const row: Record<string, string | number> = {
    participantId: data.participantId,
    conditionId: data.conditionId,
    surpriseMode: data.surpriseMode,
    favoriteOutfitBeforeAI: data.favoriteOutfitBeforeAI,
    finalRecommendedOutfit: data.finalRecommendedOutfit,
    expectationMismatch: data.expectationMismatch ?? '',
    selectedOutfitCategory: data.selectedOutfitCategory,
    explainability: data.conditionInfo.explainability,
    twoSidedMessage: data.conditionInfo.twoSidedMessage,
    anthropomorphism: data.conditionInfo.anthropomorphism,
    proactivity: data.conditionInfo.proactivity,
    sessionStartTime: data.sessionStartTime,
    sessionEndTime: data.sessionEndTime ?? '',
    questionnaireCompletedAt: data.questionnaireCompletedAt ?? '',
    completionCode: data.completionCode ?? '',
    stylePreferenceInput: data.answers.stylePreferenceInput,
    bodyShapeInput: data.answers.bodyShapeInput,
    websitePreferenceInput: data.answers.websitePreferenceInput,
    koreanClothingExperienceInput: data.answers.koreanClothingExperienceInput,
    usualStyleInput: data.answers.usualStyleInput,
    allUserMessages: extractUserMessages(data).join(' | '),
    allBotMessages: extractBotMessages(data).join(' | '),
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
