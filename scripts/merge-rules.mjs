import { readFileSync, writeFileSync } from "fs";

const rulesPath = "packs/rules-pack.json";
const batchPath = "packs/rules-batch.json";

const pack = JSON.parse(readFileSync(rulesPath, "utf8"));
const batch = JSON.parse(readFileSync(batchPath, "utf8"));

const existing = new Set(pack.rules.map((r) => r.topicId));
let added = 0;

for (const rule of batch) {
  if (!existing.has(rule.topicId)) {
    pack.rules.push(rule);
    existing.add(rule.topicId);
    added++;
  }
}

writeFileSync(rulesPath, JSON.stringify(pack, null, 2) + "\n", "utf8");
console.log(`Added ${added} rules. Total: ${pack.rules.length} rules.`);