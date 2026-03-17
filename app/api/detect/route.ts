import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const apiKey = process.env.GLM_API_KEY;
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: "user",
          content: `Analyze the following text and determine the probability (0-100) that it was written by AI. 
Return ONLY a JSON object like: {"score": 75, "reason": "brief explanation in English"}
Do not include any other text.

Text to analyze:
${text}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  try {
    const result = JSON.parse(content);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ score: 50, reason: "Unable to analyze" });
  }
}
