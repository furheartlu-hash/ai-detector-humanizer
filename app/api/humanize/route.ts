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
          content: `Rewrite the following text to sound more natural and human-written. 
- Use varied sentence lengths
- Add natural transitions and connectors
- Avoid overly formal or repetitive phrasing
- Keep the original meaning intact
- Return ONLY the rewritten text, nothing else

Text to rewrite:
${text}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const rewritten = data.choices?.[0]?.message?.content ?? text;
  return NextResponse.json({ result: rewritten });
}
