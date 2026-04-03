export type SceneValidationIssue =
  | {
      kind: "duplicate-scope-declaration";
      name: string;
      line: number;
      scopeDepth: number;
      snippet: string | null;
    }
  | {
      kind: "tdz-forward-reference";
      name: string;
      referencedName: string;
      line: number;
      referencedLine: number;
      scopeDepth: number;
      snippet: string | null;
    }
  | {
      kind: "invalid-runtime-structure";
      reason: string;
      line: number | null;
      snippet: string | null;
    };

type SimpleDeclaration = {
  keyword: "const" | "let" | "var";
  name: string;
  initializer: string;
  line: number;
  scopeDepth: number;
  snippet: string | null;
};

function stripStringsAndComments(line: string): string {
  let out = "";
  let inString: '"' | "'" | "`" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "/" && next === "/") break;
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function computeDepthBeforeEachLine(lines: string[]): number[] {
  const depths: number[] = [];
  let depth = 0;
  let inBlockComment = false;
  let inString: '"' | "'" | "`" | null = null;

  for (const line of lines) {
    depths.push(depth);
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1];
      if (inBlockComment) {
        if (ch === "*" && next === "/") {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (inString) {
        if (ch === "\\") {
          i++;
          continue;
        }
        if (ch === inString) inString = null;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === "/" && next === "/") break;
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = ch;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") depth = Math.max(0, depth - 1);
    }
  }

  return depths;
}

function getSimpleDeclaration(line: string, lineNumber: number, scopeDepth: number): SimpleDeclaration | null {
  const stripped = stripStringsAndComments(line).trim();
  const match = stripped.match(/^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?$/);
  if (!match) return null;
  return {
    keyword: match[1] as "const" | "let" | "var",
    name: match[2],
    initializer: match[3].trim(),
    line: lineNumber,
    scopeDepth,
    snippet: line.trim() || null,
  };
}

function extractSimpleReferences(initializer: string): string[] {
  const refs = new Set<string>();
  const cleaned = stripStringsAndComments(initializer);
  const identifierRe = /\b([A-Za-z_$][\w$]*)\b/g;
  const ignored = new Set([
    "true",
    "false",
    "null",
    "undefined",
    "Math",
    "Array",
    "Object",
    "Number",
    "String",
    "Boolean",
    "Date",
    "JSON",
    "console",
  ]);

  let match: RegExpExecArray | null;
  while ((match = identifierRe.exec(cleaned)) !== null) {
    const name = match[1];
    const prev = cleaned[match.index - 1] ?? "";
    if (prev === ".") continue;
    if (ignored.has(name)) continue;
    refs.add(name);
  }

  return Array.from(refs);
}

function isHighConfidenceTdzInitializer(initializer: string): boolean {
  const cleaned = stripStringsAndComments(initializer).trim();
  if (!cleaned) return false;
  if (/[{}[\]]/.test(cleaned)) return false;
  if (/=>/.test(cleaned)) return false;
  if (/:/.test(cleaned)) return false;
  return true;
}

export function validateSceneCodeSafety(source: string): SceneValidationIssue[] {
  const issues: SceneValidationIssue[] = [];
  const lines = source.split("\n");
  const depthBefore = computeDepthBeforeEachLine(lines);
  const declarations: SimpleDeclaration[] = [];

  for (let i = 0; i < lines.length; i++) {
    const declaration = getSimpleDeclaration(lines[i] ?? "", i + 1, depthBefore[i] ?? 0);
    if (declaration) declarations.push(declaration);
  }

  const seenByScope = new Map<string, SimpleDeclaration>();
  for (const declaration of declarations) {
    const key = `${declaration.scopeDepth}:${declaration.name}`;
    if (seenByScope.has(key)) {
      issues.push({
        kind: "duplicate-scope-declaration",
        name: declaration.name,
        line: declaration.line,
        scopeDepth: declaration.scopeDepth,
        snippet: declaration.snippet,
      });
      continue;
    }
    seenByScope.set(key, declaration);
  }

  for (const declaration of declarations) {
    if (declaration.keyword === "var") continue;
    if (!isHighConfidenceTdzInitializer(declaration.initializer)) continue;
    const laterDeclarations = declarations.filter(
      (candidate) =>
        candidate.scopeDepth === declaration.scopeDepth &&
        candidate.line > declaration.line,
    );
    if (laterDeclarations.length === 0) continue;

    const laterByName = new Map<string, SimpleDeclaration>();
    for (const later of laterDeclarations) {
      if (!laterByName.has(later.name)) {
        laterByName.set(later.name, later);
      }
    }

    for (const ref of extractSimpleReferences(declaration.initializer)) {
      if (ref === declaration.name) continue;
      const later = laterByName.get(ref);
      if (!later) continue;
      issues.push({
        kind: "tdz-forward-reference",
        name: declaration.name,
        referencedName: ref,
        line: declaration.line,
        referencedLine: later.line,
        scopeDepth: declaration.scopeDepth,
        snippet: declaration.snippet,
      });
    }
  }

  return issues;
}
