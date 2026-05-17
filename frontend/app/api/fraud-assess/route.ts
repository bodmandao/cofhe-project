import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { description, policyId, claimAmount, severity } = await req.json();

    if (!description?.trim()) {
      return NextResponse.json({ error: "description required" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `You are a fraud detection system for a decentralised insurance protocol.
Analyse the claim description and inputs for fraud indicators.
Return ONLY valid JSON — no markdown, no explanation outside the JSON.

Fraud indicators to check:
- Vague or inconsistent description
- Amount disproportionate to severity level
- High severity with minor-sounding incident
- Common fraud patterns (exaggeration, staging, timing manipulation)
- Internal inconsistencies in the narrative

Return this exact schema:
{
  "fraudScore": <integer 0-100>,
  "confidence": "low" | "medium" | "high",
  "flags": [<list of specific concerns, empty if clean>],
  "reasoning": "<one sentence>"
}

fraudScore 0-30 = low fraud risk, 31-70 = medium, 71-100 = high (claim will fail FHE gate).`,
      messages: [
        {
          role: "user",
          content: `Policy ID: ${policyId}
Claim amount: ${claimAmount} units
Incident severity: ${severity}/100
Description: ${description}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const result = JSON.parse(text);

    return NextResponse.json({
      fraudScore:  Math.max(0, Math.min(100, Number(result.fraudScore))),
      confidence:  result.confidence ?? "medium",
      flags:       result.flags ?? [],
      reasoning:   result.reasoning ?? "",
    });
  } catch (err: any) {
    console.error("fraud-assess error:", err);
    return NextResponse.json({ error: err.message ?? "Analysis failed" }, { status: 500 });
  }
}
