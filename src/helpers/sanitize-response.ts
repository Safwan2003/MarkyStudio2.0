export interface ValidationResult {
  isValid: boolean;
  error: string | null;
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
  // Find the component declaration start - more flexible regex
  // Matches: export const Name = (...) => { OR const Name = (...) => {
  const exportMatch = code.match(
    /(?:export\s+)?const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*(?:async\s*)?\(?[\s\S]*?\)?\s*=>\s*\{/,
  );

  if (exportMatch && exportMatch.index !== undefined) {
    const declarationStart = exportMatch.index;
    const bodyStart = declarationStart + exportMatch[0].length - 1; // points at "{"

    // Count braces to find the matching closing brace
    let braceCount = 0;
    let endIndex = bodyStart;
    let inStr: string | null = null;

    for (let i = bodyStart; i < code.length; i++) {
      const char = code[i];

      // Handle strings to avoid counting braces inside them
      if (inStr) {
        if (char === "\\" ) { i++; continue; }
        if (char === inStr) inStr = null;
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

    if (braceCount === 0) {
      // Return everything from start of code to end of component (including closing brace)
      let result = code.slice(0, endIndex + 1);

      // Preserve the required // EOF sentinel if present right after the component.
      // We rely on this to detect truncation; previous truncation behavior dropped it.
      const tail = code.slice(endIndex + 1);
      if (/^\s*\/\/\s*EOF\s*$/m.test(tail)) {
        result = `${result}\n\n// EOF`;
      }
      
      // Ensure we don't return just the body if we matched the full declaration
      // Actually, we want to return everything from the START of the code up to the end of this component.
      // This preserves any helper functions defined BEFORE the component.
      
      return result.trim();
    }
  }

  // Fallback: return as-is
  return code;
}
