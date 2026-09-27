'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithAuth, setAuthFailed } = useAuth();
  const isProcessing = useRef(false);

  useEffect(() => {
    const auth = searchParams.get('auth');

    if (auth && !isProcessing.current) {
      isProcessing.current = true;
      // auth 파라미터가 있으면 로그인 시도
      const handleAuth = async () => {
        const result = await loginWithAuth(auth);

        if (result.success) {
          // 로그인 성공 시 auth 파라미터 제거
          router.replace('/');
        } else {
          // 로그인 실패 시 상태 업데이트
          setAuthFailed?.(true);
          // 잠시 후 에러 메시지 표시
          setTimeout(() => {
            alert(result.errorMessage || '인증에 실패했습니다.');
          }, 100);
        }
      };

      handleAuth();
    }
  }, [searchParams, loginWithAuth, router, setAuthFailed]);

  return null;
}
