export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

function extractBalancedDeclaration(
  source: string,
  declarationRegex: RegExp,
): string | null {
  const match = declarationRegex.exec(source);
  if (!match || match.index === undefined) {
    return null;
  }

  const declarationStart = match.index;
  const bodyStart = declarationStart + match[0].length - 1; // points at "{"

  let braceCount = 0;
  let endIndex = bodyStart;
  let inStr: string | null = null;

  for (let i = bodyStart; i < source.length; i++) {
    const char = source[i];

    if (inStr) {
      if (char === "\\") {
        i++;
        continue;
      }
      if (char === inStr) {
        inStr = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inStr = char;
      continue;
    }

    if (char === "{") {
      braceCount++;
    } else if (char === "}") {
      braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (braceCount !== 0) {
    return null;
  }

  let result = source.slice(0, endIndex + 1);
  const tail = source.slice(endIndex + 1);
  if (/^\s*\/\/\s*EOF\s*$/m.test(tail)) {
    result = `${result}\n\n// EOF`;
  }

  return result.trim();
}

/**
 * Strip markdown code fences from a string.
 * Handles ```tsx, ```ts, ```jsx, ```js and plain ``` fences.
 */
export function stripMarkdownFences(code: string): string {
  let result = code;
  // Strip leading fence
  result = result.replace(/^```(?:tsx?|jsx?|javascript|typescript)?\n?/, "");
  // Strip trailing fence
  result = result.replace(/\n?```\s*$/, "");
  // Strip any mid-string fence markers (LLM sometimes inserts ```javascript inside a function body)
  result = result.replace(/```(?:tsx?|jsx?|javascript|typescript)?\n?/g, "");
  result = result.replace(/```/g, "");
  // Strip leaked standalone fence language labels that occasionally appear on their own line
  // e.g. a bare `javascript` token inside the code.
  result = result.replace(/^\s*(javascript|typescript|jsx|tsx)\s*$/gmi, "");
  return result.trim();
}

/**
 * If the model returned `const MyAnimation = …` without `export`, client-side
 * structure checks and the compiler expect `export const MyAnimation`.
 */
export function ensureMainSceneExport(code: string): string {
  if (/export\s+const\s+(MyAnimation|DynamicAnimation|FragmentedScene)\s*=/.test(code)) {
    return code;
  }
  return code.replace(
    /(^|\n)(\s*)const\s+(MyAnimation|DynamicAnimation|FragmentedScene)\s*=/g,
    (_, lineStart: string, indent: string, name: string) =>
      `${lineStart}${indent}export const ${name} =`,
  );
}

/**
 * Lightweight validation to check if GPT response contains JSX content.
 * This is a fallback check after the LLM pre-validation.
 */
export function validateGptResponse(response: string): ValidationResult {
  const trimmed = response.trim();

  // Check for JSX-like content (at least one opening tag)
  // Matches: <ComponentName, <div, <span, etc.
  const hasJsx = /<[A-Z][a-zA-Z]*|<[a-z]+[^>]*>/.test(trimmed);
  if (!hasJsx) {
    return {
      isValid: false,
      error:
        "The response was not a valid motion graphics component. Please try a different prompt.",
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Extract only the component code, removing any trailing text/commentary.
 * Uses brace counting to find the end of the component.
 */
export function extractComponentCode(code: string): string {
  const normalizedCode = stripMarkdownFences(code);

  const mainSceneCode = extractBalancedDeclaration(
    normalizedCode,
    /export\s+const\s+(?:MyAnimation|DynamicAnimation|FragmentedScene)\s*=\s*(?:async\s*)?\(?[\s\S]*?\)?\s*=>\s*\{/,
  );
  if (mainSceneCode) {
    return ensureMainSceneExport(mainSceneCode);
  }

  const fallbackCode = extractBalancedDeclaration(
    normalizedCode,
    /(?:export\s+)?const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(?:async\s*)?\(?[\s\S]*?\)?\s*=>\s*\{/,
  );
  if (fallbackCode) {
    return ensureMainSceneExport(fallbackCode);
  }

  // Fallback: return as-is
  return ensureMainSceneExport(normalizedCode);
}
