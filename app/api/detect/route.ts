import { NextRequest, NextResponse } from "next/server";

const FREE_LIMIT = 2000;

// 统计特征分析（本地计算，不依赖模型）
function analyzeTextFeatures(text: string) {
  const sentences = text.split(/[。！？!?]+/).filter(s => s.trim().length > 5);
  
  // 人类写作特征词（降低AI概率）
  const humanSignals = [
    /我[\w]{0,3}(做|干|搞|跑|见过|发现|觉得|认为|知道)/,
    /[0-9]+年/,           // 具体年份/年限
    /说实话|坦白讲|老实说/,
    /哈哈|哎|唉|嗯|呢|吧|啊|嘛/,  // 语气词
    /一里亚尔|大跌眼镜|没什么好讨论/,  // 口语化表达
    /3\.29|Tess|Club/,    // 具体活动/人名
    /你什么时候见过/,      // 反问句
  ];

  // AI写作特征词（提高AI概率）
  const aiSignals = [
    /值得注意的是|需要强调的是|不可忽视的是/,
    /综上所述|总而言之|由此可见/,
    /首先.*其次.*最后/s,
    /一方面.*另一方面/s,
    /不仅.*而且.*还/s,
    /通过.*可以.*从而/s,
  ];

  const humanScore = humanSignals.filter(r => r.test(text)).length;
  const aiScore = aiSignals.filter(r => r.test(text)).length;

  // 句子长度方差（人类写作长短不一，AI更均匀）
  const lengths = sentences.map(s => s.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / (lengths.length || 1);
  const highVariance = variance > 200; // 方差大 = 更像人类

  return { humanScore, aiScore, highVariance, sentenceCount: sentences.length };
}

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  if (text.length > FREE_LIMIT) {
    return NextResponse.json({
      error: `文本超出限制。免费版最多支持 ${FREE_LIMIT} 字，当前 ${text.length} 字`,
      limit: FREE_LIMIT,
      current: text.length,
    }, { status: 400 });
  }

  // 本地特征分析
  const features = analyzeTextFeatures(text);

  const apiKey = process.env.GLM_API_KEY;
  const res = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "glm-4-flash",
      messages: [
        {
          role: "system",
          content: `你是一个专业的AI文本检测器。你的任务是判断文本是否由AI生成。
注意：逻辑清晰、结构严谨的文章不一定是AI写的，人类专业写作也可以很有条理。
重点关注以下人类写作特征（这些会降低AI概率）：
- 个人化表达：具体的个人经历、年限、第一人称叙述
- 口语化：语气词、反问句、俚语、方言表达
- 情感化：愤怒、幽默、讽刺等真实情绪
- 不完美性：跳跃的思维、不完整的句子、重复啰嗦
- 具体细节：真实的人名、地名、日期、数字

AI写作特征（这些会提高AI概率）：
- 模板化开头：值得注意的是、综上所述、首先其次最后
- 过度平衡：总是"一方面...另一方面"
- 无个性：没有任何个人观点或情感
- 完美结构：每段都有明确的主题句和总结句

返回ONLY有效JSON：{"score": 数字(0-100), "reason": "中文说明", "highlights": ["疑似AI句子1", "疑似AI句子2"]}`
        },
        {
          role: "user",
          content: `分析以下文本的AI生成概率。

参考信息（本地统计分析结果）：
- 检测到人类写作信号：${features.humanScore} 个
- 检测到AI写作信号：${features.aiScore} 个  
- 句子长度方差较高（写作节奏不均匀，更像人类）：${features.highVariance}
- 句子数量：${features.sentenceCount}

请结合以上统计特征和文本内容综合判断，给出0-100的AI概率分数。
如果人类信号明显多于AI信号，分数应该偏低（<40）。

待分析文本：
${text}`,
        },
      ],
    }),
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const result = JSON.parse(jsonStr);

    // 用本地特征对模型结果做校正
    let finalScore = result.score ?? 50;
    if (features.humanScore >= 3) finalScore = Math.max(finalScore - 20, 0);
    else if (features.humanScore >= 1) finalScore = Math.max(finalScore - 10, 0);
    if (features.highVariance) finalScore = Math.max(finalScore - 10, 0);
    if (features.aiScore >= 3) finalScore = Math.min(finalScore + 15, 100);

    return NextResponse.json({
      score: Math.round(finalScore),
      reason: result.reason || "分析完成",
      highlights: result.highlights || [],
    });
  } catch {
    console.error("JSON解析失败:", content);
    return NextResponse.json({
      score: 50,
      reason: "模型返回格式异常，无法准确分析",
      highlights: [],
    });
  }
}
