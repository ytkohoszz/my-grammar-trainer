import { checkExerciseAnswer } from "./engine";
import { GrammarExercise, GrammarTopic } from "./types";

export interface ExerciseCardCallbacks {
  onAnswered: (isCorrect: boolean) => void;
  onNext: () => void;
}

function shuffleTokens(tokens: string[]): string[] {
  const arr = [...tokens];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function renderExerciseCard(
  container: HTMLElement,
  exercise: GrammarExercise,
  topic: GrammarTopic | undefined,
  callbacks: ExerciseCardCallbacks
): void {
  container.empty();
  const card = container.createDiv({ cls: "mgt-card mgt-exercise-card" });

// Subtle topic header
  const meta = card.createDiv({ cls: "mgt-meta-line" });
  if (topic) {
    meta.createSpan({ cls: "mgt-level-pill", text: topic.level });
    meta.createSpan({ cls: "mgt-topic-label", text: topic.title });
  } else {
    meta.setText(exercise.topicId);
  }

  let answered = false;
  const feedbackSlot = card.createDiv({ cls: "mgt-feedback-slot" });

  const finalize = (isCorrect: boolean, userAnswerDisplay?: string) => {
    if (answered) return;
    answered = true;
    callbacks.onAnswered(isCorrect);
    renderFeedback(
      feedbackSlot,
      exercise,
      isCorrect,
      userAnswerDisplay,
      callbacks.onNext
    );
  };

  if (exercise.type === "cloze") {
    renderCloze(card, feedbackSlot, exercise, () => answered, finalize);
  } else if (exercise.type === "error") {
    renderErrorSpotting(card, feedbackSlot, exercise, () => answered, finalize);
  } else if (exercise.type === "transform") {
    renderTransform(card, feedbackSlot, exercise, () => answered, finalize);
  } else {
    renderInput(card, feedbackSlot, exercise, () => answered, finalize);
  }
}

function renderCloze(
  card: HTMLElement,
  beforeEl: HTMLElement,
  exercise: GrammarExercise,
  isAnswered: () => boolean,
  finalize: (isCorrect: boolean, userAnswer?: string) => void
): void {
  const promptEl = card.createDiv({ cls: "mgt-prompt" });
  const parts = exercise.prompt.split("___");
  const blankSpan = document.createElement("span");
  blankSpan.className = "mgt-blank";
  blankSpan.textContent = "_____";

  if (parts.length > 1) {
    promptEl.appendText(parts[0]);
    promptEl.appendChild(blankSpan);
    promptEl.appendText(parts.slice(1).join("___"));
  } else {
    promptEl.setText(exercise.prompt);
  }

  card.insertBefore(promptEl, beforeEl);

  const options = exercise.options ?? [];
  const grid = card.createDiv({ cls: "mgt-options-grid" });
  card.insertBefore(grid, beforeEl);

  options.forEach((opt, idx) => {
    const btn = grid.createEl("button", {
      cls: "mgt-option-btn",
      attr: { "data-shortcut": String(idx + 1) }
    });
    btn.type = "button";

    const keyHint = btn.createSpan({
      cls: "mgt-key-hint",
      text: String(idx + 1)
    });
    keyHint.setAttr("aria-hidden", "true");
    btn.createSpan({ text: opt });

    btn.addEventListener("click", () => {
      if (isAnswered()) return;
      const isCorrect = checkExerciseAnswer(exercise, opt);
      blankSpan.textContent = opt;
      blankSpan.addClass(isCorrect ? "is-correct" : "is-wrong");

      btn.addClass(isCorrect ? "is-correct" : "is-wrong");
      if (!isCorrect) {
        const buttons = grid.querySelectorAll<HTMLButtonElement>(".mgt-option-btn");
        buttons.forEach((b, bIdx) => {
          if (checkExerciseAnswer(exercise, options[bIdx])) {
            b.addClass("is-correct");
          }
        });
      }
      finalize(isCorrect, opt);
    });
  });
}

function renderErrorSpotting(
  card: HTMLElement,
  beforeEl: HTMLElement,
  exercise: GrammarExercise,
  isAnswered: () => boolean,
  finalize: (isCorrect: boolean, userAnswer?: string) => void
): void {
  const hintEl = card.createDiv({
    cls: "mgt-hint-line",
    text: "Tap the word with a grammar error"
  });
  card.insertBefore(hintEl, beforeEl);

  const sentenceEl = card.createDiv({ cls: "mgt-prompt mgt-word-line" });
  card.insertBefore(sentenceEl, beforeEl);

  const optionsWrap = card.createDiv({ cls: "mgt-options-grid is-hidden" });
  card.insertBefore(optionsWrap, beforeEl);

  const words = exercise.prompt.split(/\s+/);
  const targetIdx = exercise.errorWordIndex;
  let errorLocated = targetIdx === undefined;

  if (errorLocated) {
    optionsWrap.removeClass("is-hidden");
    hintEl.setText("Choose the correct replacement");
  }

  words.forEach((word, idx) => {
    const wordBtn = sentenceEl.createEl("button", {
      cls: "mgt-word-btn",
      text: word
    });
    wordBtn.type = "button";

    wordBtn.addEventListener("click", () => {
      if (isAnswered() || errorLocated) return;
      if (idx === targetIdx) {
        errorLocated = true;
        wordBtn.addClass("is-located");
        hintEl.setText("Choose the correct replacement");
        optionsWrap.removeClass("is-hidden");
      } else {
        wordBtn.addClass("is-miss");
        window.setTimeout(() => wordBtn.removeClass("is-miss"), 350);
      }
    });
  });

  const options = exercise.options ?? [];
  options.forEach((opt, idx) => {
    const btn = optionsWrap.createEl("button", {
      cls: "mgt-option-btn",
      attr: { "data-shortcut": String(idx + 1) }
    });
    btn.type = "button";
    btn.createSpan({ cls: "mgt-key-hint", text: String(idx + 1) });
    btn.createSpan({ text: opt });

    btn.addEventListener("click", () => {
      if (isAnswered() || !errorLocated) return;
      const isCorrect = checkExerciseAnswer(exercise, opt);
      btn.addClass(isCorrect ? "is-correct" : "is-wrong");
      if (!isCorrect) {
        const buttons = optionsWrap.querySelectorAll<HTMLButtonElement>(".mgt-option-btn");
        buttons.forEach((b, bIdx) => {
          if (checkExerciseAnswer(exercise, options[bIdx])) {
            b.addClass("is-correct");
          }
        });
      }
      finalize(isCorrect, opt);
    });
  });
}

function renderTransform(
  card: HTMLElement,
  beforeEl: HTMLElement,
  exercise: GrammarExercise,
  isAnswered: () => boolean,
  finalize: (isCorrect: boolean, userAnswer?: string) => void
): void {
  const promptEl = card.createDiv({
    cls: "mgt-prompt",
    text: exercise.prompt
  });
  card.insertBefore(promptEl, beforeEl);

  if (exercise.hint) {
    const hintEl = card.createDiv({ cls: "mgt-hint-line", text: exercise.hint });
    card.insertBefore(hintEl, beforeEl);
  }

  const tray = card.createDiv({ cls: "mgt-token-tray" });
  card.insertBefore(tray, beforeEl);

  const bank = card.createDiv({ cls: "mgt-token-bank" });
  card.insertBefore(bank, beforeEl);

  const actions = card.createDiv({ cls: "mgt-actions-row" });
  card.insertBefore(actions, beforeEl);

  const clearBtn = actions.createEl("button", {
    cls: "mgt-secondary-btn",
    text: "Clear"
  });
  clearBtn.type = "button";

  const checkBtn = actions.createEl("button", {
    cls: "mgt-primary-btn",
    text: "Check"
  });
  checkBtn.type = "button";
  checkBtn.disabled = true;

  const sourceTokens = exercise.tokens ?? exercise.answer.split(/\s+/);
  const shuffled = shuffleTokens(sourceTokens);
  const selectedIndices: number[] = [];

  const syncTokens = () => {
    tray.empty();
    bank.empty();

    if (selectedIndices.length === 0) {
      tray.createSpan({
        cls: "mgt-tray-placeholder",
        text: "Tap words below to build the sentence"
      });
    } else {
      selectedIndices.forEach((tokenIdx, pos) => {
        const chip = tray.createEl("button", {
          cls: "mgt-token-chip is-placed",
          text: shuffled[tokenIdx]
        });
        chip.type = "button";
        chip.addEventListener("click", () => {
          if (isAnswered()) return;
          selectedIndices.splice(pos, 1);
          syncTokens();
        });
      });
    }

    const usedSet = new Set(selectedIndices);
    shuffled.forEach((word, idx) => {
      const chip = bank.createEl("button", {
        cls: "mgt-token-chip",
        text: word
      });
      chip.type = "button";
      if (usedSet.has(idx)) {
        chip.addClass("is-used");
        chip.disabled = true;
      } else {
        chip.addEventListener("click", () => {
          if (isAnswered()) return;
          selectedIndices.push(idx);
          syncTokens();
        });
      }
    });

    checkBtn.disabled = selectedIndices.length === 0;
  };

  syncTokens();

  clearBtn.addEventListener("click", () => {
    if (isAnswered()) return;
    selectedIndices.length = 0;
    syncTokens();
  });

  checkBtn.addEventListener("click", () => {
    if (isAnswered() || selectedIndices.length === 0) return;
    const assembled = selectedIndices.map((i) => shuffled[i]).join(" ");
    const isCorrect = checkExerciseAnswer(exercise, assembled);
    tray.addClass(isCorrect ? "is-correct" : "is-wrong");
    actions.addClass("is-hidden");
    finalize(isCorrect, assembled);
  });
}

function renderInput(
  card: HTMLElement,
  beforeEl: HTMLElement,
  exercise: GrammarExercise,
  isAnswered: () => boolean,
  finalize: (isCorrect: boolean, userAnswer?: string) => void
): void {
  const promptEl = card.createDiv({
    cls: "mgt-prompt",
    text: exercise.prompt
  });
  card.insertBefore(promptEl, beforeEl);

  if (exercise.hint) {
    const hintEl = card.createDiv({
      cls: "mgt-hint-line",
      text: `Hint: ${exercise.hint}`
    });
    card.insertBefore(hintEl, beforeEl);
  }

  const formRow = card.createDiv({ cls: "mgt-input-row" });
  card.insertBefore(formRow, beforeEl);

  const input = formRow.createEl("input", {
    cls: "mgt-input-field",
    type: "text",
    attr: {
      placeholder: "Type your answer...",
      autocomplete: "off",
      autocapitalize: "off",
      spellcheck: "false"
    }
  });

  const submitBtn = formRow.createEl("button", {
    cls: "mgt-primary-btn",
    text: "Check"
  });
  submitBtn.type = "button";

  const submit = () => {
    if (isAnswered()) return;
    const val = input.value;
    const isCorrect = checkExerciseAnswer(exercise, val);
    input.disabled = true;
    input.addClass(isCorrect ? "is-correct" : "is-wrong");
    submitBtn.addClass("is-hidden");
    finalize(isCorrect, val.trim() || "—");
  };

  submitBtn.addEventListener("click", submit);
  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      submit();
    }
  });

  window.requestAnimationFrame(() => input.focus());
}

function renderFeedback(
  slot: HTMLElement,
  exercise: GrammarExercise,
  isCorrect: boolean,
  userAnswer: string | undefined,
  onNext: () => void
): void {
  slot.empty();
  const box = slot.createDiv({
    cls: `mgt-feedback ${isCorrect ? "is-correct" : "is-wrong"}`
  });

  const head = box.createDiv({ cls: "mgt-feedback-head" });
  head.createSpan({
    cls: "mgt-feedback-status",
    text: isCorrect ? "Correct" : "Incorrect"
  });

  if (!isCorrect) {
    head.createSpan({
      cls: "mgt-feedback-answer",
      text: `Answer: ${exercise.answer}`
    });
  } else if (userAnswer && exercise.type === "transform") {
    head.createSpan({
      cls: "mgt-feedback-answer",
      text: exercise.answer
    });
  }

  box.createDiv({
    cls: "mgt-feedback-explanation",
    text: exercise.explanation
  });

  const nextRow = box.createDiv({ cls: "mgt-feedback-actions" });
  const nextBtn = nextRow.createEl("button", {
    cls: "mgt-primary-btn mgt-next-btn",
    text: "Continue"
  });
  nextBtn.type = "button";
  nextBtn.addEventListener("click", onNext);
}