import { RulesPack } from "./types";

export const STARTER_RULES: RulesPack = {
  version: "1.0.0",
  rules: [
    {
      topicId: "tenses-pp-vs-past",
      formula: "Present Perfect: have/has + V3  |  Past Simple: V2 / did + V1",
      points: [
        "Present Perfect — когда важен результат сейчас, а точное время в прошлом не названо (already, yet, just, ever, since, for).",
        "Past Simple — когда действие полностью завершилось в указанный прошлый момент (yesterday, in 2022, three years ago)."
      ],
      examples: [
        { en: "I have lost my keys.", note: "Ключей нет прямо сейчас (результат)." },
        { en: "I lost my keys yesterday.", note: "Указано точное время в прошлом (yesterday)." }
      ],
      pitfall: "Нельзя использовать Present Perfect с закрытыми маркерами времени: last week, ago, in 2020."
    },
    {
      topicId: "cond-third-mixed",
      formula: "Third: If + had V3, would have V3  |  Mixed: If + had V3, would V1 (now)",
      points: [
        "Third Conditional описывает нереальное прошлое, которое уже нельзя изменить.",
        "Mixed Conditional связывает нереальное действие в прошлом с его результатом в настоящем (часто есть маркеры now, today, by now)."
      ],
      examples: [
        { en: "If I had known, I would have left earlier.", note: "Оба события в прошлом (Third)." },
        { en: "If he had taken the earlier train, he would be here by now.", note: "Прошлое условие → результат сейчас (Mixed)." }
      ],
      pitfall: "В части с if никогда не ставится would — только Past Perfect (had + V3)."
    },
    {
      topicId: "syntax-inversion-cleft",
      formula: "Negative Adverb + Aux + Subject + Verb",
      points: [
        "При выносе отрицательных или ограничительных наречий в начало предложения (Never, Seldom, Rarely, Hardly, Not only, Little) порядок слов становится вопросительным.",
        "В Present/Past Simple без другого вспомогательного глагола выносится do / does / did."
      ],
      examples: [
        { en: "Never have I seen such a clean UI.", note: "have выносится перед I." },
        { en: "Not only did he fix the bug, but he also wrote tests.", note: "did перед he + начальная форма fix." }
      ],
      pitfall: "После «Only after / Only when / Not until» инверсия происходит не в первой части, а в главном предложении."
    }
  ]
};