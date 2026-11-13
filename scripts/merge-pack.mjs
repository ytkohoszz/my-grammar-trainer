import { readFileSync, writeFileSync } from "fs";

const packPath = "packs/grammar-pack.json";
const batchPath = "packs/batch.json";

const pack = JSON.parse(readFileSync(packPath, "utf8"));
const batch = JSON.parse(readFileSync(batchPath, "utf8"));

const existingTopicIds = new Set(pack.topics.map((t) => t.id));
let addedTopics = 0;
if (Array.isArray(batch.topics)) {
  for (const t of batch.topics) {
    if (!existingTopicIds.has(t.id)) {
      pack.topics.push(t);
      existingTopicIds.add(t.id);
      addedTopics++;
    }
  }
}

const existingExIds = new Set(pack.exercises.map((e) => e.id));
let addedExercises = 0;
const exercisesToAdd = Array.isArray(batch) ? batch : batch.exercises || [];
for (const ex of exercisesToAdd) {
  if (!existingExIds.has(ex.id) && existingTopicIds.has(ex.topicId)) {
    pack.exercises.push(ex);
    existingExIds.add(ex.id);
    addedExercises++;
  }
}

pack.updatedAt = new Date().toISOString().slice(0, 10);
writeFileSync(packPath, JSON.stringify(pack, null, 2) + "\n", "utf8");
console.log(`Added ${addedTopics} topics, ${addedExercises} exercises. Total: ${pack.topics.length} topics, ${pack.exercises.length} exercises.`);