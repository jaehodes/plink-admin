'use client';

import { useState } from 'react';
import Modal, { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { createTier1Agency } from '../actions';
import { LOGIN_ID_PATTERN, MIN_PASSWORD_LENGTH } from '../../types/agency';

interface CreateTier1ModalProps {
  onClose: () => void;
  /** 만든 계정 id */
  onCreated: (id: string) => void;
}

/**
 * tier-1 대리점 계정을 만든다. tier-2·3은 부모 대리점이 만든다.
 * tier-1 단가는 플랫폼 단가를 쓰므로 여기서 정하지 않는다. 건수는 만든 뒤 상세 화면에서 적립한다.
 */
export default function CreateTier1Modal({ onClose, onCreated }: CreateTier1ModalProps) {
  const { showToast } = useToast();
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedLoginId = loginId.trim().toLowerCase();
  const problem =
    (loginId && !LOGIN_ID_PATTERN.test(normalizedLoginId) && '로그인 ID는 영문 소문자/숫자로 시작하고 영문 소문자, 숫자, . _ - 만 쓸 수 있습니다 (3~64자).') ||
    (password && password.length < MIN_PASSWORD_LENGTH && `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`) ||
    (passwordConfirm && password !== passwordConfirm && '비밀번호 확인이 일치하지 않습니다.') ||
    null;
  const canSubmit = !!normalizedLoginId && !!name.trim() && !!password && password === passwordConfirm && !problem;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const r = await createTier1Agency({ loginId: normalizedLoginId, name, password });
      if (!r.ok || !r.data) {
        setError(r.code === 'LOGIN_ID_TAKEN' ? '이미 사용 중인 로그인 ID입니다.' : r.error);
        return;
      }
      showToast(`tier-1 계정 ${r.data.loginId}을(를) 만들었습니다.`);
      onCreated(r.data.id);
    } catch {
      setError('계정 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="tier-1 대리점 계정 만들기"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className={primaryButtonClass} onClick={submit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? '만드는 중...' : '만들기'}
          </button>
        </>
      }
    >
      <div>
        <label className={labelClass}>로그인 ID</label>
        <input className={inputClass} value={loginId} onChange={(e) => { setLoginId(e.target.value); setError(null); }} placeholder="예: agency01" autoFocus autoComplete="off" />
      </div>
      <div>
        <label className={labelClass}>이름</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="대리점 이름" />
      </div>
      <div>
        <label className={labelClass}>초기 비밀번호 ({MIN_PASSWORD_LENGTH}자 이상)</label>
        <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <div>
        <label className={labelClass}>비밀번호 확인</label>
        <input className={inputClass} type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <p className="text-xs text-slate-400">단가는 플랫폼 단가를 따릅니다. 건수는 계정을 만든 뒤 상세 화면에서 적립합니다.</p>
      {(problem || error) && <p className="text-xs text-red-600">{problem || error}</p>}
    </Modal>
  );
}
