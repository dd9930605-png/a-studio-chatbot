'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchAllParticipants,
  downloadJSON,
  ParticipantData,
} from '@/lib/dataRecorder';
import {
  downloadParticipantsCSV,
  downloadParticipantsExcel,
} from '@/lib/exportParticipants';
import { getQuestionnaireItemIds } from '@/lib/questionnaire';

export default function AdminPage() {
  const [allData, setAllData] = useState<ParticipantData[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantData | null>(null);
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchAllParticipants();
    setCloudConfigured(result.configured);
    setAllData(result.participants);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleClearData = async () => {
    if (!window.confirm('確定要清除所有資料嗎？此操作無法復原。')) return;

    if (cloudConfigured) {
      const secret = window.prompt('請輸入管理者密碼（若未設定可留空）：') ?? '';
      const headers: HeadersInit = secret ? { 'x-admin-secret': secret } : {};
      const response = await fetch('/api/participants', { method: 'DELETE', headers });
      if (!response.ok) {
        alert('清除雲端資料失敗，請確認管理者密碼是否正確。');
        return;
      }
    }

    localStorage.removeItem('participant_data');
    setAllData([]);
    setSelectedParticipant(null);
    alert('資料已清除');
    void loadData();
  };

  const handleExportCSV = () => downloadParticipantsCSV(allData);
  const handleExportExcel = () => downloadParticipantsExcel(allData);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-4 text-4xl font-bold">研究者後台</h1>
          <p className="mb-2 text-gray-600">查看與管理受試者實驗數據</p>
          <p className="mb-6 text-sm text-gray-500">
            {loading
              ? '載入中...'
              : cloudConfigured
                ? `✓ 已連接雲端儲存（共 ${allData.length} 筆，手機與電腦共用）`
                : '⚠ 雲端儲存尚未設定，目前僅顯示本機瀏覽器資料（正式上線請在 Vercel 加入 Blob Storage）'}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={downloadJSON}
              className="rounded-lg bg-green-500 px-6 py-2 font-bold text-white hover:bg-green-600"
            >
              匯出 JSON
            </button>
            <button
              onClick={handleExportCSV}
              disabled={allData.length === 0}
              className="rounded-lg bg-emerald-500 px-6 py-2 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              匯出 CSV（SPSS）
            </button>
            <button
              onClick={handleExportExcel}
              disabled={allData.length === 0}
              className="rounded-lg bg-teal-500 px-6 py-2 font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              匯出 Excel
            </button>
            <button
              onClick={() => void loadData()}
              className="rounded-lg bg-blue-500 px-6 py-2 font-bold text-white hover:bg-blue-600"
            >
              重新整理
            </button>
            <button
              onClick={handleClearData}
              className="rounded-lg bg-red-500 px-6 py-2 font-bold text-white hover:bg-red-600"
            >
              清除所有數據
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="text-3xl font-bold text-blue-600">{allData.length}</div>
            <div className="text-sm text-gray-600">受試者總數</div>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="text-3xl font-bold text-purple-600">
              {allData.filter((d) => d.surpriseMode === 'surprise').length}
            </div>
            <div className="text-sm text-gray-600">驚喜組</div>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="text-3xl font-bold text-green-600">
              {allData.filter((d) => d.questionnaireCompletedAt).length}
            </div>
            <div className="text-sm text-gray-600">已完成問卷</div>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="text-3xl font-bold text-orange-600">
              {allData.filter((d) => d.expectationMismatch === 0).length}
            </div>
            <div className="text-sm text-gray-600">偏好吻合推薦</div>
          </div>
          <div className="rounded-lg bg-white p-6 text-center shadow">
            <div className="text-3xl font-bold text-rose-600">
              {allData.filter((d) => d.expectationMismatch === 1).length}
            </div>
            <div className="text-sm text-gray-600">偏好不吻合推薦</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">受試者列表</h2>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {allData.length === 0 ? (
                <p className="text-sm text-gray-500">尚無受試者數據</p>
              ) : (
                allData.map((data) => (
                  <button
                    key={data.participantId}
                    onClick={() => setSelectedParticipant(data)}
                    className={`w-full rounded-lg px-4 py-2 text-left transition ${
                      selectedParticipant?.participantId === data.participantId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="truncate text-sm font-semibold">{data.participantId}</div>
                    <div className="text-xs opacity-75">
                      條件 {data.conditionId} · {data.surpriseMode}
                      {data.questionnaireCompletedAt ? ' · 已填問卷' : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="col-span-2 rounded-lg bg-white p-6 shadow-lg">
            {selectedParticipant ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">{selectedParticipant.participantId}</h2>

                <Section title="實驗分派">
                  <Grid>
                    <Field label="conditionId" value={String(selectedParticipant.conditionId)} />
                    <Field label="surpriseMode" value={selectedParticipant.surpriseMode} />
                    <Field
                      label="selectedOutfitCategory"
                      value={selectedParticipant.selectedOutfitCategory}
                    />
                    <Field
                      label="expectationMismatch"
                      value={String(selectedParticipant.expectationMismatch ?? '')}
                    />
                  </Grid>
                </Section>

                <Section title="推薦池與選擇">
                  <Field label="allowedOutfits" value={selectedParticipant.allowedOutfits.join(', ')} />
                  <Field label="blockedOutfits" value={selectedParticipant.blockedOutfits.join(', ')} />
                  <Field
                    label="favoriteOutfitBeforeAI"
                    value={selectedParticipant.favoriteOutfitBeforeAI}
                  />
                  <Field
                    label="surpriseCandidateOutfits"
                    value={selectedParticipant.surpriseCandidateOutfits.join(', ') || '—'}
                  />
                  <Field
                    label="finalRecommendedOutfit"
                    value={selectedParticipant.finalRecommendedOutfit}
                  />
                </Section>

                <Section title="操弄變數">
                  <Grid>
                    <Field
                      label="可解釋性"
                      value={
                        selectedParticipant.conditionInfo.explainability === 'high' ? '高' : '低'
                      }
                    />
                    <Field
                      label="雙面論點"
                      value={
                        selectedParticipant.conditionInfo.twoSidedMessage === 'high' ? '高' : '低'
                      }
                    />
                    <Field
                      label="擬人化"
                      value={
                        selectedParticipant.conditionInfo.anthropomorphism === 'high' ? '高' : '低'
                      }
                    />
                    <Field
                      label="主動性"
                      value={selectedParticipant.conditionInfo.proactivity === 'high' ? '高' : '低'}
                    />
                  </Grid>
                </Section>

                <Section title="AI 對談回答">
                  <Field label="invalidInputCount" value={String(selectedParticipant.invalidInputCount)} />
                  <Field label="風格偏好" value={selectedParticipant.answers.stylePreferenceInput} />
                  <Field label="身形修飾" value={selectedParticipant.answers.bodyShapeInput} />
                  <Field
                    label="網站穿搭喜好"
                    value={selectedParticipant.answers.websitePreferenceInput}
                  />
                  <Field
                    label="韓系服飾經驗"
                    value={selectedParticipant.answers.koreanClothingExperienceInput}
                  />
                  <Field label="平時穿搭風格" value={selectedParticipant.answers.usualStyleInput} />
                </Section>

                <Section title="推薦敘述">
                  <p className="text-sm text-gray-800">{selectedParticipant.finalRecommendationText}</p>
                </Section>

                <Section title="正式問卷">
                  <Field
                    label="questionnaireCompletedAt"
                    value={selectedParticipant.questionnaireCompletedAt ?? '—'}
                  />
                  <Field label="completionCode" value={selectedParticipant.completionCode ?? '—'} />
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs">
                    {getQuestionnaireItemIds().map((itemId) => (
                      <div key={itemId} className="flex justify-between gap-4 border-b border-gray-200 py-1 last:border-b-0">
                        <span className="text-gray-500">{itemId}</span>
                        <span className="font-medium text-gray-800">
                          {selectedParticipant.questionnaireResponses[itemId] ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="聊天紀錄">
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-4 text-xs">
                    {selectedParticipant.chatLog.map((msg, idx) => (
                      <div key={idx} className="border-b pb-2 last:border-b-0">
                        <p className="text-gray-500">
                          [{msg.step}] {msg.sender === 'user' ? '用戶' : 'AI'}
                        </p>
                        <p className="font-medium text-gray-800">{msg.message}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">選擇一位受試者以查看詳細資訊</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b pb-6">
      <h3 className="mb-3 font-bold">{title}</h3>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
