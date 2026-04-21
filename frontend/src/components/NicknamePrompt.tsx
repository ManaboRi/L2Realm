'use client';
import { useAuth } from '@/context/AuthContext';
import { NicknameModal } from './NicknameModal';

export function NicknamePrompt() {
  const { user, loading } = useAuth();
  const needNickname = !loading && !!user && !user.nickname;
  return (
    <NicknameModal
      open={needNickname}
      required
      title="Выбери никнейм"
      subtitle="Это твоё игровое имя на L2Realm. Можно сменить позже в профиле."
    />
  );
}
