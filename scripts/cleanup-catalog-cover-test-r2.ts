import {
  CATALOG_COVER_TEST_ROOT_PREFIX,
  isCatalogCoverTestPrefix,
} from "../src/lib/catalog-cover";
import { deleteFilesFromR2, listFileObjectsFromR2Prefix } from "../src/lib/r2";

const trimSlashes = (value: string): string =>
  value.trim().replace(/^\/+|\/+$/g, "");

const parseMaxDelete = (argv: string[]): number => {
  const index = argv.indexOf("--max-delete");
  if (index === -1) return 1000;

  const value = Number(argv[index + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--max-delete must be a positive integer.");
  }

  return value;
};

const printHelp = () => {
  console.log(
    [
      "Usage: npm run cleanup:catalog-cover:test:r2 -- [options]",
      "",
      "Default mode is dry-run. Add --apply to delete R2 objects.",
      "This script lists and deletes R2 objects only; it never reads or modifies Supabase metadata.",
      "",
      "Required environment:",
      `  CATALOG_COVER_R2_PREFIX=${CATALOG_COVER_TEST_ROOT_PREFIX}/<run-id>`,
      "",
      "Options:",
      "  --apply              Actually delete listed R2 objects",
      "  --max-delete <n>    Delete at most n objects (default: 1000)",
      "  --help               Show help",
    ].join("\n"),
  );
};

const main = async () => {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  const configuredPrefix = process.env.CATALOG_COVER_R2_PREFIX;
  if (!configuredPrefix?.trim()) {
    throw new Error(
      `CATALOG_COVER_R2_PREFIX is required and must be below ${CATALOG_COVER_TEST_ROOT_PREFIX}/.`,
    );
  }

  const prefix = trimSlashes(configuredPrefix);
  if (!isCatalogCoverTestPrefix(prefix)) {
    throw new Error(
      `Refusing to cleanup unsafe catalog cover prefix: ${prefix}. Expected ${CATALOG_COVER_TEST_ROOT_PREFIX}/<run-id>.`,
    );
  }

  const maxDelete = parseMaxDelete(argv);
  const apply = argv.includes("--apply");
  const objectPrefix = `${prefix}/`;
  const objects = await listFileObjectsFromR2Prefix(objectPrefix);
  const selectedObjects = objects.slice(0, maxDelete);
  const selectedBytes = selectedObjects.reduce(
    (total, object) => total + object.size,
    0,
  );

  console.log(
    `[catalog-cover:test:r2-cleanup] mode=${apply ? "apply" : "dry-run"} db=ignored`,
  );
  console.log(
    `[catalog-cover:test:r2-cleanup] prefix=${objectPrefix} matched=${objects.length} selected=${selectedObjects.length} bytes=${selectedBytes}`,
  );

  selectedObjects.forEach((object) => {
    console.log(`  - ${object.key} (${object.size} bytes)`);
  });

  if (objects.length > selectedObjects.length) {
    console.log(
      `[catalog-cover:test:r2-cleanup] ${objects.length - selectedObjects.length} object(s) remain capped by --max-delete`,
    );
  }

  if (apply && selectedObjects.length > 0) {
    const deleted = await deleteFilesFromR2(
      selectedObjects.map((object) => object.key),
    );
    console.log(`[catalog-cover:test:r2-cleanup] deleted=${deleted}`);
  } else if (!apply) {
    console.log(
      "[catalog-cover:test:r2-cleanup] dry-run only. Add --apply to delete.",
    );
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
