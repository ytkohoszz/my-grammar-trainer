import { requestUrl } from "obsidian";
import { STARTER_PACK } from "./starterPack";
import {
  CachedPack,
  CefrLevel,
  ExerciseType,
  GrammarExercise,
  GrammarPack,
  GrammarTopic,
  PluginData
} from "./types";

const VALID_LEVELS: ReadonlySet<string> = new Set<CefrLevel>([
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2"
]);

const VALID_TYPES: ReadonlySet<string> = new Set<ExerciseType>([
  "cloze",
  "error",
  "transform",
  "input"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid or empty string field: ${field}`);
  }
  return value.trim();
}

function parseTopic(raw: unknown, index: number): GrammarTopic {
  if (!isRecord(raw)) {
    throw new Error(`Topic at index ${index} must be an object`);
  }
  const level = asNonEmptyString(raw.level, `topics[${index}].level`);
  if (!VALID_LEVELS.has(level)) {
    throw new Error(`Invalid CEFR level "${level}" in topics[${index}]`);
  }

  return {
    id: asNonEmptyString(raw.id, `topics[${index}].id`),
    category: asNonEmptyString(raw.category, `topics[${index}].category`),
    title: asNonEmptyString(raw.title, `topics[${index}].title`),
    level: level as CefrLevel,
    summary: typeof raw.summary === "string" ? raw.summary.trim() : ""
  };
}

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items : undefined;
}

function parseExercise(
  raw: unknown,
  index: number,
  topicIds: ReadonlySet<string>
): GrammarExercise {
  if (!isRecord(raw)) {
    throw new Error(`Exercise at index ${index} must be an object`);
  }
  const type = asNonEmptyString(raw.type, `exercises[${index}].type`);
  if (!VALID_TYPES.has(type)) {
    throw new Error(`Invalid exercise type "${type}" in exercises[${index}]`);
  }

  const topicId = asNonEmptyString(raw.topicId, `exercises[${index}].topicId`);
  if (!topicIds.has(topicId)) {
    throw new Error(`Exercise ${index} references unknown topicId "${topicId}"`);
  }

  const answer =
    typeof raw.answer === "string"
      ? raw.answer.trim()
      : (() => {
          throw new Error(`Invalid answer in exercises[${index}]`);
        })();

  return {
    id: asNonEmptyString(raw.id, `exercises[${index}].id`),
    topicId,
    type: type as ExerciseType,
    prompt: asNonEmptyString(raw.prompt, `exercises[${index}].prompt`),
    hint: typeof raw.hint === "string" ? raw.hint.trim() : undefined,
    options: parseStringArray(raw.options),
    tokens: parseStringArray(raw.tokens),
    errorWordIndex:
      typeof raw.errorWordIndex === "number" && Number.isInteger(raw.errorWordIndex)
        ? raw.errorWordIndex
        : undefined,
    answer,
    acceptedAnswers: parseStringArray(raw.acceptedAnswers),
    explanation: asNonEmptyString(raw.explanation, `exercises[${index}].explanation`)
  };
}

export function validateGrammarPack(raw: unknown): GrammarPack {
  if (!isRecord(raw)) {
    throw new Error("Pack root must be a JSON object");
  }
  if (!Array.isArray(raw.topics) || raw.topics.length === 0) {
    throw new Error("Pack must contain a non-empty 'topics' array");
  }
  if (!Array.isArray(raw.exercises) || raw.exercises.length === 0) {
    throw new Error("Pack must contain a non-empty 'exercises' array");
  }

  const topics = raw.topics.map((t, i) => parseTopic(t, i));
  const topicIds = new Set(topics.map((t) => t.id));
  const exercises = raw.exercises.map((e, i) => parseExercise(e, i, topicIds));

  return {
    version: typeof raw.version === "string" ? raw.version : "1.0.0",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    topics,
    exercises
  };
}

export async function fetchAndCachePack(url: string): Promise<CachedPack> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith("https://") && !trimmedUrl.startsWith("http://")) {
    throw new Error("Pack URL must start with https:// or http://");
  }

  const response = await requestUrl({
    url: trimmedUrl,
    method: "GET"
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status} while fetching grammar pack`);
  }

  const parsed: unknown = response.json ?? JSON.parse(response.text);
  const pack = validateGrammarPack(parsed);

  return {
    sourceUrl: trimmedUrl,
    fetchedAt: Date.now(),
    pack
  };
}

export function getActivePack(data: PluginData): {
  pack: GrammarPack;
  isRemote: boolean;
  fetchedAt: number | null;
} {
  if (data.cachedPack) {
    return {
      pack: data.cachedPack.pack,
      isRemote: true,
      fetchedAt: data.cachedPack.fetchedAt
    };
  }
  return {
    pack: STARTER_PACK,
    isRemote: false,
    fetchedAt: null
  };
}