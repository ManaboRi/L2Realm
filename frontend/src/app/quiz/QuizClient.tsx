'use client';
import { useMemo, useState } from 'react';
import type { Server } from '@/lib/types';
import { ServerCard } from '@/components/ServerCard';
import styles from './page.module.css';

type QuestionId = 'chronicle' | 'rates' | 'focus' | 'donate' | 'stage';
type AnswerValue =
  | 'interlude' | 'high-five' | 'classic' | 'essence' | 'any'
  | 'r1-5' | 'r7-25' | 'r50plus'
  | 'pvp' | 'pve' | 'balanced'
  | 'free' | 'moderate' | 'open'
  | 'soon' | 'new' | 'proven';

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
    title: 'Какая хроника ближе?',
    subtitle: 'Если нет жесткой привязки, оставьте "Не важно" — квиз не будет давать бонус по хронике.',
    options: [
      { value: 'interlude', title: 'Interlude', description: 'Классическая C6: дуэли, осады и привычный темп.' },
      { value: 'high-five', title: 'High Five', description: 'Расширенная классика с большим количеством контента.' },
      { value: 'classic', title: 'Classic', description: 'Низкий темп, долгий прогресс, ближе к официальной ветке.' },
      { value: 'essence', title: 'Essence', description: 'Более быстрый современный формат с авто-механиками.' },
      { value: 'any', title: 'Не важно', description: 'Готов рассмотреть разные хроники.' },
    ],
  },
  {
    id: 'rates',
    title: 'Какие рейты комфортнее?',
    subtitle: 'Рейты считаются и по основной карточке проекта, и по отдельным запускам внутри проекта.',
    options: [
      { value: 'r1-5', title: 'x1-x5', description: 'Медленный прогресс, ценность каждого уровня и предмета.' },
      { value: 'r7-25', title: 'x7-x25', description: 'Компромисс между классикой и быстрым стартом.' },
      { value: 'r50plus', title: 'x50+', description: 'Быстрый кач, PvP и меньше рутины.' },
      { value: 'any', title: 'Не важно', description: 'Рейт не главный критерий.' },
    ],
  },
  {
    id: 'focus',
    title: 'На чем должен держаться сервер?',
    subtitle: 'Учитываются теги проекта и описание, поэтому совпадение мягкое, а не бинарное.',
    options: [
      { value: 'pvp', title: 'PvP', description: 'Бои, фан, быстрый вход в активность.' },
      { value: 'pve', title: 'PvE', description: 'Фарм, экономика, кланы и постепенное развитие.' },
      { value: 'balanced', title: 'Баланс', description: 'Нужен нормальный микс PvP и PvE без перекоса.' },
      { value: 'any', title: 'Не важно', description: 'Главное, чтобы проект был живой.' },
    ],
  },
  {
    id: 'donate',
    title: 'Какой донат приемлем?',
    subtitle: 'Скоринг уважает строгий выбор, но не прячет полностью остальные варианты.',
    options: [
      { value: 'free', title: 'Нет доната', description: 'Только честная игра без преимуществ за деньги.' },
      { value: 'moderate', title: 'Умеренный', description: 'Косметика или удобства без грубого влияния на баланс.' },
      { value: 'open', title: 'Свободный', description: 'Донат не пугает, если сервер подходит по остальному.' },
      { value: 'any', title: 'Не важно', description: 'Этот критерий можно не учитывать.' },
    ],
  },
  {
    id: 'stage',
    title: 'На какой стадии интереснее играть?',
    subtitle: 'Для проектов с несколькими запусками учитывается ближайшая или последняя дата запуска.',
    options: [
      { value: 'soon', title: 'Открытие скоро', description: 'Хочется стартовать с первой волной игроков.' },
      { value: 'new', title: 'Новый до 3 мес.', description: 'Старт уже прошел, но сервер еще свежий.' },
      { value: 'proven', title: 'Проверенный', description: 'Лучше стабильный проект с историей.' },
      { value: 'any', title: 'Не важно', description: 'Возраст сервера не решает.' },
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
    return scoreServers(servers, answers).slice(0, 3);
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
              <p className={styles.eyebrow}>Скоринг завершен</p>
              <h2>Твои серверы</h2>
              <p>
                Это не жесткий фильтр: серверы получили баллы за совпадения с ответами,
                а затем отсортировались по релевантности, активности и рейтингу.
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={restart}>
              Пройти заново
            </button>
          </div>

          {result.length > 0 ? (
            <div className={styles.resultList}>
              {result.map(item => (
                <div key={item.server.id} className={styles.resultItem}>
                  <div className={styles.scoreLine}>
                    <span>{item.score} баллов совпадения</span>
                    <span>{item.reasons.slice(0, 3).join(' · ') || 'Общий рейтинг каталога'}</span>
                  </div>
                  <ServerCard server={item.server} />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p>Серверов пока не удалось получить. Попробуйте открыть квиз позже или перейти в каталог.</p>
              <a href="/" className="btn-gold">В каталог</a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function scoreServers(servers: Server[], answers: Answers) {
  return servers
    .map(server => {
      const reasons: string[] = [];
      let score = 0;

      const chronicle = answers.chronicle;
      if (chronicle && chronicle !== 'any' && matchesChronicle(server, chronicle)) {
        score += 10;
        reasons.push('хроника');
      }

      const rates = answers.rates;
      if (rates && rates !== 'any' && matchesRates(server, rates)) {
        score += 10;
        reasons.push('рейты');
      }

      const focus = answers.focus;
      if (focus && focus !== 'any') {
        const focusScore = focusPoints(server, focus);
        if (focusScore > 0) {
          score += focusScore;
          reasons.push(focus === 'balanced' ? 'баланс' : focus.toUpperCase());
        }
      }

      const donate = answers.donate;
      if (donate && donate !== 'any') {
        const donateScore = donatePoints(server, donate);
        if (donateScore > 0) {
          score += donateScore;
          reasons.push('донат');
        }
      }

      const stage = answers.stage;
      if (stage && stage !== 'any' && matchesStage(server, stage)) {
        score += 10;
        reasons.push('стадия');
      }

      if (server._isVip) score += 1.5;
      if (server._isBoosted) score += 1;
      if (server._isSod) score += 1;

      return { server, score, reasons };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if ((b.server.weeklyVotes ?? 0) !== (a.server.weeklyVotes ?? 0)) {
        return (b.server.weeklyVotes ?? 0) - (a.server.weeklyVotes ?? 0);
      }
      return (b.server.rating ?? 0) - (a.server.rating ?? 0);
    });
}

function matchesChronicle(server: Server, answer: AnswerValue): boolean {
  const values = [
    server.chronicle,
    ...(server.instances ?? []).map(i => i.chronicle),
  ].map(v => normalize(v));
  const key = answer === 'high-five' ? 'high' : answer;
  return values.some(v => v.includes(key));
}

function matchesRates(server: Server, answer: AnswerValue): boolean {
  const rates = [
    server.rateNum,
    ...(server.instances ?? []).map(i => i.rateNum),
  ].filter((n): n is number => typeof n === 'number' && Number.isFinite(n));

  return rates.some(rate => {
    if (answer === 'r1-5') return rate >= 1 && rate <= 5;
    if (answer === 'r7-25') return rate >= 7 && rate <= 25;
    if (answer === 'r50plus') return rate >= 50;
    return false;
  });
}

function focusPoints(server: Server, answer: AnswerValue): number {
  const text = normalize([
    server.shortDesc,
    server.fullDesc,
    ...(server.type ?? []),
    ...(server.instances ?? []).flatMap(i => [i.label, i.shortDesc]),
  ].filter(Boolean).join(' '));

  if (answer === 'pvp') return /pvp|пвп|фан|осад|дуэл/.test(text) ? 10 : 0;
  if (answer === 'pve') return /pve|пве|фарм|эконом|квест|рейд/.test(text) ? 10 : 0;
  if (answer === 'balanced') {
    const hasPvp = /pvp|пвп|фан|осад|дуэл/.test(text);
    const hasPve = /pve|пве|фарм|эконом|квест|рейд/.test(text);
    return hasPvp && hasPve ? 10 : hasPvp || hasPve ? 5 : 0;
  }
  return 0;
}

function donatePoints(server: Server, answer: AnswerValue): number {
  if (answer === 'free') return server.donate === 'free' ? 10 : 0;
  if (answer === 'moderate') return server.donate === 'cosmetic' || server.donate === 'free' ? 10 : 0;
  if (answer === 'open') return server.donate === 'p2w' ? 10 : 4;
  return 0;
}

function matchesStage(server: Server, answer: AnswerValue): boolean {
  const now = Date.now();
  const dates = [
    server.openedDate,
    ...(server.instances ?? []).map(i => i.openedDate),
  ]
    .filter(Boolean)
    .map(d => new Date(d as string).getTime())
    .filter(t => Number.isFinite(t));

  if (answer === 'soon') return dates.some(t => t > now);
  if (answer === 'new') return dates.some(t => t <= now && now - t <= 90 * 86400000);
  if (answer === 'proven') return dates.length === 0 || dates.some(t => t <= now && now - t > 90 * 86400000);
  return false;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/ё/g, 'е');
}
