import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { convertLegacyNextImages } from "./lib/legacy-template-image-compat";

const root = path.resolve(__dirname, "..");
const walk = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(path.join(directory, entry.name))
      : [path.join(directory, entry.name)],
  );
const files = ["time-table", "team-time-table", "thumbnails"]
  .flatMap((kind) => walk(path.join(root, "src/app/(root)", kind)))
  .filter(
    (file) =>
      /\/(?:[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\//i.test(file) &&
      file.endsWith(".tsx"),
  );
const apply = process.argv.includes("--apply");
if (process.argv.includes("--plain-images")) {
  let count = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const next = convertLegacyNextImages(source, file);
    if (next !== source) {
      if (apply) writeFileSync(file, next);
      count++;
    }
  }
  console.log(JSON.stringify({ dryRun: !apply, plainImageFiles: count }));
  process.exit(0);
}
let connected = 0;
const unsupported: Array<{ file: string; reference: string; line: number }> =
  [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes("useLegacyTemplateImages(")) continue;
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const imports = ast.statements.filter(ts.isImportDeclaration);
  const imageImport = imports.find(
    (node) =>
      ts.isStringLiteral(node.moduleSpecifier) &&
      /\/imgs$/.test(node.moduleSpecifier.text) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings) &&
      node.importClause.namedBindings.elements.some(
        (item) => (item.propertyName?.text ?? item.name.text) === "Imgs",
      ),
  );
  if (
    !imageImport?.importClause?.namedBindings ||
    !ts.isNamedImports(imageImport.importClause.namedBindings)
  )
    continue;
  const binding = imageImport.importClause.namedBindings.elements.find(
    (item) => (item.propertyName?.text ?? item.name.text) === "Imgs",
  )!;
  const localName = binding.name.text;
  const functions = new Set<ts.Block>();
  let blocked = false;
  const visit = (node: ts.Node) => {
    if (
      ts.isIdentifier(node) &&
      node.text === localName &&
      !ts.isImportSpecifier(node.parent) &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
    ) {
      let current: ts.Node | undefined = node.parent;
      let fn: ts.FunctionLikeDeclaration | undefined;
      while (current) {
        if (
          ts.isArrowFunction(current) ||
          ts.isFunctionExpression(current) ||
          ts.isFunctionDeclaration(current)
        )
          fn = current;
        current = current.parent;
      }
      let name = "";
      if (fn) {
        if (ts.isFunctionDeclaration(fn) && fn.name) name = fn.name.text;
        else if (
          ts.isVariableDeclaration(fn.parent) &&
          ts.isIdentifier(fn.parent.name)
        )
          name = fn.parent.name.text;
      }
      if (
        fn?.body &&
        ts.isBlock(fn.body) &&
        (/^[A-Z]/.test(name) || /^use[A-Z]/.test(name))
      )
        functions.add(fn.body);
      else {
        blocked = true;
        unsupported.push({
          file: path.relative(root, file),
          reference: name || node.parent.getText(ast).slice(0, 100),
          line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  ast.statements
    .filter((statement) => !ts.isImportDeclaration(statement))
    .forEach(visit);
  if (blocked || !functions.size) continue;
  const edits = [
    {
      start: binding.getStart(ast),
      end: binding.end,
      text: "Imgs as LocalImgs",
    },
    {
      start: imports[imports.length - 1].end,
      end: imports[imports.length - 1].end,
      text: '\nimport { useLegacyTemplateImages } from "@/contexts/LegacyTemplateAssetsContext";',
    },
    ...[...functions].map((body) => ({
      start: body.getStart(ast) + 1,
      end: body.getStart(ast) + 1,
      text: `\n  const ${localName} = useLegacyTemplateImages(LocalImgs);`,
    })),
  ];
  if (!/^\s*["']use client["'];/.test(source))
    edits.push({ start: 0, end: 0, text: '"use client";\n\n' });
  let next = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    next = next.slice(0, edit.start) + edit.text + next.slice(edit.end);
  if (apply) writeFileSync(file, next);
  connected++;
}
console.log(
  JSON.stringify(
    { dryRun: !apply, connectedFiles: connected, unsupported },
    null,
    2,
  ),
);
if (unsupported.length) process.exitCode = 1;
