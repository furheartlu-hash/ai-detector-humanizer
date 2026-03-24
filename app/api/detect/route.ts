import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });
  
  const FREE_LIMIT = 2000; // 免费版限制2000字
  if (text.length > FREE_LIMIT) {
    return NextResponse.json({ 
      error: `文本超出限制。免费版最多支持 ${FREE_LIMIT} 字，当前 ${text.length} 字`,
      limit: FREE_LIMIT,
      current: text.length
    }, { status: 400 });
  }

  const apiKey = process.env.GLM_API_KEY;
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: "system",
          content: "You are an AI text detector. Analyze text and return ONLY valid JSON format: {\"score\": number, \"reason\": \"string\", \"highlights\": [\"sentence1\", \"sentence2\"]}"
        },
        {
          role: "user",
          content: `分析以下文本，判断AI生成概率(0-100)。

检测要点：
1. 是否有过度工整的句式结构
2. 是否使用大量转折词（然而、此外、因此）
3. 逻辑是否过于完美，缺少人类的跳跃思维
4. 是否有明显的AI常用表达

返回格式（必须是有效JSON）：
{
  "score": 数字(0-100),
  "reason": "简短说明",
  "highlights": ["疑似AI生成的句子1", "疑似AI生成的句子2"]
}

待分析文本：
${text.slice(0, 2000)}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  
  try {
    // 尝试提取JSON（处理markdown代码块包裹的情况）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const result = JSON.parse(jsonStr);
    
    return NextResponse.json({
      score: result.score || 50,
      reason: result.reason || "分析完成",
      highlights: result.highlights || []
    });
  } catch (error) {
    console.error("JSON解析失败:", content);
    return NextResponse.json({ 
      score: 50, 
      reason: "模型返回格式异常，无法准确分析",
      highlights: []
    });
  }
}
