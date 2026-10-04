import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createLegacyAssetInventory } from "./lib/legacy-template-asset-inventory";

const edits = [
  {
    file: "src/app/(root)/time-table/0c10c964-b83c-4309-a81b-76550aba17b0/_img/imgs.ts",
    removed: [
      'import BoardImg from "./main/board.png";\n',
      'import WeekDatesImg from "./main/week_dates.png";\n',
      'import WeeklyMemo from "./main/weekly_memo.png";\n',
    ],
  },
  {
    file: "src/app/(root)/time-table/28c2b9fb-9d7e-4aaa-822d-96909d384032/_components/TimeTableGrid.tsx",
    removed: [
      'import TimeTableWeeklyMemo from "./TimeTableWeeklyMemo";\n',
      "      <TimeTableWeeklyMemo />\n",
    ],
  },
  {
    file: "src/app/(root)/time-table/8f9bb89d-34f5-45c1-b923-16366197af33/_components/_uneditable/TimeTableContent.tsx",
    removed: [
      "import TimeTableWeeklyMemo from '../TimeTableWeeklyMemo';\n",
      "      <TimeTableWeeklyMemo />\n",
    ],
  },
];
for (const edit of edits) {
  let expected = execFileSync("git", ["show", `eb16710d:${edit.file}`], {
    encoding: "utf8",
  });
  for (const removed of edit.removed) {
    assert.ok(expected.includes(removed), edit.file);
    expected = expected.replace(removed, "");
  }
  assert.equal(readFileSync(edit.file, "utf8"), expected, edit.file);
}
for (const [id, count] of [
  ["0c10c964-b83c-4309-a81b-76550aba17b0", 7],
  ["28c2b9fb-9d7e-4aaa-822d-96909d384032", 16],
  ["8f9bb89d-34f5-45c1-b923-16366197af33", 17],
] as const) {
  const template = createLegacyAssetInventory(process.cwd(), {
    ownerKind: "timetable",
    templateId: id,
  }).templates[0];
  assert.ok(template);
  assert.equal(template.assets.length, count);
  assert.ok(template.assets.every((asset) => asset.exists && !asset.readError));
}
console.log(
  "Held-template cleanup passed: exact residual removals; 40 image files intact.",
);
