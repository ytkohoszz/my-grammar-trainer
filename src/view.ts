import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import {
  buildSessionQueue,
  getMistakeCount,
  getOverallMastery
} from "./engine";
import { renderExerciseCard } from "./exerciseCard";
import type GrammarTrainerPlugin from "./main";
import { getActivePack, getActiveRules } from "./packLoader";
import { renderRulesOverlay } from "./rulesView";
import { renderTopicsMap } from "./topicsMap";
import { GrammarExercise, GrammarTopic, SessionMode } from "./types";

export const GRAMMAR_VIEW_TYPE = "my-grammar-trainer-view";

export class GrammarTrainerView extends ItemView {
  private plugin: GrammarTrainerPlugin;
  private rootEl: HTMLElement | null = null;
  private stageEl: HTMLElement | null = null;
  private mapHostEl: HTMLElement | null = null;

  private mode: SessionMode = "smart";
  private selectedTopicId: string | undefined = undefined;
  private isMapOpen = false;
  private isRulesOpen = false;
  private activeRuleTopicId: string | undefined = undefined;
  private queue: GrammarExercise[] = [];
  private currentIndex = 0;
  private sessionCorrect = 0;
  private currentAnswered = false;

  constructor(leaf: WorkspaceLeaf, plugin: GrammarTrainerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  refresh(): void {
    this.startSession(this.mode, this.selectedTopicId);
  }

  getViewType(): string {
    return GRAMMAR_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Grammar Trainer";
  }

  getIcon(): string {
    return "graduation-cap";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    if (!(container instanceof HTMLElement)) return;

    container.empty();
    container.addClass("mgt-view-container");

    this.rootEl = container.createDiv({ cls: "mgt-root" });

    this.registerDomEvent(window, "keydown", (e: KeyboardEvent) => {
      if (this.app.workspace.getActiveViewOfType(GrammarTrainerView) !== this) {
        return;
      }
      this.handleKeydown(e);
    });

    this.startSession("smart");
  }

async onClose(): Promise<void> {
    this.rootEl?.empty();
    this.rootEl = null;
    this.stageEl = null;
    this.mapHostEl = null;
  }

startSession(mode: SessionMode, topicId?: string): void {
    this.mode = mode;
    this.selectedTopicId = topicId;
    this.isMapOpen = false;
    this.isRulesOpen = false;

    const { pack } = getActivePack(this.plugin.data);
    this.queue = buildSessionQueue(
      pack,
      this.plugin.data.progress,
      mode,
      this.plugin.data.settings.sessionLength,
      topicId
    );
    this.currentIndex = 0;
    this.sessionCorrect = 0;
    this.currentAnswered = false;

    this.renderLayout();
  }

private handleKeydown(e: KeyboardEvent): void {
    const target = e.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return;
    }

if (e.key === "Escape" && (this.isMapOpen || this.isRulesOpen)) {
      e.preventDefault();
      this.isMapOpen = false;
      this.isRulesOpen = false;
      this.syncOverlays();
      return;
    }

    if (e.key === "m" || e.key === "M") {
      e.preventDefault();
      this.toggleMap();
      return;
    }

    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      this.toggleRules();
      return;
    }

    if (this.isMapOpen || this.isRulesOpen) return;

    if (!this.currentAnswered && ["1", "2", "3", "4"].includes(e.key)) {
      const btn = this.stageEl?.querySelector<HTMLButtonElement>(
        `.mgt-option-btn[data-shortcut="${e.key}"]`
      );
      if (btn && !btn.closest(".is-hidden")) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    if (this.currentAnswered && (e.key === "Enter" || e.key === " ")) {
      const nextBtn = this.stageEl?.querySelector<HTMLButtonElement>(".mgt-next-btn");
      if (nextBtn) {
        e.preventDefault();
        nextBtn.click();
      }
    }
  }

  private renderLayout(): void {
    if (!this.rootEl) return;
    this.rootEl.empty();

    const { pack } = getActivePack(this.plugin.data);
    const mistakesCount = getMistakeCount(pack, this.plugin.data.progress);

    // Floating Island Toolbar
    const island = this.rootEl.createDiv({ cls: "mgt-island-bar" });

    const smartBtn = island.createEl("button", {
      cls: `mgt-island-btn ${this.mode === "smart" ? "is-active" : ""}`,
      text: "Smart"
    });
    smartBtn.type = "button";
    smartBtn.addEventListener("click", () => this.startSession("smart"));

    const mistakesLabel = mistakesCount > 0 ? `Mistakes (${mistakesCount})` : "Mistakes";
    const mistakesBtn = island.createEl("button", {
      cls: `mgt-island-btn ${this.mode === "mistakes" ? "is-active" : ""}`,
      text: mistakesLabel
    });
    mistakesBtn.type = "button";
    mistakesBtn.addEventListener("click", () => this.startSession("mistakes"));

const mapBtn = island.createEl("button", {
      cls: `mgt-island-btn mgt-icon-btn ${
        this.mode === "topic" || this.isMapOpen ? "is-active" : ""
      }`,
      attr: { "aria-label": "Topics Map" }
    });
    mapBtn.type = "button";
    setIcon(mapBtn, "layout-grid");
    mapBtn.addEventListener("click", () => this.toggleMap());

    const rulesBtn = island.createEl("button", {
      cls: `mgt-island-btn mgt-icon-btn ${this.isRulesOpen ? "is-active" : ""}`,
      attr: { "aria-label": "Grammar Rules" }
    });
    rulesBtn.type = "button";
    setIcon(rulesBtn, "book-open");
    rulesBtn.addEventListener("click", () => this.toggleRules());

    this.stageEl = this.rootEl.createDiv({ cls: "mgt-stage" });
    this.mapHostEl = this.rootEl.createDiv({ cls: "mgt-map-host" });
    this.renderCurrentStep();
    this.syncOverlays();
  }

  private toggleMap(force?: boolean): void {
    this.isMapOpen = force ?? !this.isMapOpen;
    if (this.isMapOpen) this.isRulesOpen = false;
    this.syncOverlays();
  }

  private toggleRules(force?: boolean, topicId?: string): void {
    this.isRulesOpen = force ?? !this.isRulesOpen;
    if (this.isRulesOpen) {
      this.isMapOpen = false;
      this.activeRuleTopicId = topicId;
    }
    this.syncOverlays();
  }

  private syncOverlays(): void {
    if (!this.mapHostEl) return;

    const { pack } = getActivePack(this.plugin.data);

    if (this.isMapOpen) {
      renderTopicsMap(
        this.mapHostEl,
        pack,
        this.plugin.data.progress,
        this.selectedTopicId,
        {
          onSelectTopic: (topicId) => this.startSession("topic", topicId),
          onClose: () => this.toggleMap(false)
        }
      );
      return;
    }

    if (this.isRulesOpen) {
      const rulesPack = getActiveRules(this.plugin.data);
      renderRulesOverlay(
        this.mapHostEl,
        pack,
        rulesPack,
        this.activeRuleTopicId,
        {
          onClose: () => this.toggleRules(false),
          onPracticeTopic: (topicId) => this.startSession("topic", topicId)
        }
      );
      return;
    }

    this.mapHostEl.empty();
  }

  private renderCurrentStep(): void {
    if (!this.stageEl) return;
    this.stageEl.empty();

    const { pack } = getActivePack(this.plugin.data);

    if (this.queue.length === 0) {
      const emptyCard = this.stageEl.createDiv({ cls: "mgt-card mgt-empty-state" });
      emptyCard.createDiv({
        cls: "mgt-empty-title",
        text: this.mode === "mistakes" ? "No mistakes to review" : "No exercises available"
      });
      emptyCard.createDiv({
        cls: "mgt-empty-sub",
        text:
          this.mode === "mistakes"
            ? "All previously missed exercises have been cleared."
            : "Check your grammar pack in settings."
      });
      if (this.mode === "mistakes") {
        const backBtn = emptyCard.createEl("button", {
          cls: "mgt-primary-btn mgt-summary-btn",
          text: "Start Smart Session"
        });
        backBtn.type = "button";
        backBtn.addEventListener("click", () => this.startSession("smart"));
      }
      return;
    }

    if (this.currentIndex >= this.queue.length) {
      this.renderSummary();
      return;
    }

    // Minimalist progress hairline
    const progressWrap = this.stageEl.createDiv({ cls: "mgt-progress-track" });
    const progressFill = progressWrap.createDiv({ cls: "mgt-progress-fill" });
    const pct = Math.round((this.currentIndex / this.queue.length) * 100);
    progressFill.style.width = `${pct}%`;

    const exercise = this.queue[this.currentIndex];
    const topic: GrammarTopic | undefined = pack.topics.find(
      (t) => t.id === exercise.topicId
    );

    const cardHost = this.stageEl.createDiv({ cls: "mgt-card-host" });
    this.currentAnswered = false;

    renderExerciseCard(cardHost, exercise, topic, {
      onAnswered: (isCorrect) => {
        this.currentAnswered = true;
        if (isCorrect) this.sessionCorrect++;
        void this.plugin.recordExerciseResult(exercise, isCorrect);
      },
onNext: () => {
        this.currentIndex++;
        this.renderCurrentStep();
      },
      onOpenRule: (topicId) => this.toggleRules(true, topicId)
    });
  }

  private renderSummary(): void {
    if (!this.stageEl) return;
    const { pack } = getActivePack(this.plugin.data);
    const accuracy = Math.round((this.sessionCorrect / this.queue.length) * 100);
    const overall = getOverallMastery(pack, this.plugin.data.progress);
    const mistakesLeft = getMistakeCount(pack, this.plugin.data.progress);

    const card = this.stageEl.createDiv({ cls: "mgt-card mgt-empty-state" });
    card.createDiv({
      cls: "mgt-summary-score",
      text: `${this.sessionCorrect} / ${this.queue.length}`
    });
    card.createDiv({
      cls: "mgt-empty-sub",
      text: `Session accuracy ${accuracy}% · Overall mastery ${overall}%`
    });

    const actions = card.createDiv({ cls: "mgt-summary-actions" });
    const againBtn = actions.createEl("button", {
      cls: "mgt-primary-btn",
      text: "New Smart Session"
    });
    againBtn.type = "button";
    againBtn.addEventListener("click", () => this.startSession("smart"));

    if (mistakesLeft > 0) {
      const reviewBtn = actions.createEl("button", {
        cls: "mgt-secondary-btn",
        text: `Review Mistakes (${mistakesLeft})`
      });
      reviewBtn.type = "button";
      reviewBtn.addEventListener("click", () => this.startSession("mistakes"));
    }
  }
}