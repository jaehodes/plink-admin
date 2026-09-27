'use client';

import { useEffect, useState } from 'react';

export default function DevTokenDisplay() {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'test') {
      const fetchToken = async () => {
        try {
          const response = await fetch('/api/auth/get-token');
          if (response.ok) {
            const data = await response.json();
            if (data.token) {
              setToken(data.token);
            }
          }
        } catch (error) {
          console.error('Failed to fetch token:', error);
        }
      };

      fetchToken();
    }
  }, []);

  if (!token) return null;

  return (
    <div className="mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
      <h2 className="text-lg font-semibold text-yellow-900 mb-3">🔧 개발자 도구</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-yellow-800 mb-1">
            JWT 토큰 (쿠키에 저장된 값)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-yellow-300 rounded text-sm font-mono overflow-x-auto"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(token);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors whitespace-nowrap"
            >
              {copied ? '복사됨!' : '복사'}
            </button>
          </div>
        </div>

        <p className="text-xs text-yellow-700">
          이 토큰 정보는 개발 환경에서만 표시됩니다. 프로덕션에서는 표시되지 않습니다.
        </p>
      </div>
    </div>
  );
}
