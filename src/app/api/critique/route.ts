import { GoogleGenAI, Type } from "@google/genai";

const CRITIQUE_PROMPT = `You are a motion graphics critic reviewing an AI-generated Remotion animation.

You will be given the animation code and the original prompt. Analyze the code to identify visual issues:
- Colors don't match the brand or look off
- Text content doesn't match the prompt
- Layout or positioning appears broken
- Missing key elements described in the prompt
- Animations or effects look wrong based on the code logic

If you find issues, return hasIssues: true with a concise fixPrompt describing the specific code changes needed.
If the code looks correct for the prompt, return hasIssues: false.

Keep fixPrompt short and actionable (1-3 sentences max). Focus on the most impactful fix.`;

export async function POST(req: Request) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." }, { status: 400 });
  }

  let body: { code: string; prompt: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { code, prompt } = body;

  if (!code?.trim() || !prompt?.trim()) {
    return Response.json({ error: "code and prompt are required" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });
  const FAST_MODEL = "gemini-2.5-flash";

  try {
    const result = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Original prompt: "${prompt}"\n\nGenerated animation code:\n\`\`\`tsx\n${code.slice(0, 4000)}\n\`\`\`\n\nDoes this code match the prompt correctly?`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: CRITIQUE_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasIssues: { type: Type.BOOLEAN },
            fixPrompt: { type: Type.STRING },
          },
          required: ["hasIssues", "fixPrompt"],
        },
      },
    });

    const parsed = JSON.parse(result.text ?? "{}") as {
      hasIssues: boolean;
      fixPrompt: string;
    };

    return Response.json(
      {
        hasIssues: Boolean(parsed.hasIssues),
        fixPrompt: parsed.fixPrompt ?? "",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Critique error:", error);
    return Response.json(
      { error: "Critique failed" },
      { status: 500 },
    );
  }
}
