import { Plugin, TFile, WorkspaceLeaf, normalizePath } from "obsidian";
import {
  getLocalDateKey,
  getMistakeCount,
  getOverallMastery,
  getWeakestTopics,
  recordExerciseAnswer
} from "./engine";
import {
  deriveRulesUrl,
  fetchAndCachePack,
  fetchAndCacheRulesPack,
  getActivePack
} from "./packLoader";
import { GrammarTrainerSettingTab } from "./settings";
import {
  DEFAULT_PLUGIN_DATA,
  GrammarDashboardSnapshot,
  GrammarExercise,
  PluginData,
  SHARED_GRAMMAR_STATE_KEY,
  SessionMode
} from "./types";
import { GRAMMAR_VIEW_TYPE, GrammarTrainerView } from "./view";

const DIARY_ROOT = "Ежедневник";
const MONTHS_RU = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь"
];

export default class GrammarTrainerPlugin extends Plugin {
  data: PluginData = { ...DEFAULT_PLUGIN_DATA };
  private dailySyncQueue: Promise<void> = Promise.resolve();

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.addSettingTab(new GrammarTrainerSettingTab(this.app, this));

    this.registerView(
      GRAMMAR_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new GrammarTrainerView(leaf, this)
    );

    this.addRibbonIcon("graduation-cap", "Открыть тренажёр грамматики", () => {
      void this.activateView();
    });

    this.addCommand({
      id: "open-grammar-trainer",
      name: "Открыть тренажёр грамматики",
      callback: () => {
        void this.activateView();
      }
    });

    this.registerObsidianProtocolHandler("grammar-trainer", (params) => {
      const rawMode = params.mode;
      const mode: SessionMode =
        rawMode === "mistakes" || rawMode === "topic" ? rawMode : "smart";
      const topicId = params.topicId || undefined;
      void this.openTrainer(mode, topicId);
    });

    this.syncDashboardSnapshot();
  }

  onunload(): void {
    // Leaves are automatically cleaned up by Obsidian when unloading.
  }

  async openTrainer(mode: SessionMode = "smart", topicId?: string): Promise<void> {
    await this.activateView(mode, topicId);
  }

  async activateView(mode?: SessionMode, topicId?: string): Promise<void> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(GRAMMAR_VIEW_TYPE);

    let targetLeaf: WorkspaceLeaf;
    if (existing.length > 0) {
      targetLeaf = existing[0];
      workspace.revealLeaf(targetLeaf);
    } else {
      targetLeaf = workspace.getLeaf(false);
      await targetLeaf.setViewState({
        type: GRAMMAR_VIEW_TYPE,
        active: true
      });
      workspace.revealLeaf(targetLeaf);
    }

    if (mode && targetLeaf.view instanceof GrammarTrainerView) {
      targetLeaf.view.startSession(mode, topicId);
    }
  }

  async syncRemotePack(): Promise<void> {
    const url = this.data.settings.packSourceUrl.trim();
    if (!url) {
      this.data.cachedPack = null;
      this.data.cachedRules = null;
      await this.savePluginData();
      this.syncDashboardSnapshot();
      this.refreshOpenViews();
      return;
    }

    const cached = await fetchAndCachePack(url);
    this.data.cachedPack = cached;

    const rulesUrl = deriveRulesUrl(url);
    if (rulesUrl) {
      try {
        this.data.cachedRules = await fetchAndCacheRulesPack(rulesUrl);
      } catch {
        // Keep existing cached rules or starter fallback if remote rules-pack is unavailable
      }
    }

    await this.savePluginData();
    this.syncDashboardSnapshot();
    this.refreshOpenViews();
  }

  refreshOpenViews(): void {
    const leaves = this.app.workspace.getLeavesOfType(GRAMMAR_VIEW_TYPE);
    for (const leaf of leaves) {
      if (leaf.view instanceof GrammarTrainerView) {
        leaf.view.refresh();
      }
    }
  }

  async recordExerciseResult(
    exercise: GrammarExercise,
    isCorrect: boolean
  ): Promise<void> {
    recordExerciseAnswer(this.data.progress, exercise, isCorrect);
    await this.savePluginData();
    this.syncDashboardSnapshot();

    const todayKey = getLocalDateKey();
    const todayAnswered = this.data.progress.daily[todayKey]?.answered ?? 1;
    this.enqueueDailyNoteSync(todayKey, todayAnswered);
  }

  private enqueueDailyNoteSync(dateKey: string, todayAnswered: number): void {
    this.dailySyncQueue = this.dailySyncQueue
      .then(() => this.syncDailyGrammarCount(dateKey, todayAnswered))
      .catch((err) => {
        console.error("[my-grammar-trainer] Failed to update daily note:", err);
      });
  }

  private async syncDailyGrammarCount(
    dateKey: string,
    todayAnswered: number
  ): Promise<void> {
    const file = await this.findOrCreateDailyNote(dateKey, todayAnswered);
    if (!file) return;

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (!fm["дата"]) {
        fm["дата"] = dateKey;
      }
      const prev = Number(fm["грамматика_упражнений"]);
      const current = Number.isFinite(prev) && prev > 0 ? Math.floor(prev) : 0;
      fm["грамматика_упражнений"] = Math.max(current + 1, todayAnswered);
    });
  }

  private async findOrCreateDailyNote(
    dateKey: string,
    initialCount: number
  ): Promise<TFile | null> {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match) return null;

    const [, year, month] = match;
    const monthIdx = Number(month) - 1;
    const monthName = MONTHS_RU[monthIdx] ?? month;

    const nestedFolder = normalizePath(`${DIARY_ROOT}/${year}/${month} - ${monthName}`);
    const nestedPath = normalizePath(`${nestedFolder}/${dateKey}.md`);
    const flatPath = normalizePath(`${DIARY_ROOT}/${dateKey}.md`);

    const directNested = this.app.vault.getAbstractFileByPath(nestedPath);
    if (directNested instanceof TFile) return directNested;

    const directFlat = this.app.vault.getAbstractFileByPath(flatPath);
    if (directFlat instanceof TFile) return directFlat;

    const existing = this.app.vault
      .getMarkdownFiles()
      .find(
        (f) =>
          f.basename === dateKey &&
          (f.path.startsWith(`${DIARY_ROOT}/`) || f.path === flatPath)
      );
    if (existing) return existing;

    await this.ensureFolderExists(nestedFolder);
    const content = `---\nдата: ${dateKey}\nграмматика_упражнений: ${Math.max(0, initialCount - 1)}\n---\n`;
    return await this.app.vault.create(nestedPath, content);
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    const parts = normalizePath(folderPath).split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        try {
          await this.app.vault.createFolder(current);
        } catch {
          // Ignore if folder was created concurrently
        }
      }
    }
  }

  getDashboardSnapshot(): GrammarDashboardSnapshot {
    const { pack } = getActivePack(this.data);
    const todayKey = getLocalDateKey();
    const today = this.data.progress.daily[todayKey];

    return {
      updatedAt: Date.now(),
      overallMastery: getOverallMastery(pack, this.data.progress),
      mistakesCount: getMistakeCount(pack, this.data.progress),
      todayAnswered: today?.answered ?? 0,
      todayCorrect: today?.correct ?? 0,
      totalTopics: pack.topics.length,
      weakestTopics: getWeakestTopics(pack, this.data.progress, 3).map((item) => ({
        id: item.topic.id,
        title: item.topic.title,
        level: item.topic.level,
        mastery: item.mastery,
        attempts: item.attempts
      }))
    };
  }

  private syncDashboardSnapshot(): void {
    const snapshot = this.getDashboardSnapshot();
    try {
      window.localStorage.setItem(
        SHARED_GRAMMAR_STATE_KEY,
        JSON.stringify(snapshot)
      );
      window.dispatchEvent(
        new CustomEvent("my-grammar-trainer:updated", { detail: snapshot })
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  private async loadPluginData(): Promise<void> {
    const raw = (await this.loadData()) as Partial<PluginData> | null;
    this.data = {
      settings: {
        ...DEFAULT_PLUGIN_DATA.settings,
        ...(raw?.settings ?? {})
      },
      cachedPack: raw?.cachedPack ?? null,
      cachedRules: raw?.cachedRules ?? null,
      progress: {
        topics: raw?.progress?.topics ?? {},
        exercises: raw?.progress?.exercises ?? {},
        daily: raw?.progress?.daily ?? {}
      }
    };
  }

  async savePluginData(): Promise<void> {
    await this.saveData(this.data);
  }
}