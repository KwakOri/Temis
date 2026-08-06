import assert from "node:assert/strict";
import {
  CATALOG_COVER_FOLDER,
  CATALOG_COVER_MAX_SIZE,
  CATALOG_COVER_TEST_ROOT_PREFIX,
  createCatalogCoverKey,
  getManagedCatalogCoverKey,
  isCatalogCoverTestPrefix,
  validateCatalogCoverUpload,
} from "../src/lib/catalog-cover";

const templateId = "f0400001-0401-0401-0401-040101010101";
const publicUrl = "https://cdn.example.test/assets";
const originalTestPrefix = process.env.CATALOG_COVER_R2_PREFIX;

assert.equal(
  validateCatalogCoverUpload({
    name: "cover.webp",
    size: 1024,
    type: "image/webp",
  }).isValid,
  true,
);
assert.equal(
  validateCatalogCoverUpload({
    name: "cover.svg",
    size: 1024,
    type: "image/svg+xml",
  }).isValid,
  false,
);
assert.equal(
  validateCatalogCoverUpload({
    name: "cover.png",
    size: CATALOG_COVER_MAX_SIZE + 1,
    type: "image/png",
  }).isValid,
  false,
);

try {
  delete process.env.CATALOG_COVER_R2_PREFIX;

  const productionKey = createCatalogCoverKey(templateId, "image/png");
  assert.match(
    productionKey,
    new RegExp(`^${CATALOG_COVER_FOLDER}/${templateId}/[^/]+\\.png$`),
  );
  assert.equal(
    getManagedCatalogCoverKey(`${publicUrl}/${productionKey}`, publicUrl),
    productionKey,
  );

  const testPrefix = `${CATALOG_COVER_TEST_ROOT_PREFIX}/contract-check`;
  assert.equal(isCatalogCoverTestPrefix(testPrefix), true);
  assert.equal(
    isCatalogCoverTestPrefix(`${CATALOG_COVER_TEST_ROOT_PREFIX}/nested/run`),
    false,
  );
  assert.equal(isCatalogCoverTestPrefix(CATALOG_COVER_FOLDER), false);

  process.env.CATALOG_COVER_R2_PREFIX = testPrefix;
  const testKey = createCatalogCoverKey(templateId, "image/webp");
  assert.match(
    testKey,
    new RegExp(`^${testPrefix}/${templateId}/[^/]+\\.webp$`),
  );
  assert.equal(
    getManagedCatalogCoverKey(`${publicUrl}/${testKey}`, publicUrl),
    testKey,
  );
  assert.equal(
    getManagedCatalogCoverKey(`${publicUrl}/${productionKey}`, publicUrl),
    null,
  );

  delete process.env.CATALOG_COVER_R2_PREFIX;
  assert.equal(
    getManagedCatalogCoverKey(`${publicUrl}/${testKey}`, publicUrl),
    null,
  );
  process.env.CATALOG_COVER_R2_PREFIX = testPrefix;

  process.env.CATALOG_COVER_R2_PREFIX = `${CATALOG_COVER_FOLDER}/unsafe`;
  assert.throws(
    () => createCatalogCoverKey(templateId, "image/png"),
    /CATALOG_COVER_R2_PREFIX must be a single test run prefix/,
  );
  assert.throws(
    () => getManagedCatalogCoverKey(`${publicUrl}/${testKey}`, publicUrl),
    /CATALOG_COVER_R2_PREFIX must be a single test run prefix/,
  );
} finally {
  if (originalTestPrefix === undefined) {
    delete process.env.CATALOG_COVER_R2_PREFIX;
  } else {
    process.env.CATALOG_COVER_R2_PREFIX = originalTestPrefix;
  }
}

assert.equal(
  getManagedCatalogCoverKey(
    "https://external.example.test/cover.png",
    publicUrl,
  ),
  null,
);
assert.equal(
  getManagedCatalogCoverKey(
    `${publicUrl}/uploads/custom-orders/cover.png`,
    publicUrl,
  ),
  null,
);

console.log("Catalog cover contract checks passed.");
