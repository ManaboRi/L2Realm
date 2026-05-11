'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Server } from '@/lib/types';
import { ServerCard } from '@/components/ServerCard';
import styles from './page.module.css';

type QuestionId = 'chronicle' | 'rates' | 'donate' | 'stage';
type AnswerValue =
  | 'interlude' | 'high-five' | 'classic' | 'essence' | 'god' | 'unknown'
  | 'slow' | 'medium' | 'fast' | 'instant'
  | 'cosmetic' | 'convenience' | 'donate-any'
  | 'proven' | 'fresh' | 'stage-any';

type Option = {
  value: AnswerValue;
  title: string;
  description: string;
};

type Question = {
  id: QuestionId;
  title: string;
  subtitle: string;
  options: Option[];
};

type Answers = Partial<Record<QuestionId, AnswerValue>>;

const QUESTIONS: Question[] = [
  {
    id: 'chronicle',
    title: 'Какую версию Lineage 2 хочется?',
    subtitle: 'Выбор хроники сразу сужает рекомендации. Если пока не уверен, оставь "Не знаю".',
    options: [
      { value: 'interlude', title: 'Interlude', description: 'Классическая C6: простая, понятная, с сильным PvP-ядром.' },
      { value: 'high-five', title: 'High Five', description: 'Больше контента, развитые классы и привычный late-game.' },
      { value: 'classic', title: 'Classic', description: 'Медленнее, строже, ближе к долгой официальной прогрессии.' },
      { value: 'essence', title: 'Essence', description: 'Современный быстрый формат с авто-механиками и динамичным темпом.' },
      { value: 'god', title: 'GoD', description: 'Пост-High Five эпоха: пробуждения, новые системы и другая мета.' },
      { value: 'unknown', title: 'Не знаю', description: 'Пусть квиз подберет без жесткой привязки к хронике.' },
    ],
  },
  {
    id: 'rates',
    title: 'Как хочешь прокачиваться?',
    subtitle: 'Здесь выбираем не цифры, а ощущение темпа игры.',
    options: [
      { value: 'slow', title: 'Медленно — ценю каждый уровень', description: 'Подойдут x1-x5: долгий путь, экономика и вес каждого предмета.' },
      { value: 'medium', title: 'Умеренно — за вечер виден прогресс', description: 'Подойдут x5-x30: уже бодро, но без мгновенного эндгейма.' },
      { value: 'fast', title: 'Быстро — хочу в PvP за пару дней', description: 'Подойдут x30-x200: минимум рутины, быстрый вход в активность.' },
      { value: 'instant', title: 'Мгновенно — сразу в эндгейм', description: 'Подойдут x200+: максимум скорости и быстрый фан.' },
    ],
  },
  {
    id: 'donate',
    title: 'Донат на сервере',
    subtitle: 'Выбираем комфортный уровень влияния магазина на игру.',
    options: [
      { value: 'cosmetic', title: 'Только косметика — за честный баланс', description: 'Ищем сервера, где донат не дает игровой силы.' },
      { value: 'convenience', title: 'Небольшие бонусы — не критично', description: 'Подойдут удобства и мягкие бонусы без грубого перекоса.' },
      { value: 'donate-any', title: 'Не важно — главное атмосфера и люди', description: 'Донат не фильтруем, решают остальные параметры.' },
    ],
  },
  {
    id: 'stage',
    title: 'Что важнее?',
    subtitle: 'Последний шаг решает, нужен ли стабильный проект или свежий старт.',
    options: [
      { value: 'proven', title: 'Старый надёжный — без риска закрытия', description: 'Ищем проекты, которые живут давно.' },
      { value: 'fresh', title: 'Свежий старт — начать вместе со всеми', description: 'Ищем будущие и недавно открывшиеся запуски.' },
      { value: 'stage-any', title: 'Без разницы', description: 'Сортируем по голосам и общей активности.' },
    ],
  },
];

export function QuizClient({ servers }: { servers: Server[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);

  const current = QUESTIONS[step];
  const selected = answers[current.id];
  const progress = showResult ? 100 : ((step + 1) / QUESTIONS.length) * 100;

  const result = useMemo(() => {
    if (!showResult) return [];
    return filterServers(servers, answers).slice(0, 3);
  }, [answers, servers, showResult]);

  function choose(value: AnswerValue) {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
  }

  function next() {
    if (!selected) return;
    if (step === QUESTIONS.length - 1) {
      setShowResult(true);
      return;
    }
    setStep(s => Math.min(QUESTIONS.length - 1, s + 1));
  }

  function back() {
    setShowResult(false);
    setStep(s => Math.max(0, s - 1));
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setShowResult(false);
  }

  return (
    <section className={styles.shell} aria-live="polite">
      <div className={styles.progressWrap}>
        <div className={styles.progressMeta}>
          <span>{showResult ? 'Результат' : `Вопрос ${step + 1} из ${QUESTIONS.length}`}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className={styles.progressTrack}>
          <span className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!showResult ? (
        <div key={current.id} className={styles.card}>
          <div className={styles.questionHead}>
            <h2>{current.title}</h2>
            <p>{current.subtitle}</p>
          </div>

          <div className={styles.options}>
            {current.options.map(option => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${active ? styles.optionActive : ''}`}
                  onClick={() => choose(option.value)}
                  aria-pressed={active}
                >
                  <span className={styles.radio} aria-hidden="true" />
                  <span className={styles.optionText}>
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.actions}>
            <button type="button" className="btn-ghost" onClick={back} disabled={step === 0}>
              Назад
            </button>
            <button type="button" className="btn-primary" onClick={next} disabled={!selected}>
              {step === QUESTIONS.length - 1 ? 'Показать результат' : 'Далее'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <div>
              <p className={styles.eyebrow}>Подбор завершён</p>
              <h2>Твои серверы</h2>
              <p>
                Здесь только сервера, которые проходят выбранные фильтры. Если список пустой,
                значит сейчас в каталоге нет точного совпадения под эти ответы.
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={restart}>
              Пройти заново
            </button>
          </div>

          {result.length > 0 ? (
            <div className={styles.resultList}>
              {result.map(server => (
                <div key={server.id} className={styles.resultItem}>
                  <ServerCard server={server} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>Точных совпадений пока нет. Попробуйте смягчить хронику, донат или стадию проекта.</p>
              <Link href="/" className="btn-gold">В каталог</Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function filterServers(servers: Server[], answers: Answers) {
  return servers
    .filter(server => matchesChronicle(server, answers.chronicle))
    .filter(server => matchesRate(server, answers.rates))
    .filter(server => matchesDonate(server, answers.donate))
    .filter(server => matchesStage(server, answers.stage))
    .sort((a, b) => {
      if ((b.weeklyVotes ?? 0) !== (a.weeklyVotes ?? 0)) return (b.weeklyVotes ?? 0) - (a.weeklyVotes ?? 0);
      if ((b.monthlyVotes ?? 0) !== (a.monthlyVotes ?? 0)) return (b.monthlyVotes ?? 0) - (a.monthlyVotes ?? 0);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
}

function matchesChronicle(server: Server, answer?: AnswerValue): boolean {
  if (!answer || answer === 'unknown') return true;
  const values = [server.chronicle, ...(server.instances ?? []).map(i => i.chronicle)].map(normalize);
  if (answer === 'god') {
    return values.some(v =>
      /awakening|harmony|tauti|glory|lindvior|valiance|ertheia|odyssey|helios|crusade|salvation|fafurion|war|class|terror|tome|dethrone|shine|rising|god/.test(v),
    );
  }
  const key = answer === 'high-five' ? 'high five' : answer;
  return values.some(v => v.includes(key));
}

function matchesRate(server: Server, answer?: AnswerValue): boolean {
  if (!answer) return true;
  const rates = [server.rateNum, ...(server.instances ?? []).map(i => i.rateNum)]
    .filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

  return rates.some(rate => {
    if (answer === 'slow') return rate >= 1 && rate <= 5;
    if (answer === 'medium') return rate >= 5 && rate <= 30;
    if (answer === 'fast') return rate >= 30 && rate <= 200;
    if (answer === 'instant') return rate >= 200;
    return true;
  });
}

function matchesDonate(server: Server, answer?: AnswerValue): boolean {
  if (!answer || answer === 'donate-any') return true;
  const values = [
    server.donate,
    ...(server.instances ?? []).map(i => i.donate),
  ].filter(value => value && value !== 'free');

  if (answer === 'cosmetic') return values.includes('cosmetic');
  if (answer === 'convenience') return values.includes('convenience') || values.includes('cosmetic');
  return true;
}

function matchesStage(server: Server, answer?: AnswerValue): boolean {
  if (!answer || answer === 'stage-any') return true;
  const now = Date.now();
  const dates = [server.openedDate, ...(server.instances ?? []).map(i => i.openedDate)]
    .filter(Boolean)
    .map(d => new Date(d as string).getTime())
    .filter(t => Number.isFinite(t));

  if (answer === 'fresh') return dates.some(t => t > now || (t <= now && now - t <= 90 * 86400000));
  if (answer === 'proven') return dates.some(t => t <= now && now - t >= 180 * 86400000);
  return true;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е');
}
