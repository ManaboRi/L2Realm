'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import styles from './VoteButton.module.css';

interface Props {
  serverId:    string;
  weeklyVotes?: number;
}

export function VoteButton({ serverId, weeklyVotes = 0 }: Props) {
  const { token } = useAuth();
  const [voted,   setVoted]   = useState(false);
  const [count,   setCount]   = useState(weeklyVotes);
  const [loading, setLoading] = useState(false);

  async function handleVote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading || voted || !token) return;
    setLoading(true);
    try {
      await api.votes.vote(serverId, token);
      setVoted(true);
      setCount(c => c + 1);
    } catch {
      setVoted(true);
    }
    setLoading(false);
  }

  const cls = [
    styles.btn,
    voted    ? styles.voted : '',
    !token   ? styles.muted : '',
  ].filter(Boolean).join(' ');

  const label = voted
    ? '✓ Учтён'
    : count > 0
      ? count.toLocaleString('ru-RU')
      : !token ? '—' : 'Голосовать';

  return (
    <button
      type="button"
      className={cls}
      onClick={handleVote}
      disabled={loading || voted || !token}
      title={
        !token ? 'Войдите чтобы проголосовать'
        : voted ? 'Голос учтён — следующий через 12 ч.'
        : 'Голосовать за сервер (раз в 12 ч.)'
      }
    >
      <VoteArrow />
      <span>{label}</span>
    </button>
  );
}

function VoteArrow() {
  return (
    <svg className={styles.ico} viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 0L9.5 5.5H7V11H3V5.5H0.5L5 0Z" fill="currentColor" />
    </svg>
  );
}
