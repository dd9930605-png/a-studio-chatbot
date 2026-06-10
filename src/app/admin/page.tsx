'use client';

import React, { useState, useEffect } from 'react';
import { getFromLocalStorage, downloadJSON, ParticipantData } from '@/lib/dataRecorder';

export default function AdminPage() {
  const [allData, setAllData] = useState<ParticipantData[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantData | null>(null);

  useEffect(() => {
    const data = getFromLocalStorage();
    setAllData(data);
  }, []);

  const handleExportJSON = () => {
    downloadJSON();
  };

  const handleClearData = () => {
    if (window.confirm('確定要清除所有資料嗎？此操作無法復原。')) {
      localStorage.removeItem('participant_data');
      setAllData([]);
      setSelectedParticipant(null);
      alert('資料已清除');
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 bg-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold mb-4">📊 研究者後台</h1>
          <p className="text-gray-600 mb-6">查看與管理受試者實驗數據</p>

          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handleExportJSON}
              className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
            >
              ⬇️ 匯出 JSON 檔案
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition"
            >
              🔄 重新整理
            </button>
            <button
              onClick={handleClearData}
              className="px-6 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition"
            >
              🗑️ 清除所有數據
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{allData.length}</div>
            <div className="text-gray-600 text-sm">受試者總數</div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {allData.filter((d) => d.conditionId === i).length}
              </div>
              <div className="text-gray-600 text-sm">條件 {i}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">受試者列表</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allData.length === 0 ? (
                <p className="text-gray-500 text-sm">尚無受試者數據</p>
              ) : (
                allData.map((data, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedParticipant(data)}
                    className={`w-full text-left px-4 py-2 rounded-lg transition ${
                      selectedParticipant?.participantId === data.participantId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold text-sm truncate">{data.participantId}</div>
                    <div className="text-xs opacity-75">條件 {data.conditionId}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="col-span-2 bg-white rounded-lg shadow-lg p-6">
            {selectedParticipant ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">{selectedParticipant.participantId}</h2>

                <div className="grid grid-cols-2 gap-4 pb-6 border-b">
                  <div>
                    <p className="text-gray-600 text-sm">實驗條件</p>
                    <p className="font-bold text-lg">{selectedParticipant.conditionId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">預期推薦</p>
                    <p className="font-bold">{selectedParticipant.expectedOutfit}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">實際推薦</p>
                    <p className="font-bold">{selectedParticipant.finalRecommendedOutfit}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">是否吻合</p>
                    <p className="font-bold">
                      {selectedParticipant.expectationMismatch === 0 ? '✓ 吻合' : '✗ 不吻合'}
                    </p>
                  </div>
                </div>

                <div className="pb-6 border-b">
                  <h3 className="font-bold mb-3">實驗操弄變數</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">可解釋性</p>
                      <p className="font-semibold">
                        {selectedParticipant.conditionInfo.explainability === 'high'
                          ? '高'
                          : '低'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">雙面論點</p>
                      <p className="font-semibold">
                        {selectedParticipant.conditionInfo.twoSidedMessage === 'high'
                          ? '高'
                          : '低'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">擬人化程度</p>
                      <p className="font-semibold">
                        {selectedParticipant.conditionInfo.anthropomorphism === 'high'
                          ? '高'
                          : '低'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">主動性</p>
                      <p className="font-semibold">
                        {selectedParticipant.conditionInfo.proactivity === 'high' ? '高' : '低'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pb-6 border-b">
                  <h3 className="font-bold mb-3">受試者回答</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-gray-600">風格偏好：</p>
                      <p className="font-medium">{selectedParticipant.answers.stylePreferenceInput}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">身形條件：</p>
                      <p className="font-medium">{selectedParticipant.answers.bodyShapeInput}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">韓系穿搭偏好：</p>
                      <p className="font-medium">{selectedParticipant.answers.koreanStylePreferenceInput}</p>
                    </div>
                  </div>
                </div>

                <div className="pb-6 border-b">
                  <h3 className="font-bold mb-3">風格驚喜感量表</h3>
                  <div className="text-sm">
                    <p className="text-gray-600">各題分數：{selectedParticipant.styleSurpriseItems.join(', ')}</p>
                    <p className="font-bold text-lg mt-2">
                      平均分數：{selectedParticipant.styleSurpriseScore.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-3">聊天紀錄</h3>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto text-xs space-y-2">
                    {selectedParticipant.chatLog.map((msg, idx) => (
                      <div key={idx} className="pb-2 border-b last:border-b-0">
                        <p className="text-gray-600">
                          [{msg.step}] {msg.sender === 'user' ? '👤 用戶' : '🤖 AI'}
                        </p>
                        <p className="font-medium text-gray-800">{msg.message}</p>
                        <p className="text-gray-400">{new Date(msg.timestamp).toLocaleString('zh-TW')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <p>選擇一位受試者以查看詳細資訊</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
