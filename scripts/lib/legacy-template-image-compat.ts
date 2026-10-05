import ts from "typescript";
export function convertLegacyNextImages(source: string, file: string): string {
  const original = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const srcEdits: Array<{ start: number; end: number; text: string }> = [];
  const normalize = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "replace" &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      node.expression.expression.name.text === "src" &&
      node.expression.expression.getText(original).startsWith("Imgs[") &&
      node.arguments.length === 2 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text === "./" &&
      ts.isStringLiteral(node.arguments[1]) &&
      node.arguments[1].text === "/"
    )
      srcEdits.push({
        start: node.getStart(original),
        end: node.end,
        text: node.expression.expression.getText(original),
      });
    ts.forEachChild(node, normalize);
  };
  normalize(original);
  for (const edit of srcEdits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const imageImport = ast.statements.find(
    (node): node is ts.ImportDeclaration =>
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text === "next/image" &&
      !!node.importClause?.name,
  );
  if (!imageImport?.importClause?.name) return source;
  const name = imageImport.importClause.name.text;
  const edits = [
    { start: imageImport.getStart(ast), end: imageImport.end, text: "" },
  ];
  const visit = (node: ts.Node) => {
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(ast) === name
    ) {
      edits.push({
        start: node.tagName.getStart(ast),
        end: node.tagName.end,
        text: "img",
      });
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const fill = attributes.find(
        (attribute) => attribute.name.getText(ast) === "fill",
      );
      const style = attributes.find(
        (attribute) => attribute.name.getText(ast) === "style",
      );
      if (fill) {
        const defaults =
          'position: "absolute", inset: 0, width: "100%", height: "100%"';
        if (
          style?.initializer &&
          ts.isJsxExpression(style.initializer) &&
          style.initializer.expression
        ) {
          edits.push({ start: fill.getStart(ast), end: fill.end, text: "" });
          edits.push({
            start: style.initializer.getStart(ast),
            end: style.initializer.end,
            text: `{{ ${defaults}, ...(${style.initializer.expression.getText(ast)}) }}`,
          });
        } else
          edits.push({
            start: fill.getStart(ast),
            end: fill.end,
            text: `style={{ ${defaults} }}`,
          });
      }
      const src = attributes.find(
        (attribute) => attribute.name.getText(ast) === "src",
      );
      if (
        src?.initializer &&
        ts.isJsxExpression(src.initializer) &&
        src.initializer.expression
      ) {
        const expression = src.initializer.expression;
        if (
          expression.getText(ast).startsWith("Imgs[") &&
          !(
            ts.isPropertyAccessExpression(expression) &&
            expression.name.text === "src"
          )
        )
          edits.push({
            start: expression.getStart(ast),
            end: expression.end,
            text: `(${expression.getText(ast)}).src`,
          });
      }
    }
    if (ts.isJsxClosingElement(node) && node.tagName.getText(ast) === name)
      edits.push({
        start: node.tagName.getStart(ast),
        end: node.tagName.end,
        text: "img",
      });
    ts.forEachChild(node, visit);
  };
  visit(ast);
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  return source;
}
