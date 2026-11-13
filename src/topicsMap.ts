import { computeEffectiveMastery } from "./engine";
import { CefrLevel, GrammarPack, GrammarProgress, GrammarTopic } from "./types";

export interface TopicsMapCallbacks {
  onSelectTopic: (topicId: string) => void;
  onClose: () => void;
}

type MapFilter = "all" | "weak" | CefrLevel;

export function renderTopicsMap(
  host: HTMLElement,
  pack: GrammarPack,
  progress: GrammarProgress,
  activeTopicId: string | undefined,
  callbacks: TopicsMapCallbacks
): void {
host.empty();

  const panel = host.createDiv({ cls: "mgt-map-panel" });

  // Filter bar
  const filterBar = panel.createDiv({ cls: "mgt-map-filters" });
  const levelsPresent = Array.from(
    new Set(pack.topics.map((t) => t.level))
  ).sort();

  const filters: Array<{ id: MapFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "weak", label: "Weak" },
    ...levelsPresent.map((lvl) => ({ id: lvl, label: lvl }))
  ];

  let currentFilter: MapFilter = "all";
  const body = panel.createDiv({ cls: "mgt-map-body" });

  const renderBody = () => {
    body.empty();

    const filtered = pack.topics.filter((topic) => {
      const stats = progress.topics[topic.id];
      const mastery = computeEffectiveMastery(stats);
      if (currentFilter === "weak") {
        return !stats || stats.attempts === 0 || mastery < 60;
      }
      if (currentFilter !== "all") {
        return topic.level === currentFilter;
      }
      return true;
    });

    if (filtered.length === 0) {
      body.createDiv({
        cls: "mgt-map-empty",
        text: "No topics match this filter"
      });
      return;
    }

    const grouped = new Map<string, GrammarTopic[]>();
    for (const topic of filtered) {
      const list = grouped.get(topic.category) ?? [];
      list.push(topic);
      grouped.set(topic.category, list);
    }

    for (const [category, topics] of grouped.entries()) {
      const section = body.createDiv({ cls: "mgt-map-section" });
      section.createDiv({ cls: "mgt-map-category", text: category });

      const grid = section.createDiv({ cls: "mgt-map-grid" });
      for (const topic of topics) {
        const stats = progress.topics[topic.id];
        const mastery = computeEffectiveMastery(stats);
        const attempts = stats?.attempts ?? 0;
        const exCount = pack.exercises.filter((e) => e.topicId === topic.id).length;

        const stateCls =
          attempts === 0
            ? "is-unstarted"
            : mastery >= 85
              ? "is-mastered"
              : mastery >= 55
                ? "is-progress"
                : "is-weak";

        const card = grid.createEl("button", {
          cls: `mgt-topic-card ${stateCls} ${
            activeTopicId === topic.id ? "is-selected" : ""
          }`
        });
        card.type = "button";

        const topRow = card.createDiv({ cls: "mgt-topic-top" });
        topRow.createSpan({ cls: "mgt-topic-level", text: topic.level });
        topRow.createSpan({
          cls: "mgt-topic-pct",
          text: attempts === 0 ? `${exCount} ex` : `${mastery}%`
        });

        card.createDiv({ cls: "mgt-topic-title", text: topic.title });

        const bar = card.createDiv({ cls: "mgt-topic-bar" });
        const fill = bar.createDiv({ cls: "mgt-topic-bar-fill" });
        fill.style.width = `${attempts === 0 ? 0 : mastery}%`;

        card.addEventListener("click", () => {
          callbacks.onSelectTopic(topic.id);
        });
      }
    }
  };

  filters.forEach((f) => {
    const btn = filterBar.createEl("button", {
      cls: `mgt-filter-pill ${f.id === currentFilter ? "is-active" : ""}`,
      text: f.label
    });
    btn.type = "button";
    btn.addEventListener("click", () => {
      currentFilter = f.id;
      filterBar
        .querySelectorAll(".mgt-filter-pill")
        .forEach((el) => el.removeClass("is-active"));
      btn.addClass("is-active");
      renderBody();
    });
  });

  renderBody();
}