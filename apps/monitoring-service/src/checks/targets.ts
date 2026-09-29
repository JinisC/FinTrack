import type { MonitoredTarget } from '@fintrack/shared-types';
import type { EnvironmentVariables } from '../config/env.validation.js';
import type { Classification, ProbeResponse } from './check-result.js';
import { classifyCoinGeckoPing, classifyFinanceHealth } from './classify.js';

export interface TargetDefinition {
  name: MonitoredTarget;
  url: string;
  headers: Record<string, string>;
  intervalSeconds: number;
  classify: (response: ProbeResponse | null, error?: string) => Classification;
}

export type TargetConfig = Pick<
  EnvironmentVariables,
  | 'FINANCE_SERVICE_URL'
  | 'COINGECKO_BASE_URL'
  | 'COINGECKO_API_KEY'
  | 'POLL_INTERVAL_SECONDS'
  | 'COINGECKO_POLL_INTERVAL_SECONDS'
>;

export function buildTargets(env: TargetConfig): TargetDefinition[] {
  return [
    {
      name: 'finance-service',
      url: `${stripTrailingSlash(env.FINANCE_SERVICE_URL)}/health`,
      headers: {},
      intervalSeconds: env.POLL_INTERVAL_SECONDS,
      classify: classifyFinanceHealth,
    },
    {
      name: 'coingecko',
      url: `${stripTrailingSlash(env.COINGECKO_BASE_URL)}/ping`,
      headers: env.COINGECKO_API_KEY ? { 'x-cg-demo-api-key': env.COINGECKO_API_KEY } : {},
      intervalSeconds: env.COINGECKO_POLL_INTERVAL_SECONDS,
      classify: classifyCoinGeckoPing,
    },
  ];
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
