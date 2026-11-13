import { Plugin, WorkspaceLeaf } from "obsidian";
import {
  getLocalDateKey,
  getMistakeCount,
  getOverallMastery,
  getWeakestTopics,
  recordExerciseAnswer
} from "./engine";
import { fetchAndCachePack, getActivePack } from "./packLoader";
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

export default class GrammarTrainerPlugin extends Plugin {
  data: PluginData = { ...DEFAULT_PLUGIN_DATA };

  async onload(): Promise<void> {
    await this.loadPluginData();

    this.addSettingTab(new GrammarTrainerSettingTab(this.app, this));

    this.registerView(
      GRAMMAR_VIEW_TYPE,
      (leaf: WorkspaceLeaf) => new GrammarTrainerView(leaf, this)
    );

    this.addRibbonIcon("graduation-cap", "Open Grammar Trainer", () => {
      void this.activateView();
    });

this.addCommand({
      id: "open-grammar-trainer",
      name: "Open Grammar Trainer",
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
    // Leaves are automatically cleaned up by Obsidian when unloading,
    // or kept if needed; no custom global listeners yet.
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
      await this.savePluginData();
      this.syncDashboardSnapshot();
      this.refreshOpenViews();
      return;
    }

    const cached = await fetchAndCachePack(url);
    this.data.cachedPack = cached;
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