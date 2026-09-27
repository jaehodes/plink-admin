import { useCallback, useEffect, useRef } from 'react';

/**
 * 모달에서 ESC 키로 닫기
 * 반환된 ref를 모달 최상위 div에 연결하고 tabIndex={-1}을 추가하세요.
 * ESC 이벤트는 stopPropagation으로 상위 모달에 전파되지 않습니다.
 * 닫힌 후 상위 모달에 자동으로 포커스를 돌려줍니다.
 */
export function useEscRef(onClose: () => void) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;

    setTimeout(() => node.focus(), 0);

    node.onkeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();

        setTimeout(() => {
          const modals = document.querySelectorAll<HTMLDivElement>('[tabindex="-1"].fixed.inset-0');
          if (modals.length > 0) {
            modals[modals.length - 1].focus();
          }
        }, 0);
      }
    };
  }, []);

  return ref;
}
