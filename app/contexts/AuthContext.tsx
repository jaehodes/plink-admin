'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LoginResult {
  success: boolean;
  errorCode?: number;
  errorMessage?: string;
}

interface AuthContextType {
  loginWithAuth: (auth: string) => Promise<LoginResult>;
  refreshToken: () => Promise<LoginResult>;
  isLoading: boolean;
  isAuthenticated: boolean;
  authFailed: boolean;
  setAuthFailed: (failed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true); // 초기에는 로딩 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  const loginWithAuth = async (auth: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: new URLSearchParams({
          auth
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // 성공(0)
        if (data.ret === 0) {
          setIsAuthenticated(true);
          return { success: true };
        }

        // 오류 코드별 처리
        let errorMessage = '';
        switch (data.ret) {
          case 1:
            errorMessage = '잘못된 요청입니다. 인증 정보를 확인해주세요.';
            break;
          case 2:
            errorMessage = '인증키 오류입니다. 올바른 인증키를 사용해주세요.';
            break;
          case 3:
            errorMessage = '인증 시간이 초과되었습니다. 다시 시도해주세요.';
            break;
          default:
            errorMessage = '알 수 없는 오류가 발생했습니다.';
        }

        return {
          success: false,
          errorCode: data.ret,
          errorMessage
        };
      }

      return {
        success: false,
        errorCode: -1,
        errorMessage: '서버 연결에 실패했습니다.'
      };
    } catch (error) {
      console.error('Login with auth error:', error);
      return {
        success: false,
        errorCode: -1,
        errorMessage: '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'
      };
    }
  };

  const refreshToken = async (): Promise<LoginResult> => {
    try {
      // 먼저 토큰이 있는지 확인
      const checkResponse = await fetch('/api/auth/token-expiry');
      const checkData = await checkResponse.json();

      if (!checkData.exp) {
        setIsAuthenticated(false);
        return {
          success: false,
          errorCode: -1,
          errorMessage: '토큰이 없습니다.'
        };
      }

      // 남은 시간이 30분 이상이면 갱신 스킵
      const remainingMs = checkData.exp * 1000 - Date.now();
      if (remainingMs > 30 * 60 * 1000) {
        setIsAuthenticated(true);
        return { success: true };
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();

        // 성공(0)
        if (data.ret === 0) {
          setIsAuthenticated(true);
          return { success: true };
        }

        // 갱신 실패
        setIsAuthenticated(false);

        let errorMessage = '';
        switch (data.ret) {
          case 1:
            errorMessage = '잘못된 요청입니다.';
            break;
          case 3:
            errorMessage = '인증 토큰 발급에 실패했습니다.';
            break;
          case 100:
            errorMessage = '인증 토큰 오류입니다. 다시 로그인해주세요.';
            break;
          default:
            errorMessage = '토큰 갱신에 실패했습니다.';
        }

        return {
          success: false,
          errorCode: data.ret,
          errorMessage
        };
      }

      setIsAuthenticated(false);
      return {
        success: false,
        errorCode: -1,
        errorMessage: '서버 연결에 실패했습니다.'
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      setIsAuthenticated(false);
      return {
        success: false,
        errorCode: -1,
        errorMessage: '토큰 갱신 중 오류가 발생했습니다.'
      };
    }
  };

  // AuthProvider 마운트 시 한 번만 토큰 갱신
  useEffect(() => {
    const initAuth = async () => {
      if (isInitialized) return;

      // URL에 auth 파라미터가 있으면 토큰 갱신을 건너뛰고 로그인 처리를 기다림
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth')) {
        console.log('AuthProvider: Skipping token refresh, auth parameter detected');
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      console.log('AuthProvider: Initializing authentication...');
      await refreshToken();
      setIsInitialized(true);
      setIsLoading(false);
    };

    initAuth();
  }, [isInitialized]);

  return (
    <AuthContext.Provider value={{ loginWithAuth, refreshToken, isLoading, isAuthenticated, authFailed, setAuthFailed }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
