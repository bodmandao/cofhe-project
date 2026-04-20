import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface RiskAssessmentResult {
  riskScore: number;           // 1–100
  recommendedCoverage: number; // units (1 unit = 0.0001 ETH)
  tier: "Low" | "Moderate" | "High";
  reasoning: string;
  factors: string[];
  premiumEstimate: number;     // units
}

const SYSTEM_PROMPT = `You are ShieldFi's confidential risk assessment advisor — an AI that helps users understand their insurance risk profile without ever storing or transmitting their personal data.

Your role:
- Analyse the user's situation described in natural language
- Produce a structured risk assessment with a numeric score
- Recommend appropriate coverage amounts
- Explain your reasoning clearly and compassionately

Risk scoring guide (1–100):
- 1–30   Low risk:      Healthy lifestyle, stable income, low-risk activities, no dependants
- 31–70  Moderate risk: Some health concerns, moderate activity risk, family dependants, self-employed
- 71–100 High risk:     Chronic conditions, hazardous occupation, extreme sports, major financial obligations

Coverage guide (units, 1 unit = 0.0001 ETH):
- Low risk:      50–150 units
- Moderate risk: 100–300 units
- High risk:     200–500 units

CRITICAL PRIVACY NOTE: You are NOT storing any data. Your output helps the user decide what values to encrypt on-chain. The actual numbers they enter will be encrypted by FHE before submission — you never see their on-chain identity.

Always respond in valid JSON matching this exact schema:
{
  "riskScore": <number 1-100>,
  "recommendedCoverage": <number 50-500>,
  "tier": "<Low|Moderate|High>",
  "reasoning": "<2-3 sentence explanation>",
  "factors": ["<factor 1>", "<factor 2>", "<factor 3>"],
  "premiumEstimate": <number — BASE(5) + (riskScore × coverage) / 100>
}`;

export async function POST(req: NextRequest) {
  const body = await req.json() as { description: string };

  if (!body.description || body.description.trim().length < 10) {
    return NextResponse.json({ error: "Please describe your situation." }, { status: 400 });
  }

  if (body.description.length > 1500) {
    return NextResponse.json({ error: "Description too long (max 1500 chars)." }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Please assess my insurance risk based on this situation:\n\n${body.description}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from the response (Claude may wrap it in markdown)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Could not parse assessment." }, { status: 500 });
  }

  const result = JSON.parse(jsonMatch[0]) as RiskAssessmentResult;

  // Clamp values to safe ranges
  result.riskScore         = Math.max(1,   Math.min(100, Math.round(result.riskScore)));
  result.recommendedCoverage = Math.max(50, Math.min(500, Math.round(result.recommendedCoverage)));
  result.premiumEstimate   = 5 + Math.floor((result.riskScore * result.recommendedCoverage) / 100);

  return NextResponse.json(result);
}
