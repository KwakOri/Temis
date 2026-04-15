import { v2_runOrderKeyRegressionChecks } from "../src/utils/v2/template-graph-order";

const result = v2_runOrderKeyRegressionChecks();

if (!result.valid) {
  console.error("[check:v2-orderkey] failed");
  result.issues.forEach((issue, index) => {
    console.error(`${index + 1}. ${issue}`);
  });
  process.exit(1);
}

console.log("[check:v2-orderkey] passed");
