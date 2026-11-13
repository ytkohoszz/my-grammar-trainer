import { GrammarPack } from "./types";

export const STARTER_PACK: GrammarPack = {
  version: "1.0.0",
  updatedAt: "2026-11-13",
  topics: [
    {
      id: "tenses-pp-vs-past",
      category: "Tenses",
      title: "Present Perfect vs Past Simple",
      level: "B1",
      summary: "Выбор между завершённым временем с результатом в настоящем и конкретным моментом в прошлом."
    },
    {
      id: "conditionals-mixed",
      category: "Conditionals",
      title: "Third & Mixed Conditionals",
      level: "B2",
      summary: "Нереальные условия в прошлом и их влияние на настоящее."
    },
    {
      id: "articles-general-vs-specific",
      category: "Articles",
      title: "Zero Article vs The",
      level: "B1",
      summary: "Нулевой артикль для обобщений и определённый артикль для конкретных объектов."
    },
    {
      id: "inversion-negative",
      category: "Syntax",
      title: "Negative Inversion",
      level: "C1",
      summary: "Обратный порядок слов после отрицательных наречий в начале предложения (Never, Seldom, Not only)."
    }
  ],
  exercises: [
    {
      id: "ex-pp-1",
      topicId: "tenses-pp-vs-past",
      type: "cloze",
      prompt: "I ___ my keys, so I can't get into the apartment right now.",
      options: ["lost", "have lost", "had lost", "was losing"],
      answer: "have lost",
      explanation: "Результат действия важен прямо сейчас (не могу попасть домой), конкретное время в прошлом не указано — нужен Present Perfect."
    },
    {
      id: "ex-pp-2",
      topicId: "tenses-pp-vs-past",
      type: "error",
      prompt: "She has visited London three years ago.",
      errorWordIndex: 1,
      options: ["visited", "was visiting", "had visited"],
      answer: "visited",
      explanation: "Маркер «three years ago» указывает на завершённый период в прошлом, поэтому используется Past Simple (visited), а не Present Perfect."
    },
    {
      id: "ex-cond-1",
      topicId: "conditionals-mixed",
      type: "cloze",
      prompt: "If he had taken the earlier train, he ___ here by now.",
      options: ["would be", "would have been", "will be", "was"],
      answer: "would be",
      explanation: "Mixed Conditional: нереальное условие в прошлом (had taken) влияет на результат в настоящем (by now → would be)."
    },
    {
      id: "ex-cond-2",
      topicId: "conditionals-mixed",
      type: "input",
      prompt: "If I ___ (know) about the traffic, I would have left earlier.",
      hint: "know",
      answer: "had known",
      acceptedAnswers: ["'d known"],
      explanation: "Third Conditional описывает нереальное прошлое: в части if используется Past Perfect (had known)."
    },
    {
      id: "ex-art-1",
      topicId: "articles-general-vs-specific",
      type: "cloze",
      prompt: "___ information you sent me yesterday was extremely useful.",
      options: ["The", "An", "A", "—"],
      answer: "The",
      explanation: "Речь о конкретной информации («you sent me yesterday»), поэтому нужен определённый артикль the, несмотря на неисчисляемость."
    },
    {
      id: "ex-art-2",
      topicId: "articles-general-vs-specific",
      type: "input",
      prompt: "___ patience is essential when learning a new skill.",
      hint: "article or -",
      answer: "-",
      acceptedAnswers: ["—", "none", ""],
      explanation: "Абстрактные неисчисляемые существительные в общем смысле употребляются без артикля."
    },
    {
      id: "ex-inv-1",
      topicId: "inversion-negative",
      type: "transform",
      prompt: "I have never seen such a clean implementation.",
      hint: "Start with: Never...",
      tokens: ["Never", "have", "I", "seen", "such", "a", "clean", "implementation."],
      answer: "Never have I seen such a clean implementation.",
      explanation: "При выносе отрицательного наречия Never в начало предложения вспомогательный глагол (have) ставится перед подлежащим (I)."
    },
    {
      id: "ex-inv-2",
      topicId: "inversion-negative",
      type: "error",
      prompt: "Not only he finished the task, but he also wrote tests.",
      errorWordIndex: 2,
      options: ["did he finish", "he did finish", "finished he"],
      answer: "did he finish",
      explanation: "После «Not only» в начале предложения требуется инверсия: вспомогательный глагол did + подлежащее + начальная форма глагола."
    }
  ]
};