import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export type SpiceBody = {
  id: number;
  name: string;
}

type SpiceParamBase = {
  type: 'spkpos' | 'spkezr';
}

type SpiceTarget = string
export type SpiceSpanUnit = 'sec' | 'min' | 'hour' | 'day'
export type SpiceFrame = 'J2000' | 'ECLIPJ2000' | 'GALACTIC' | 'IAU_EARTH' | 'IAU_MARS' | 'IAU_SUN'
export type SpiceOutputFormat = 'cartesian' | 'quaternion' | 'euler_xyz' | 'euler_zyx' | 'euler_zxz'

// Range source: use Grafana UI range or custom range
export type SpiceRangeSource = 'grafana' | 'custom'

// Custom range configuration (both start and end are optional)
export type SpiceCustomRange = {
  start?: string; // ISO 8601 format, optional
  end?: string;   // ISO 8601 format, optional
}

export type SpiceTimeConfig = {
  rangeSource: SpiceRangeSource;
  customRange?: SpiceCustomRange; // Only present when rangeSource is 'custom'
  span: number;
  unit: SpiceSpanUnit;
  last: boolean; // true: calculate only at end, false: calculate at intervals
}

export type SpiceSpkposParam = SpiceParamBase & {
  type: 'spkpos';
  target: SpiceTarget;
  observer: SpiceTarget;
  frame: SpiceFrame;
  outputFormat: SpiceOutputFormat;
  timeConfig: SpiceTimeConfig;
}

// Legacy format from older versions (before 0e47fab)
// Used for backward compatibility when loading old panel configurations
export type LegacySpiceSpkposParam = SpiceParamBase & {
  type: 'spkpos';
  target: SpiceTarget;
  observer: SpiceTarget;
  span: number;
  unit: SpiceSpanUnit;
  last?: boolean;
  // Legacy params don't have these fields:
  // - frame
  // - outputFormat
  // - timeConfig
}

export type SpiceSpkezrParam = SpiceParamBase & {
  type: 'spkezr';
}

export type SpiceParam = SpiceSpkposParam | SpiceSpkezrParam;

// Type guard for SpiceSpkposParam
export function isSpiceSpkposParam(param: SpiceParam): param is SpiceSpkposParam {
  return param.type === 'spkpos';
}

// Type guard for legacy SpiceSpkposParam (old format without timeConfig)
export function isLegacySpkposParam(param: unknown): param is LegacySpiceSpkposParam {
  if (typeof param !== 'object' || param === null) {
    return false;
  }
  const p = param as Record<string, unknown>;
  return (
    p.type === 'spkpos' &&
    typeof p.target === 'string' &&
    typeof p.observer === 'string' &&
    typeof p.span === 'number' &&
    typeof p.unit === 'string' &&
    !('timeConfig' in p) // Key indicator: old format doesn't have timeConfig
  );
}

/**
 * Migrate a legacy SpiceSpkposParam to the current format.
 * Provides sensible defaults for new fields:
 * - frame: 'J2000' (most common reference frame)
 * - outputFormat: 'cartesian' (original behavior)
 * - rangeSource: 'grafana' (original behavior used Grafana's time range)
 */
export function migrateLegacySpkposParam(legacy: LegacySpiceSpkposParam): SpiceSpkposParam {
  return {
    type: 'spkpos',
    target: legacy.target,
    observer: legacy.observer,
    frame: 'J2000',           // Default: J2000 is the most commonly used frame
    outputFormat: 'cartesian', // Default: original behavior was cartesian output
    timeConfig: {
      rangeSource: 'grafana',  // Default: original behavior used Grafana range
      span: legacy.span,
      unit: legacy.unit,
      last: legacy.last ?? false, // Default to false if not specified
    },
  };
}

/**
 * Migrate any SpiceParam to ensure it's in the current format.
 * Returns the param unchanged if it's already in the current format,
 * or migrates it from the legacy format if necessary.
 */
export function migrateSpiceParam(param: unknown): SpiceParam {
  if (!param || typeof param !== 'object') {
    // Return default if param is invalid
    return DEFAULT_QUERY.param!;
  }

  const p = param as Record<string, unknown>;

  // Check if it's a legacy spkpos param
  if (isLegacySpkposParam(param)) {
    console.info('[SPICE] Migrating legacy panel configuration to new format');
    return migrateLegacySpkposParam(param);
  }

  // Check if it's already a valid current-format spkpos param
  if (p.type === 'spkpos' && 'timeConfig' in p) {
    // Already in current format, but ensure all required fields exist
    const spkposParam = param as Partial<SpiceSpkposParam>;
    return {
      type: 'spkpos',
      target: spkposParam.target || 'EARTH',
      observer: spkposParam.observer || 'SUN',
      frame: spkposParam.frame || 'J2000',
      outputFormat: spkposParam.outputFormat || 'cartesian',
      timeConfig: {
        rangeSource: spkposParam.timeConfig?.rangeSource || 'grafana',
        customRange: spkposParam.timeConfig?.customRange,
        span: spkposParam.timeConfig?.span ?? 1,
        unit: spkposParam.timeConfig?.unit || 'day',
        last: spkposParam.timeConfig?.last ?? false,
      },
    };
  }

  // Handle spkezr type
  if (p.type === 'spkezr') {
    return { type: 'spkezr' };
  }

  // Unknown format, return default
  console.warn('[SPICE] Unknown param format, using default:', param);
  return DEFAULT_QUERY.param!;
}

export interface SpiceQuery extends DataQuery {
  param: SpiceParam;
}

export const DEFAULT_QUERY: Partial<SpiceQuery> = {
  param: {
    type: 'spkpos',
    target: 'EARTH',
    observer: 'SUN',
    frame: 'J2000',
    outputFormat: 'cartesian',
    timeConfig: {
      rangeSource: 'grafana',
      span: 1,
      unit: 'day',
      last: false,
    },
  },
}

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

export type SpiceBodiesSource = 'json' | 'enumerate';

export type SpiceIdRange = {
  start: number;
  end: number;
};

// Default NAIF ID ranges for body enumeration
// Based on NAIF ID conventions:
// 0-10: Solar System Barycenter and planet barycenters + Sun
// 199: Mercury (no known satellites)
// 299: Venus (no known satellites)
// 301-399: Earth and its satellites
// 401-499: Mars and its satellites
// 501-599: Jupiter and its satellites
// 601-699: Saturn and its satellites
// 701-799: Uranus and its satellites
// 801-899: Neptune and its satellites
// 901-999: Pluto and its satellites
// Negative IDs: Spacecraft and missions
export const DEFAULT_ENUMERATE_RANGES: SpiceIdRange[] = [
  {start: 0, end: 10},      // Barycenters and Sun
  {start: 199, end: 199},   // Mercury
  {start: 299, end: 299},   // Venus
  {start: 301, end: 399},   // Earth and satellites (includes 399)
  {start: 401, end: 499},   // Mars and satellites (includes 499)
  {start: 501, end: 599},   // Jupiter and satellites (includes 599)
  {start: 601, end: 699},   // Saturn and satellites (includes 699)
  {start: 701, end: 799},   // Uranus and satellites (includes 799)
  {start: 801, end: 899},   // Neptune and satellites (includes 899)
  {start: 901, end: 999},   // Pluto and satellites (includes 999)
  {start: -1, end: -1000},  // Spacecraft (negative IDs, checking backwards)
];

/**
 * These are options configured for each DataSource instance
 */
export interface SpiceDataSourceOptions extends DataSourceJsonData {
	kernels?: string[];
	bodiesUrl?: string;
	bodiesSource?: SpiceBodiesSource; // How to get body list
	enumerateRanges?: SpiceIdRange[]; // ID ranges to enumerate (only when bodiesSource is 'enumerate')
	enumerateTestTimes?: string[]; // ISO 8601 date-time strings for enumerate position tests (defaults to current time if empty)
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface SpiceSecureJsonData {
  apiKey?: string;
}
