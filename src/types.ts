import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

type SpiceParamBase = {
  type: 'spkpos' | 'spkezr';
}

type SpiceTarget = string
type SpiceSpanUnit = 'sec' | 'min' | 'hour' | 'day'

type SpiceSpkposParam = SpiceParamBase & {
  type: 'spkpos';
  target: SpiceTarget;
  observer: SpiceTarget;
  span: number;
  unit: SpiceSpanUnit;
  last?: boolean; // 最新データポイントのみを取得するフラグ
}

type SpiceSpkezrParam = SpiceParamBase & {
  type: 'spkezr';
}

type SpiceParam = SpiceSpkposParam | SpiceSpkezrParam;

export interface SpiceQuery extends DataQuery {
  refId: string;
  param: SpiceParam;
}

export const DEFAULT_QUERY: Partial<SpiceQuery> = {
  param: {
    type: 'spkpos',
    target: 'EARTH',
    observer: 'SUN',
    span: 1,
    unit: 'day',
    last: false,
  },
}

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface SpiceDataSourceOptions extends DataSourceJsonData {
	kernels?: string[];
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface SpiceSecureJsonData {
  apiKey?: string;
}
