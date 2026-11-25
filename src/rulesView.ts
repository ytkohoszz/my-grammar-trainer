import { setIcon } from "obsidian";
import { GrammarPack, GrammarRule, GrammarTopic, RulesPack } from "./types";

export interface RulesOverlayCallbacks {
  onClose: () => void;
  onPracticeTopic: (topicId: string) => void;
}

export function renderRulesOverlay(
  host: HTMLElement,
  grammarPack: GrammarPack,
  rulesPack: RulesPack,
  initialTopicId: string | undefined,
  callbacks: RulesOverlayCallbacks
): void {
  host.empty();

  const panel = host.createDiv({ cls: "mgt-map-panel mgt-rules-panel" });

  const rulesByTopic = new Map<string, GrammarRule>();
  for (const r of rulesPack.rules) {
    rulesByTopic.set(r.topicId, r);
  }

  let selectedTopicId: string | undefined = initialTopicId;
  let searchQuery = "";
  let levelFilter = "ALL";

  const renderContent = () => {
    panel.empty();

    if (selectedTopicId) {
      const topic = grammarPack.topics.find((t) => t.id === selectedTopicId);
      if (topic) {
        renderRuleDetail(
          panel,
          topic,
          rulesByTopic.get(topic.id),
          () => {
            selectedTopicId = undefined;
            renderContent();
          },
          () => callbacks.onPracticeTopic(topic.id)
        );
        return;
      }
    }

    const header = panel.createDiv({ cls: "mgt-rules-header" });
    const searchInput = header.createEl("input", {
      cls: "mgt-rules-search",
      type: "text",
      attr: { placeholder: "Поиск по правилам грамматики..." }
    });
    searchInput.value = searchQuery;

    const filterRow = header.createDiv({ cls: "mgt-rules-levels" });
    const levels = [
      "ALL",
      ...Array.from(new Set(grammarPack.topics.map((t) => t.level))).sort()
    ];

    const body = panel.createDiv({ cls: "mgt-map-body" });

    const renderList = () => {
      body.empty();
      const q = searchQuery.trim().toLowerCase();
      const filtered = grammarPack.topics.filter((t) => {
        if (levelFilter !== "ALL" && t.level !== levelFilter) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q)
        );
      });

      if (filtered.length === 0) {
        body.createDiv({
          cls: "mgt-map-empty",
          text: "По вашему запросу правил не найдено"
        });
        return;
      }

      const grouped = new Map<string, GrammarTopic[]>();
      for (const t of filtered) {
        const list = grouped.get(t.category) ?? [];
        list.push(t);
        grouped.set(t.category, list);
      }

      for (const [category, topics] of grouped.entries()) {
        const sec = body.createDiv({ cls: "mgt-map-section" });
        sec.createDiv({ cls: "mgt-map-category", text: category });
        const listEl = sec.createDiv({ cls: "mgt-rules-list" });

        for (const topic of topics) {
          const hasGuide = rulesByTopic.has(topic.id);
          const item = listEl.createEl("button", { cls: "mgt-rule-row" });
          item.type = "button";

          const left = item.createDiv({ cls: "mgt-rule-row-left" });
          left.createSpan({ cls: "mgt-level-pill", text: topic.level });
          left.createSpan({ cls: "mgt-rule-row-title", text: topic.title });

          const right = item.createSpan({
            cls: `mgt-rule-chevron ${hasGuide ? "has-guide" : ""}`
          });
          right.createSpan({ text: hasGuide ? "Разбор" : "Кратко" });
          const iconSpan = right.createSpan({ cls: "mgt-inline-icon" });
          setIcon(iconSpan, "chevron-right");

          item.addEventListener("click", () => {
            selectedTopicId = topic.id;
            renderContent();
          });
        }
      }
    };

    levels.forEach((lvl) => {
      const btn = filterRow.createEl("button", {
        cls: `mgt-filter-pill ${lvl === levelFilter ? "is-active" : ""}`,
        text: lvl === "ALL" ? "Все" : lvl
      });
      btn.type = "button";
      btn.addEventListener("click", () => {
        levelFilter = lvl;
        filterRow
          .querySelectorAll(".mgt-filter-pill")
          .forEach((el) => el.removeClass("is-active"));
        btn.addClass("is-active");
        renderList();
      });
    });

    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      renderList();
    });

    renderList();
  };

  renderContent();
}

function renderRuleDetail(
  panel: HTMLElement,
  topic: GrammarTopic,
  rule: GrammarRule | undefined,
  onBack: () => void,
  onPractice: () => void
): void {
  const nav = panel.createDiv({ cls: "mgt-rule-nav" });
  const backBtn = nav.createEl("button", {
    cls: "mgt-secondary-btn mgt-rule-back"
  });
  backBtn.type = "button";
  const backIcon = backBtn.createSpan({ cls: "mgt-inline-icon" });
  setIcon(backIcon, "arrow-left");
  backBtn.createSpan({ text: "Все правила" });
  backBtn.addEventListener("click", onBack);

  const practiceBtn = nav.createEl("button", {
    cls: "mgt-primary-btn mgt-rule-practice",
    text: "Тренировать тему"
  });
  practiceBtn.type = "button";
  practiceBtn.addEventListener("click", onPractice);

  const body = panel.createDiv({ cls: "mgt-map-body mgt-rule-detail" });

  const titleWrap = body.createDiv({ cls: "mgt-rule-title-wrap" });
  titleWrap.createSpan({ cls: "mgt-level-pill", text: topic.level });
  titleWrap.createSpan({ cls: "mgt-rule-cat", text: topic.category });
  body.createDiv({ cls: "mgt-rule-heading", text: topic.title });

  if (topic.summary) {
    body.createDiv({ cls: "mgt-rule-summary", text: topic.summary });
  }

  if (!rule) {
    return;
  }

  if (rule.formula) {
    const formulaBox = body.createDiv({ cls: "mgt-rule-formula" });
    formulaBox.createDiv({ cls: "mgt-rule-block-label", text: "Формула" });
    formulaBox.createDiv({ cls: "mgt-rule-formula-text", text: rule.formula });
  }

  if (rule.points.length > 0) {
    const sec = body.createDiv({ cls: "mgt-rule-section" });
    sec.createDiv({ cls: "mgt-rule-block-label", text: "Основные правила" });
    const ul = sec.createEl("ul", { cls: "mgt-rule-points" });
    for (const pt of rule.points) {
      ul.createEl("li", { text: pt });
    }
  }

  if (rule.examples.length > 0) {
    const sec = body.createDiv({ cls: "mgt-rule-section" });
    sec.createDiv({ cls: "mgt-rule-block-label", text: "Примеры" });
    const list = sec.createDiv({ cls: "mgt-rule-examples" });
    for (const ex of rule.examples) {
      const row = list.createDiv({ cls: "mgt-rule-example-card" });
      row.createDiv({ cls: "mgt-rule-example-en", text: ex.en });
      if (ex.note) {
        row.createDiv({ cls: "mgt-rule-example-note", text: ex.note });
      }
    }
  }

  if (rule.pitfall) {
    const pit = body.createDiv({ cls: "mgt-rule-pitfall" });
    pit.createDiv({ cls: "mgt-rule-block-label", text: "Обратите внимание" });
    pit.createDiv({ cls: "mgt-rule-pitfall-text", text: rule.pitfall });
  }
}