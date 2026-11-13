export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type ExerciseType = "cloze" | "error" | "transform" | "input";

export interface GrammarTopic {
  id: string;
  category: string;
  title: string;
  level: CefrLevel;
  summary: string;
}

export interface GrammarExercise {
  id: string;
  topicId: string;
  type: ExerciseType;
  prompt: string;
  hint?: string;
  options?: string[];
  tokens?: string[];
  errorWordIndex?: number;
  answer: string;
  acceptedAnswers?: string[];
  explanation: string;
}

export interface GrammarPack {
  version: string;
  updatedAt: string;
  topics: GrammarTopic[];
  exercises: GrammarExercise[];
}

export interface CachedPack {
  sourceUrl: string;
  fetchedAt: number;
  pack: GrammarPack;
}

export interface RuleExample {
  en: string;
  note?: string;
}

export interface GrammarRule {
  topicId: string;
  formula: string;
  points: string[];
  examples: RuleExample[];
  pitfall?: string;
}

export interface RulesPack {
  version: string;
  rules: GrammarRule[];
}

export interface CachedRulesPack {
  sourceUrl: string;
  fetchedAt: number;
  pack: RulesPack;
}

export interface GrammarTrainerSettings {

export const SHARED_GRAMMAR_STATE_KEY = "my-grammar-trainer:dashboard-state";

export interface WeakTopicSummary {
  id: string;
  title: string;
  level: CefrLevel;
  mastery: number;
  attempts: number;
}

export interface GrammarDashboardSnapshot {
  updatedAt: number;
  overallMastery: number;
  mistakesCount: number;
  todayAnswered: number;
  todayCorrect: number;
  totalTopics: number;
  weakestTopics: WeakTopicSummary[];
}

export interface TopicStats {
  attempts: number;
  correct: number;
  streak: number;
  mastery: number;
  lastPracticedAt: number;
}

export interface ExerciseStats {
  attempts: number;
  correct: number;
  lastResult: boolean;
  lastAttemptAt: number;
  needsReview: boolean;
}

export interface DailyActivity {
  date: string;
  answered: number;
  correct: number;
}

export interface GrammarProgress {
  topics: Record<string, TopicStats>;
  exercises: Record<string, ExerciseStats>;
  daily: Record<string, DailyActivity>;
}

export const DEFAULT_PROGRESS: GrammarProgress = {
  topics: {},
  exercises: {},
  daily: {}
};

export interface GrammarTrainerSettings {
  packSourceUrl: string;
  sessionLength: number;
}

export const DEFAULT_SETTINGS: GrammarTrainerSettings = {
  packSourceUrl:
    "https://raw.githubusercontent.com/ytkohoszz/my-grammar-trainer/master/packs/grammar-pack.json",
  sessionLength: 12
};

export interface PluginData {
  settings: GrammarTrainerSettings;
  cachedPack: CachedPack | null;
  cachedRules?: CachedRulesPack | null;
  progress: GrammarProgress;
}

export const DEFAULT_PLUGIN_DATA: PluginData = {
  settings: { ...DEFAULT_SETTINGS },
  cachedPack: null,
  cachedRules: null,
  progress: {
    topics: {},
    exercises: {},
    daily: {}
  }
};