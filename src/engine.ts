import {
  GrammarExercise,
  GrammarPack,
  GrammarProgress,
  GrammarTopic,
  SessionMode,
  TopicStats
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getLocalDateKey(now = Date.now()): string {
  const d = new Date(now);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .toLowerCase();
}

export function checkExerciseAnswer(
  exercise: GrammarExercise,
  userAnswer: string
): boolean {
  const normalizedInput = normalizeAnswer(userAnswer);
  if (normalizeAnswer(exercise.answer) === normalizedInput) {
    return true;
  }

  if (exercise.acceptedAnswers) {
    for (const variant of exercise.acceptedAnswers) {
      if (normalizeAnswer(variant) === normalizedInput) {
        return true;
      }
    }
  }

  return false;
}

export function computeEffectiveMastery(
  stats: TopicStats | undefined,
  now = Date.now()
): number {
  if (!stats || stats.attempts === 0) return 0;

  const daysSince = Math.max(0, (now - stats.lastPracticedAt) / DAY_MS);
  // Gentle decay after 3 days of inactivity: -2 pts per extra day
  const decay = daysSince > 3 ? (daysSince - 3) * 2 : 0;
  return Math.max(0, Math.min(100, Math.round(stats.mastery - decay)));
}

export function recordExerciseAnswer(
  progress: GrammarProgress,
  exercise: GrammarExercise,
  isCorrect: boolean,
  now = Date.now()
): void {
  const prevTopic = progress.topics[exercise.topicId];
  let nextMastery: number;

  if (!prevTopic || prevTopic.attempts === 0) {
    nextMastery = isCorrect ? 60 : 20;
  } else if (isCorrect) {
    const gain = Math.max(4, Math.round(((100 - prevTopic.mastery) * 0.25) + Math.min(prevTopic.streak, 4) * 1.5));
    nextMastery = Math.min(100, prevTopic.mastery + gain);
  } else {
    const penalty = Math.max(12, Math.round(prevTopic.mastery * 0.22));
    nextMastery = Math.max(0, prevTopic.mastery - penalty);
  }

  progress.topics[exercise.topicId] = {
    attempts: (prevTopic?.attempts ?? 0) + 1,
    correct: (prevTopic?.correct ?? 0) + (isCorrect ? 1 : 0),
    streak: isCorrect ? (prevTopic?.streak ?? 0) + 1 : 0,
    mastery: nextMastery,
    lastPracticedAt: now
  };

  const prevEx = progress.exercises[exercise.id];
  progress.exercises[exercise.id] = {
    attempts: (prevEx?.attempts ?? 0) + 1,
    correct: (prevEx?.correct ?? 0) + (isCorrect ? 1 : 0),
    lastResult: isCorrect,
    lastAttemptAt: now,
    needsReview: !isCorrect
  };

  const dateKey = getLocalDateKey(now);
  const prevDay = progress.daily[dateKey];
  progress.daily[dateKey] = {
    date: dateKey,
    answered: (prevDay?.answered ?? 0) + 1,
    correct: (prevDay?.correct ?? 0) + (isCorrect ? 1 : 0)
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function spreadTopics(queue: GrammarExercise[]): GrammarExercise[] {
  if (queue.length <= 2) return queue;
  const result: GrammarExercise[] = [];
  const pool = [...queue];

  while (pool.length > 0) {
    const lastTopic = result.length > 0 ? result[result.length - 1].topicId : null;
    const idx = pool.findIndex((item) => item.topicId !== lastTopic);
    const pickIdx = idx >= 0 ? idx : 0;
    result.push(pool.splice(pickIdx, 1)[0]);
  }

  return result;
}

export function buildSessionQueue(
  pack: GrammarPack,
  progress: GrammarProgress,
  mode: SessionMode,
  length: number,
  topicId?: string,
  now = Date.now()
): GrammarExercise[] {
  const targetLen = Math.max(1, length);

  if (mode === "topic" && topicId) {
    const topicExercises = pack.exercises.filter((ex) => ex.topicId === topicId);
    const sorted = shuffleArray(topicExercises).sort((a, b) => {
      const aMistake = progress.exercises[a.id]?.needsReview ? 1 : 0;
      const bMistake = progress.exercises[b.id]?.needsReview ? 1 : 0;
      if (aMistake !== bMistake) return bMistake - aMistake;

      const aTime = progress.exercises[a.id]?.lastAttemptAt ?? 0;
      const bTime = progress.exercises[b.id]?.lastAttemptAt ?? 0;
      return aTime - bTime;
    });
    return sorted.slice(0, targetLen);
  }

  if (mode === "mistakes") {
    const mistakes = pack.exercises.filter(
      (ex) => progress.exercises[ex.id]?.needsReview === true
    );
    const sorted = shuffleArray(mistakes).sort((a, b) => {
      const aTime = progress.exercises[a.id]?.lastAttemptAt ?? 0;
      const bTime = progress.exercises[b.id]?.lastAttemptAt ?? 0;
      return aTime - bTime;
    });
    return spreadTopics(sorted.slice(0, targetLen));
  }

  // Smart adaptive mode: ~70% weak/mistakes/unseen, ~20% cooling, ~10% mastered checkup
  const weakOrDue: GrammarExercise[] = [];
  const cooling: GrammarExercise[] = [];
  const mastered: GrammarExercise[] = [];

  for (const ex of pack.exercises) {
    const exStats = progress.exercises[ex.id];
    const mastery = computeEffectiveMastery(progress.topics[ex.topicId], now);

    if (exStats?.needsReview || mastery < 55) {
      weakOrDue.push(ex);
    } else if (mastery < 85) {
      cooling.push(ex);
    } else {
      mastered.push(ex);
    }
  }

  const weakCount = Math.ceil(targetLen * 0.7);
  const coolingCount = Math.ceil(targetLen * 0.2);
  const masteredCount = Math.max(1, targetLen - weakCount - coolingCount);

  const selected: GrammarExercise[] = [];
  const usedIds = new Set<string>();

  const takeFrom = (source: GrammarExercise[], count: number) => {
    const ordered = shuffleArray(source).sort((a, b) => {
      const aReview = progress.exercises[a.id]?.needsReview ? 1 : 0;
      const bReview = progress.exercises[b.id]?.needsReview ? 1 : 0;
      if (aReview !== bReview) return bReview - aReview;

      const aTime = progress.exercises[a.id]?.lastAttemptAt ?? 0;
      const bTime = progress.exercises[b.id]?.lastAttemptAt ?? 0;
      return aTime - bTime;
    });

    for (const item of ordered) {
      if (selected.length >= targetLen || count <= 0) break;
      if (!usedIds.has(item.id)) {
        selected.push(item);
        usedIds.add(item.id);
        count--;
      }
    }
  };

  takeFrom(weakOrDue, weakCount);
  takeFrom(cooling, coolingCount);
  takeFrom(mastered, masteredCount);

  // Fill remaining slots if any bucket was smaller than its quota
  if (selected.length < targetLen) {
    takeFrom(pack.exercises, targetLen - selected.length);
  }

  return spreadTopics(selected);
}

export function getMistakeCount(
  pack: GrammarPack,
  progress: GrammarProgress
): number {
  let count = 0;
  for (const ex of pack.exercises) {
    if (progress.exercises[ex.id]?.needsReview) {
      count++;
    }
  }
  return count;
}

export function getOverallMastery(
  pack: GrammarPack,
  progress: GrammarProgress,
  now = Date.now()
): number {
  if (pack.topics.length === 0) return 0;
  let sum = 0;
  for (const topic of pack.topics) {
    sum += computeEffectiveMastery(progress.topics[topic.id], now);
  }
  return Math.round(sum / pack.topics.length);
}

export function getWeakestTopics(
  pack: GrammarPack,
  progress: GrammarProgress,
  limit = 3,
  now = Date.now()
): Array<{ topic: GrammarTopic; mastery: number; attempts: number }> {
  return pack.topics
    .map((topic) => {
      const stats = progress.topics[topic.id];
      return {
        topic,
        mastery: computeEffectiveMastery(stats, now),
        attempts: stats?.attempts ?? 0
      };
    })
    .sort((a, b) => {
      if (a.mastery !== b.mastery) return a.mastery - b.mastery;
      return b.attempts - a.attempts;
    })
    .slice(0, limit);
}