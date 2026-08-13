#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const selfPath = path.resolve(__filename);
const sourceExtensions = [".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"];
const legacyNames = [
  "NEXT_PUBLIC_SUPABASE_" + "ANON_KEY",
  "SUPABASE_" + "SERVICE_ROLE_KEY",
];

const failures = [];

const listFiles = (targetPath) => {
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return [targetPath];

  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", ".next", ".git"].includes(entry.name)) return [];
    return listFiles(path.join(targetPath, entry.name));
  });
};

const scannedFiles = [
  ...listFiles(srcDir),
  ...listFiles(path.join(rootDir, "scripts")),
  ...listFiles(path.join(rootDir, ".github")),
  path.join(rootDir, ".env.example"),
  path.join(rootDir, "README.md"),
].filter((filePath) => fs.existsSync(filePath) && path.resolve(filePath) !== selfPath);

for (const filePath of scannedFiles) {
  const content = fs.readFileSync(filePath, "utf8");
  const relativePath = path.relative(rootDir, filePath);

  for (const legacyName of legacyNames) {
    if (content.includes(legacyName)) {
      failures.push(`${relativePath}: legacy key name ${legacyName} remains`);
    }
  }

  if (/NEXT_PUBLIC_SUPABASE_[A-Z0-9_]*KEY/.test(content)) {
    failures.push(`${relativePath}: Supabase key uses a NEXT_PUBLIC_ name`);
  }
}

const sourceFiles = listFiles(srcDir).filter((filePath) =>
  sourceExtensions.includes(path.extname(filePath))
);
const sourceFileSet = new Set(sourceFiles.map((filePath) => path.resolve(filePath)));
const clientReachable = new Set();
const queue = sourceFiles.filter((filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return /^\s*["']use client["'];?/m.test(content);
});

const resolveSourceImport = (fromPath, specifier) => {
  let basePath;
  if (specifier.startsWith("@/")) {
    basePath = path.join(srcDir, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(fromPath), specifier);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => path.join(basePath, `index${extension}`)),
  ];
  return candidates.find((candidate) => sourceFileSet.has(path.resolve(candidate))) ?? null;
};

while (queue.length > 0) {
  const filePath = path.resolve(queue.shift());
  if (clientReachable.has(filePath)) continue;
  clientReachable.add(filePath);

  const content = fs.readFileSync(filePath, "utf8");
  const importPatterns = [
    /(?:import|export)\s+(?!type\b)(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const importPattern of importPatterns) {
    for (const match of content.matchAll(importPattern)) {
      const resolved = resolveSourceImport(filePath, match[1]);
      if (resolved && !clientReachable.has(path.resolve(resolved))) {
        queue.push(resolved);
      }
    }
  }
}

for (const filePath of clientReachable) {
  const content = fs.readFileSync(filePath, "utf8");
  if (
    content.includes("SUPABASE_PUBLISHABLE_KEY") ||
    content.includes("SUPABASE_SECRET_KEY") ||
    content.includes("@supabase/supabase-js") ||
    /["']@\/lib\/supabase(?:-admin-server)?["']/.test(content)
  ) {
    failures.push(
      `${path.relative(rootDir, filePath)}: Supabase client/key is reachable from a client component`
    );
  }
}

if (failures.length > 0) {
  console.error("Supabase key boundary check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Supabase key boundary check passed (${clientReachable.size} client-reachable modules audited).`
);
