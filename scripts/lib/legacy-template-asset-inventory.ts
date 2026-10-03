import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

export const OWNER_KINDS = [
  "timetable",
  "team_timetable",
  "thumbnail",
] as const;
export type OwnerKind = (typeof OWNER_KINDS)[number];
const ROUTES: Record<string, OwnerKind> = {
  "time-table": "timetable",
  "team-time-table": "team_timetable",
  thumbnails: "thumbnail",
};
const IMAGE_PATTERN = /\.(png|jpe?g|webp|gif|avif|svg|ico|bmp)$/i;
const UUID_PATTERN = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
};

export interface InventoryIssue {
  code: string;
  file: string;
  detail: string;
}
export interface InventoryAsset {
  assetId: string;
  file: string;
  originalFilename: string;
  exists: boolean;
  contentHash: string | null;
  byteSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  readError: boolean;
}
export interface InventoryTemplate {
  ownerKind: OwnerKind;
  templateId: string;
  manifestFile: string;
  bindings: Record<string, Record<string, string>>;
  assets: InventoryAsset[];
  issues: InventoryIssue[];
  dynamicReferences: Array<{ file: string; line: number; expression: string }>;
  parentStatus: "not_checked" | "linked" | "missing";
  status: "blocked" | "needs_review" | "ready";
}
export interface CatalogEntry {
  ownerKind: OwnerKind;
  templateId: string;
}
export interface LegacyAssetInventory {
  schemaVersion: 1;
  templates: InventoryTemplate[];
  projectAssets: Array<
    InventoryAsset & { category: "sample" | "public" | "other" }
  >;
  summary: {
    templates: number;
    slots: number;
    templateImageFiles: number;
    projectImageFiles: number;
    templateBytes: number;
    unboundTemplateImages: number;
    uniqueTemplateContents: number;
    blockedTemplates: number;
    pendingParentChecks: number;
    dynamicReferences: number;
  };
}

const sha256 = (value: Buffer | string): string =>
  createHash("sha256").update(value).digest("hex");
const walk = (directory: string): string[] =>
  existsSync(directory)
    ? readdirSync(directory, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name, "en"))
        .flatMap((entry) =>
          entry.isDirectory()
            ? walk(path.join(directory, entry.name))
            : entry.isFile()
              ? [path.join(directory, entry.name)]
              : [],
        )
    : [];
const unwrap = (node: ts.Expression): ts.Expression => {
  while (
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isParenthesizedExpression(node)
  ) {
    node = node.expression;
  }
  return node;
};
const propertyName = (node: ts.PropertyName): string | null =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)
    ? node.text
    : null;
const imageChain = (node: ts.Node, names: Set<string>): ts.Node[] | null => {
  if (ts.isIdentifier(node) && names.has(node.text)) return [];
  if (
    ts.isPropertyAccessExpression(node) ||
    ts.isElementAccessExpression(node)
  ) {
    const parent = imageChain(node.expression, names);
    if (parent)
      return [
        ...parent,
        ts.isPropertyAccessExpression(node)
          ? node.name
          : node.argumentExpression,
      ];
  }
  return null;
};

export function createLegacyAssetInventory(
  rootDir: string,
  options: {
    ownerKind?: OwnerKind;
    templateId?: string;
    catalog?: CatalogEntry[];
  } = {},
): LegacyAssetInventory {
  rootDir = path.resolve(rootDir);
  const relative = (file: string) =>
    path.relative(rootDir, file).split(path.sep).join("/");
  const requireFromProject = createRequire(
    path.resolve(__dirname, "../../package.json"),
  );
  // Next already bundles this decoder; the inventory does not import image modules or execute templates.
  const sizeOf = requireFromProject("next/dist/compiled/image-size") as (
    bytes: Buffer,
  ) => { width?: number; height?: number };
  const assetCache = new Map<string, InventoryAsset>();
  const asset = (file: string): InventoryAsset => {
    const cached = assetCache.get(file);
    if (cached) return cached;
    const extension = path.extname(file).slice(1).toLowerCase();
    const result: InventoryAsset = {
      assetId: sha256(relative(file)),
      file: relative(file),
      originalFilename: path.basename(file),
      exists: existsSync(file),
      contentHash: null,
      byteSize: 0,
      mimeType: MIME_TYPES[extension] ?? "application/octet-stream",
      width: null,
      height: null,
      readError: false,
    };
    if (result.exists) {
      try {
        const bytes = readFileSync(file);
        result.contentHash = sha256(bytes);
        result.byteSize = bytes.length;
        const dimensions = sizeOf(bytes);
        if (!dimensions.width || !dimensions.height)
          throw new Error("Missing dimensions");
        result.width = dimensions.width;
        result.height = dimensions.height;
      } catch {
        result.readError = true;
      }
    }
    assetCache.set(file, result);
    return result;
  };
  const appRoot = path.join(rootDir, "src/app/(root)");
  const allSourceFiles = walk(path.join(rootDir, "src"));
  const publicFiles = walk(path.join(rootDir, "public"));
  const templateFiles = new Set<string>();
  const templates: InventoryTemplate[] = [];
  for (const [route, ownerKind] of Object.entries(ROUTES)) {
    const routeDir = path.join(appRoot, route);
    if (!existsSync(routeDir)) continue;
    for (const entry of readdirSync(routeDir, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name, "en"),
    )) {
      if (!entry.isDirectory() || !UUID_PATTERN.test(entry.name)) continue;
      const directory = path.join(routeDir, entry.name);
      const files = walk(directory);
      files.forEach((file) => templateFiles.add(file));
      if (
        (options.ownerKind && options.ownerKind !== ownerKind) ||
        (options.templateId && options.templateId !== entry.name)
      )
        continue;
      const manifest = path.join(directory, "_img/imgs.ts");
      const template: InventoryTemplate = {
        ownerKind,
        templateId: entry.name,
        manifestFile: relative(manifest),
        bindings: Object.create(null),
        assets: [],
        issues: [],
        dynamicReferences: [],
        parentStatus:
          options.catalog === undefined
            ? "not_checked"
            : options.catalog.some(
                  (row) =>
                    row.ownerKind === ownerKind &&
                    row.templateId === entry.name,
                )
              ? "linked"
              : "missing",
        status: "needs_review",
      };
      const issue = (code: string, file: string, detail: string) =>
        template.issues.push({ code, file: relative(file), detail });
      const imported = new Map<string, string>();
      const usedImports = new Set<string>();
      if (!existsSync(manifest)) {
        issue("MISSING_MANIFEST", manifest, "Missing _img/imgs.ts");
      } else {
        const source = ts.createSourceFile(
          manifest,
          readFileSync(manifest, "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        for (const statement of source.statements) {
          if (
            ts.isImportDeclaration(statement) &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            IMAGE_PATTERN.test(statement.moduleSpecifier.text) &&
            statement.importClause?.name
          ) {
            const file = path.resolve(
              path.dirname(manifest),
              statement.moduleSpecifier.text,
            );
            const local = path.relative(directory, file);
            if (
              !statement.moduleSpecifier.text.startsWith(".") ||
              local === ".." ||
              local.startsWith(`..${path.sep}`)
            ) {
              issue(
                "EXTERNAL_IMAGE_IMPORT",
                manifest,
                statement.moduleSpecifier.text,
              );
              continue;
            }
            imported.set(statement.importClause.name.text, file);
          }
        }
        let found = false;
        const visit = (node: ts.Node): void => {
          if (
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.name.text === "Imgs" &&
            node.initializer
          ) {
            found = true;
            const value = unwrap(node.initializer);
            if (!ts.isObjectLiteralExpression(value)) {
              issue(
                "UNSUPPORTED_MANIFEST",
                manifest,
                "Imgs must be an object literal",
              );
            } else {
              for (const theme of value.properties) {
                if (
                  !ts.isPropertyAssignment(theme) ||
                  propertyName(theme.name) === null ||
                  !ts.isObjectLiteralExpression(unwrap(theme.initializer))
                ) {
                  issue("UNSUPPORTED_THEME", manifest, theme.getText(source));
                  continue;
                }
                const name = propertyName(theme.name)!;
                if (Object.hasOwn(template.bindings, name)) {
                  issue("DUPLICATE_THEME", manifest, name);
                  continue;
                }
                const slots: Record<string, string> = Object.create(null);
                template.bindings[name] = slots;
                for (const slot of (
                  unwrap(theme.initializer) as ts.ObjectLiteralExpression
                ).properties) {
                  if (
                    !ts.isPropertyAssignment(slot) &&
                    !ts.isShorthandPropertyAssignment(slot)
                  ) {
                    issue("UNSUPPORTED_SLOT", manifest, slot.getText(source));
                    continue;
                  }
                  const key = propertyName(slot.name);
                  const ref = ts.isShorthandPropertyAssignment(slot)
                    ? slot.name
                    : unwrap(slot.initializer);
                  const file = ts.isIdentifier(ref)
                    ? imported.get(ref.text)
                    : undefined;
                  if (key === null || !file) {
                    issue("UNRESOLVED_SLOT", manifest, slot.getText(source));
                    continue;
                  }
                  if (Object.hasOwn(slots, key))
                    issue("DUPLICATE_SLOT", manifest, `${name}.${key}`);
                  slots[key] = asset(file).assetId;
                  usedImports.add(file);
                }
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
        if (!found)
          issue("MISSING_IMGS_EXPORT", manifest, "Missing Imgs declaration");
      }
      const images = new Set([
        ...files.filter((file) => IMAGE_PATTERN.test(file)),
        ...imported.values(),
      ]);
      template.assets = [...images].sort().map(asset);
      for (const image of template.assets) {
        if (!image.exists)
          issue(
            "MISSING_IMAGE",
            path.join(rootDir, image.file),
            image.originalFilename,
          );
        else if (image.readError)
          issue(
            "INVALID_IMAGE",
            path.join(rootDir, image.file),
            image.originalFilename,
          );
        if (!usedImports.has(path.join(rootDir, image.file))) {
          issue(
            "UNBOUND_IMAGE",
            path.join(rootDir, image.file),
            "Not bound in Imgs; review other references before cleanup",
          );
        }
      }
      for (const file of files.filter(
        (file) => /\.tsx?$/.test(file) && file !== manifest,
      )) {
        const source = ts.createSourceFile(
          file,
          readFileSync(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );
        const names = new Set<string>();
        for (const statement of source.statements) {
          if (
            ts.isImportDeclaration(statement) &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            path.resolve(
              path.dirname(file),
              statement.moduleSpecifier.text +
                (statement.moduleSpecifier.text.endsWith(".ts") ? "" : ".ts"),
            ) === manifest &&
            statement.importClause?.namedBindings &&
            ts.isNamedImports(statement.importClause.namedBindings)
          ) {
            for (const specifier of statement.importClause.namedBindings
              .elements) {
              if ((specifier.propertyName ?? specifier.name).text === "Imgs")
                names.add(specifier.name.text);
            }
          }
        }
        const visit = (node: ts.Node): void => {
          if (
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.initializer &&
            ts.isCallExpression(node.initializer) &&
            ts.isIdentifier(node.initializer.expression) &&
            node.initializer.expression.text === "useLegacyTemplateImages" &&
            node.initializer.arguments.length === 1 &&
            ts.isIdentifier(node.initializer.arguments[0]) &&
            names.has(node.initializer.arguments[0].text)
          )
            names.add(node.name.text);
          if (
            ts.isElementAccessExpression(node) ||
            ts.isPropertyAccessExpression(node)
          ) {
            const chain = imageChain(node, names);
            if (chain?.length === 2) {
              const [themeNode, keyNode] = chain;
              const theme =
                ts.isStringLiteralLike(themeNode) ||
                (ts.isPropertyAccessExpression(node.expression) &&
                  ts.isIdentifier(themeNode))
                  ? themeNode.text
                  : null;
              const key =
                ts.isStringLiteralLike(keyNode) ||
                (ts.isPropertyAccessExpression(node) &&
                  ts.isIdentifier(keyNode))
                  ? keyNode.text
                  : null;
              if (theme !== null && key !== null) {
                if (!Object.hasOwn(template.bindings[theme] ?? {}, key))
                  issue("UNDECLARED_STATIC_SLOT", file, `${theme}.${key}`);
              } else {
                template.dynamicReferences.push({
                  file: relative(file),
                  line:
                    source.getLineAndCharacterOfPosition(node.getStart(source))
                      .line + 1,
                  expression: node.getText(source),
                });
              }
            }
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
      if (template.parentStatus === "missing")
        issue("MISSING_DB_PARENT", manifest, `${ownerKind}:${entry.name}`);
      const blocking = template.issues.some(
        (item) => item.code !== "UNBOUND_IMAGE",
      );
      template.status = blocking
        ? "blocked"
        : template.parentStatus !== "linked" ||
            template.dynamicReferences.length > 0 ||
            template.issues.length > 0
          ? "needs_review"
          : "ready";
      templates.push(template);
    }
  }
  const projectAssets = [...allSourceFiles, ...publicFiles]
    .filter((file) => IMAGE_PATTERN.test(file) && !templateFiles.has(file))
    .sort()
    .map((file) => ({
      ...asset(file),
      category: (relative(file).startsWith("public/")
        ? "public"
        : /\/(?:_sample|time-table-tester)\//.test(relative(file))
          ? "sample"
          : "other") as "public" | "sample" | "other",
    }));
  const allAssets = templates
    .flatMap((template) => template.assets)
    .filter((image) => image.exists);
  return {
    schemaVersion: 1,
    templates,
    projectAssets,
    summary: {
      templates: templates.length,
      slots: templates.reduce(
        (sum, template) =>
          sum +
          Object.values(template.bindings).reduce(
            (count, slots) => count + Object.keys(slots).length,
            0,
          ),
        0,
      ),
      templateImageFiles: allAssets.length,
      projectImageFiles: projectAssets.length,
      templateBytes: allAssets.reduce((sum, image) => sum + image.byteSize, 0),
      unboundTemplateImages: templates.reduce(
        (sum, template) =>
          sum +
          template.issues.filter(
            (issue) =>
              issue.code === "UNBOUND_IMAGE" &&
              template.assets.some(
                (asset) => asset.file === issue.file && asset.exists,
              ),
          ).length,
        0,
      ),
      uniqueTemplateContents: new Set(
        allAssets.map((image) => image.contentHash).filter(Boolean),
      ).size,
      blockedTemplates: templates.filter(
        (template) => template.status === "blocked",
      ).length,
      pendingParentChecks: templates.filter(
        (template) => template.parentStatus === "not_checked",
      ).length,
      dynamicReferences: templates.reduce(
        (sum, template) => sum + template.dynamicReferences.length,
        0,
      ),
    },
  };
}
