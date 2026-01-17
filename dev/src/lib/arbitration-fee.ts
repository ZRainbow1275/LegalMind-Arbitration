// dev/src/lib/arbitration-fee.ts
// 仲裁费计算：默认采用“阶梯费率 + 最低收费”规则，并允许未来通过配置扩展。
import { z } from 'zod';

export const arbitrationFeeInputSchema = z
  .object({
    disputeAmount: z.number().finite().positive(),
    caseType: z.string().max(100).optional(),
    currency: z.string().length(3).default('CNY'),
  })
  .strict();

export type ArbitrationFeeInput = z.infer<typeof arbitrationFeeInputSchema>;

export type ArbitrationFeeResult = {
  fee: number;
  currency: string;
  ruleVersion: string;
  notes: string[];
};

export interface ArbitrationFeeCalculator {
  calculate(input: ArbitrationFeeInput): ArbitrationFeeResult;
}

const DEFAULT_RULE_VERSION = 'tiered-v1-2026-01-16';

class TieredArbitrationFeeCalculator implements ArbitrationFeeCalculator {
  calculate(input: ArbitrationFeeInput): ArbitrationFeeResult {
    const parsed = arbitrationFeeInputSchema.parse(input);
    const amount = parsed.disputeAmount;

    // 规则来源：当前前端原型中的计算逻辑（可替换为仲裁机构正式收费标准）
    // - <= 100,000：max(3,000, 3%)
    // - <= 500,000：3,000 + (amount-100,000)*2.5%
    // - <= 1,000,000：13,000 + (amount-500,000)*2%
    // - > 1,000,000：23,000 + (amount-1,000,000)*1.5%
    let fee = 0;
    if (amount <= 100_000) {
      fee = Math.max(3000, amount * 0.03);
    } else if (amount <= 500_000) {
      fee = 3000 + (amount - 100_000) * 0.025;
    } else if (amount <= 1_000_000) {
      fee = 13_000 + (amount - 500_000) * 0.02;
    } else {
      fee = 23_000 + (amount - 1_000_000) * 0.015;
    }

    const rounded = Math.round(fee);

    return {
      fee: rounded,
      currency: parsed.currency,
      ruleVersion: DEFAULT_RULE_VERSION,
      notes: [
        '费用计算规则为默认阶梯费率版本；生产环境应以仲裁机构正式收费标准为准，并通过配置/版本化进行替换。',
      ],
    };
  }
}

let calculator: ArbitrationFeeCalculator | null = null;

export function getArbitrationFeeCalculator(): ArbitrationFeeCalculator {
  if (!calculator) calculator = new TieredArbitrationFeeCalculator();
  return calculator;
}

