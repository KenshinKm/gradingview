export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

/** USD per million tokens: [input, output]. First-party Anthropic API prices. */
const PRICES: Array<[prefix: string, input: number, output: number]> = [
  ["claude-fable-5", 10, 50],
  ["claude-mythos-5", 10, 50],
  ["claude-opus-5", 5, 25],
  ["claude-opus-4", 5, 25],
  ["claude-sonnet-5", 2, 10],
  ["claude-sonnet-4", 3, 15],
  ["claude-haiku-4", 1, 5],
];

/**
 * Estimated cost in USD for a call, or null when the model isn't in the price
 * table (for example an OpenAI-compatible model). An estimate for tracking
 * spend, not a bill.
 */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const row = PRICES.find(([prefix]) => model.startsWith(prefix));
  if (!row) return null;
  const [, inPrice, outPrice] = row;
  const cost = (usage.input_tokens * inPrice + usage.output_tokens * outPrice) / 1_000_000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
