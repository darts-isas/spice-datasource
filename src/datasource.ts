import { getBackendSrv, isFetchError } from '@grafana/runtime'
import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
} from '@grafana/data'
import { Spice, ASM_SPICE_LITE } from 'timecraftjs';

import {
  SpiceQuery,
  SpiceDataSourceOptions,
  DEFAULT_QUERY,
  DataSourceResponse,
  SpiceBody,
  isSpiceSpkposParam,
  DEFAULT_ENUMERATE_RANGES,
  SpiceIdRange
} from './types'
import { lastValueFrom } from 'rxjs'
import _ from 'lodash'

const CACHE_EXPIRE = 1000 * 60 * 60 // 1 hour

type CacheItem = {
  url: string;
  buffer: ArrayBuffer;
  expire: number;
}

export class SpiceDataSource extends DataSourceApi<SpiceQuery, SpiceDataSourceOptions> {
  spice: Spice | null;
  baseUrl: string;
  kernels: string[] = [];
  bodiesUrl: string;
  bodiesSource: 'json' | 'enumerate';
  enumerateRanges: SpiceIdRange[];
  enumerateTestTimes: string[]; // ISO 8601 date-time strings for enumerate position tests
  kernelCache: { [url: string]: CacheItem } = {};
  kernelExpire = 0;
  availableBodies: SpiceBody[] = [];
  bodyIds: number[] = [];
  bodiesFromJson: SpiceBody[] = []; // Bodies loaded from JSON (always available)
  kernelsLoaded = false; // Track whether kernels have been loaded into SPICE

  constructor(instanceSettings: DataSourceInstanceSettings<SpiceDataSourceOptions>) {
    super(instanceSettings)
    this.spice = null;
    this.baseUrl = instanceSettings.url!
    this.kernels = instanceSettings.jsonData.kernels || []
    this.bodiesUrl = instanceSettings.jsonData.bodiesUrl || 'http://localhost:3031/spice-bodies.json'
    this.bodiesSource = instanceSettings.jsonData.bodiesSource || 'enumerate'
    this.enumerateRanges = instanceSettings.jsonData.enumerateRanges || DEFAULT_ENUMERATE_RANGES
    this.enumerateTestTimes = instanceSettings.jsonData.enumerateTestTimes || []
  }

  // Convert position vector to quaternion (assuming position represents rotation axis)
  private positionToQuaternion(pos: number[]): number[] {
    const [x, y, z] = pos;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude === 0) {
      return [1, 0, 0, 0]; // Identity quaternion
    }

    // Normalize the vector
    const nx = x / magnitude;
    const ny = y / magnitude;
    const nz = z / magnitude;

    // Create quaternion from axis (using magnitude as angle)
    const halfAngle = magnitude / 2;
    const sinHalf = Math.sin(halfAngle);

    return [
      Math.cos(halfAngle),  // q0 (scalar part)
      nx * sinHalf,         // q1
      ny * sinHalf,         // q2
      nz * sinHalf          // q3
    ];
  }

  // Convert position vector to Euler angles (XYZ rotation order)
  private positionToEulerXYZ(pos: number[]): number[] {
    const [x, y, z] = pos;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude === 0) {
      return [0, 0, 0];
    }

    // Calculate Euler angles from position vector
    const pitch = Math.asin(z / magnitude);
    const yaw = Math.atan2(y, x);
    const roll = 0; // Roll is undetermined from position alone

    return [roll, pitch, yaw];
  }

  // Convert position vector to Euler angles (ZYX rotation order)
  private positionToEulerZYX(pos: number[]): number[] {
    const [x, y, z] = pos;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude === 0) {
      return [0, 0, 0];
    }

    // Calculate Euler angles from position vector (ZYX order)
    const yaw = Math.atan2(y, x);
    const pitch = Math.asin(z / magnitude);
    const roll = 0; // Roll is undetermined from position alone

    return [yaw, pitch, roll];
  }

  // Convert position vector to Euler angles (ZXZ rotation order)
  private positionToEulerZXZ(pos: number[]): number[] {
    const [x, y, z] = pos;
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude === 0) {
      return [0, 0, 0];
    }

    // Calculate Euler angles from position vector (ZXZ order)
    const nutation = Math.acos(z / magnitude);
    const precession = Math.atan2(y, x);
    const spin = 0; // Spin is undetermined from position alone

    return [precession, nutation, spin];
  }

  getDefaultQuery(_: CoreApp): Partial<SpiceQuery> {
    return DEFAULT_QUERY;
  }

  async loadKernel(url: string, force = false): Promise<ArrayBuffer> {
    if (url in this.kernelCache && !force) {
      const item = this.kernelCache[url]
      if (item.expire < Date.now()) {
        delete this.kernelCache[url]
      } else {
        return item.buffer
      }
    }

    const res = await fetch(url)
    const blob = await res.blob()
    const buffer = await blob.arrayBuffer()
    this.kernelCache[url] = {
      url, buffer,
      expire: Date.now() + CACHE_EXPIRE,
    }
    return buffer
  }

  async loadBodies(): Promise<void> {
    try {
      const res = await fetch(this.bodiesUrl);
      const data = await res.json();
      this.bodyIds = data.bodies.map((b: SpiceBody) => b.id);
      this.bodiesFromJson = data.bodies; // Store complete body info from JSON
    } catch (err) {
      console.error('Failed to load bodies configuration:', err);
      this.bodyIds = [];
      this.bodiesFromJson = [];
    }
  }

  async initializeSpice(): Promise<void> {
    // Load bodies from JSON if using JSON source
    if (this.bodiesSource === 'json') {
      await this.ensureBodiesLoaded();
    }

    if (this.spice === null) {
      this.spice = await new Spice().init(ASM_SPICE_LITE);
      this.kernelsLoaded = false; // Reset flag when creating new SPICE instance
    }

    // Load kernels only if not already loaded
    if (this.spice !== null && !this.kernelsLoaded) {
      for (let kernel of this.kernels.filter(k => !!k)) {
        try {
          const buf = await this.loadKernel(kernel)
          this.spice.loadKernel(buf);
        } catch (err) {
          console.error('Failed to load kernel:', kernel, err)
          // Continue with other kernels even if one fails
        }
      }
      this.kernelsLoaded = true;
    }

    // Update available bodies after kernels are loaded
    if (this.spice !== null && this.kernelsLoaded) {
      this.availableBodies = this.getAvailableBodies();
    }
  }

  async ensureBodiesLoaded(): Promise<void> {
    // Load body IDs from external JSON if not already loaded
    // Only used when bodiesSource is 'json'
    if (this.bodyIds.length === 0) {
      await this.loadBodies();
      // Update availableBodies with JSON data immediately
      this.availableBodies = this.getAvailableBodies();
    }
  }

  getAvailableBodies(): SpiceBody[] {
    if (!this.spice) {
      // If SPICE is not initialized (e.g., due to kernel loading errors),
      // fall back to bodies from JSON
      return this.bodiesFromJson;
    }

    const bodies: SpiceBody[] = [];

    // Check if we should enumerate body IDs from kernels
    if (this.bodiesSource === 'enumerate' && this.spice.module) {
      try {
        const kernelBodyIds = this.getBodyIdsFromKernels();
        if (kernelBodyIds.length > 0) {
          // Use kernel-derived IDs
          for (let id of kernelBodyIds) {
            try {
              const name = this.spice.bodc2s(id);
              if (name && name !== id.toString()) {
                bodies.push({ id, name });
              }
            } catch (err) {
              continue;
            }
          }
          return bodies;
        }
      } catch (err) {
        console.error('Failed to get body IDs from kernels:', err);
        // Fall through to JSON-based approach
      }
    }

    // Use JSON-based body IDs
    for (let id of this.bodyIds) {
      try {
        const name = this.spice.bodc2s(id);
        // bodc2s returns the ID as string if no name mapping exists
        // Only add if we got a proper name (not just the number)
        if (name && name !== id.toString()) {
          bodies.push({ id, name });
        }
      } catch (err) {
        // Body ID not available in current kernels, skip it
        continue;
      }
    }
    return bodies;
  }

  /**
   * Validate if a body name or ID exists in the loaded SPICE kernels
   * and has sufficient SPK data for position calculations.
   * Returns true if the body is valid and has SPK data, false otherwise.
   */
  validateBody(nameOrId: string): boolean {
    if (!this.spice?.module) {
      return false;
    }

    try {
      // Try to convert name to ID (or validate ID)
      const result = this.spice.bodn2c(nameOrId);

      if (!result || result.found !== 1) {
        return false;
      }

      const id = result.code;

      // If successful, verify the body has data by trying to convert back
      const name = this.spice.bodc2s(id);

      // Valid if we got a proper name (not just the ID as string)
      if (!name || name === id.toString()) {
        return false;
      }

      // Check if SPK data actually exists for this body
      // We need to verify that at least one loaded SPK file contains data for this body
      const module = this.spice.module;
      const countPtr = module._malloc(4);

      try {
        module.ccall('ktotal_c', null, ['string', 'number'], ['SPK', countPtr]);
        const spkCount = module.getValue(countPtr, 'i32');

        if (spkCount === 0) {
          return false;
        }

        // The most reliable way to check if a body has SPK data is to try
        // a test calculation. Use J2000 epoch and current time to catch more bodies
        // ET = 0.0 is J2000 epoch (2000-01-01 12:00:00)
        // Current ET helps find active spacecraft like BepiColombo
        const currentEt = (Date.now() / 1000) - 946728000; // J2000 epoch in Unix time
        const testEts = [0.0, currentEt];

        for (const testEt of testEts) {
          try {
            // Clear SPICE errors before this test
            module.ccall('reset_c', null, [], []);

            // Try spkpos with this test time
            const testResult = this.spice.spkpos(
              nameOrId,
              testEt,
              'J2000',
              'NONE',
              'SOLAR SYSTEM BARYCENTER'
            );

            // Check if SPICE reported an error
            const failed = module.ccall('failed_c', 'number', [], []);
            if (failed) {
              module.ccall('reset_c', null, [], []);
              continue; // Try next epoch
            }

            if (testResult && testResult.ptarg) {
              return true;
            }
          } catch (testErr) {
            // Try next time if available
            continue;
          }
        }

        return false;
      } finally {
        module._free(countPtr);
      }
    } catch (err) {
      return false;
    }
  }

  /**
   * Get body IDs directly from loaded SPK kernels using enumeration.
   */
  private getBodyIdsFromKernels(): number[] {
    if (!this.spice?.module) {
      return [];
    }

    return this.getBodyIdsUsingEnumeration();
  }

  /**
   * Get body IDs using brute-force enumeration with bodc2n_c.
   * This method checks configured ID ranges and verifies each ID has actual SPK data
   * by attempting a test position calculation.
   */
  private getBodyIdsUsingEnumeration(): number[] {
    if (!this.spice?.module) {
      return [];
    }

    const module = this.spice.module;
    const bodyIds: Set<number> = new Set();

    try {
      // Verify SPK files are loaded
      const countPtr = module._malloc(4);
      try {
        module.ccall('ktotal_c', null, ['string', 'number'], ['SPK', countPtr]);
        const count = module.getValue(countPtr, 'i32');
        if (count === 0) {
          return [];
        }
      } finally {
        module._free(countPtr);
      }

      const namePtr = module._malloc(256);
      const foundPtr = module._malloc(4);

      try {

        // Completely disable SPICE error reporting and tracing
        // Set error action to RETURN (continue execution without aborting)
        const errActionPtr = module._malloc(32);
        const errDevicePtr = module._malloc(32);
        try {
          // Set error action to RETURN
          'SET'.split('').forEach((c, i) => module.setValue(errActionPtr + i, c.charCodeAt(0), 'i8'));
          module.setValue(errActionPtr + 3, 0, 'i8');
          'RETURN'.split('').forEach((c, i) => module.setValue(errActionPtr + 4 + i, c.charCodeAt(0), 'i8'));
          module.setValue(errActionPtr + 10, 0, 'i8');
          module.ccall('erract_c', null, ['number', 'number', 'number'], [errActionPtr, 32, errActionPtr + 4]);

          // Disable error output
          'SET'.split('').forEach((c, i) => module.setValue(errDevicePtr + i, c.charCodeAt(0), 'i8'));
          module.setValue(errDevicePtr + 3, 0, 'i8');
          'NULL'.split('').forEach((c, i) => module.setValue(errDevicePtr + 4 + i, c.charCodeAt(0), 'i8'));
          module.setValue(errDevicePtr + 8, 0, 'i8');
          module.ccall('errdev_c', null, ['number', 'number', 'number'], [errDevicePtr, 32, errDevicePtr + 4]);

          // Disable error tracing
          module.ccall('trcoff_c', null, [], []);
        } finally {
          module._free(errActionPtr);
          module._free(errDevicePtr);
        }

        // Create string buffer for frame name
        const frameNamePtr = module._malloc(32);
        'J2000'.split('').forEach((c, i) => module.setValue(frameNamePtr + i, c.charCodeAt(0), 'i8'));
        module.setValue(frameNamePtr + 5, 0, 'i8');

        // Check each configured ID range
        for (const range of this.enumerateRanges) {
          const start = range.start;
          const end = range.end;
          const increment = start <= end ? 1 : -1;

          for (let id = start; increment > 0 ? id <= end : id >= end; id += increment) {

            // Clear buffers before use
            for (let i = 0; i < 256; i++) {
              module.setValue(namePtr + i, 0, 'i8');
            }
            module.setValue(foundPtr, 0, 'i32');

            // Check if this body ID has a name mapping
            module.ccall('bodc2n_c', null, ['number', 'number', 'number', 'number'], [id, 256, namePtr, foundPtr]);

            const found = module.getValue(foundPtr, 'i32');
            if (found === 1) {
              // Get body name
              const bodyName = module.UTF8ToString(namePtr);

              // Try to compute position using spkpos_c at multiple epochs
              // Use J2000 epoch and current time to catch more bodies
              // ET = 0.0 is J2000 epoch (2000-01-01 12:00:00)
              // Current ET helps find active spacecraft like BepiColombo
              const currentEt = (Date.now() / 1000) - 946728000; // J2000 epoch in Unix time
              const testEts = [0.0, currentEt];

              const ptargPtr = module._malloc(24); // 3 doubles
              const ltPtr = module._malloc(8); // 1 double
              const bodyNamePtr = module._malloc(bodyName.length + 1);
              const abcorrPtr = module._malloc(5);
              const obsNamePtr = module._malloc(24); // "SOLAR SYSTEM BARYCENTER"

              try {
                let foundAtAnyEpoch = false;

                for (const testEt of testEts) {
                  // Clear any previous errors
                  module.ccall('reset_c', null, [], []);

                  // Set body name string
                  bodyName.split('').forEach((c: string, i: number) => module.setValue(bodyNamePtr + i, c.charCodeAt(0), 'i8'));
                  module.setValue(bodyNamePtr + bodyName.length, 0, 'i8');

                  // Set aberration correction string
                  'NONE'.split('').forEach((c: string, i: number) => module.setValue(abcorrPtr + i, c.charCodeAt(0), 'i8'));
                  module.setValue(abcorrPtr + 4, 0, 'i8');

                  // Set observer name string
                  'SOLAR SYSTEM BARYCENTER'.split('').forEach((c: string, i: number) => module.setValue(obsNamePtr + i, c.charCodeAt(0), 'i8'));
                  module.setValue(obsNamePtr + 23, 0, 'i8');

                  // Try spkpos_c
                  module.ccall(
                    'spkpos_c',
                    null,
                    ['number', 'number', 'number', 'number', 'number', 'number', 'number'],
                    [bodyNamePtr, testEt, frameNamePtr, abcorrPtr, obsNamePtr, ptargPtr, ltPtr]
                  );

                  // Check if error occurred
                  const failed = module.ccall('failed_c', 'number', [], []);
                  if (!failed) {
                    // Success - this body has SPK data at this epoch
                    foundAtAnyEpoch = true;
                    break; // No need to test other epochs
                  }

                  // Clear errors for next test
                  module.ccall('reset_c', null, [], []);
                }

                if (foundAtAnyEpoch) {
                  bodyIds.add(id);
                }

                // Always clear errors
                module.ccall('reset_c', null, [], []);
              } catch (err) {
                try {
                  module.ccall('reset_c', null, [], []);
                } catch {}
              } finally {
                module._free(bodyNamePtr);
                module._free(abcorrPtr);
                module._free(obsNamePtr);
                module._free(ptargPtr);
                module._free(ltPtr);
              }
            }
          }
        }

        module._free(frameNamePtr);
      } finally {
        module._free(namePtr);
        module._free(foundPtr);
      }
    } catch (err) {
      console.error('Error getting body IDs from kernels:', err);
      return [];
    }

    return Array.from(bodyIds).sort((a, b) => a - b);
  }

  async query(options: DataQueryRequest<SpiceQuery>): Promise<DataQueryResponse> {
    if (this.kernelExpire < Date.now()) {
      this.kernelCache = {}
      this.kernelExpire = Date.now() + CACHE_EXPIRE
      this.spice = null // reset spice
      this.availableBodies = [];
      this.kernelsLoaded = false; // Reset kernels loaded flag
    }
    await this.initializeSpice();
    if (this.spice === null) {
      throw Error("Can't initiate SPICE");
    }

    const { range } = options
    const from = range!.from.valueOf()
    const to = range!.to.valueOf()

    // Return a constant for each query.
    const data = options.targets.map((target): DataFrame => {
      const times: number[] = []
      const values: number[][] = [] // Store values as arrays for flexible output formats

      switch (target.param.type) {
        case 'spkpos': {
          if (!isSpiceSpkposParam(target.param)) {
            break;
          }
          const spkposParam = target.param; // Save for use in closure
          const timeConfig = spkposParam.timeConfig;

          // Determine the time range to use
          let rangeFrom: number;
          let rangeTo: number;

          if (timeConfig.rangeSource === 'custom' && timeConfig.customRange) {
            const customRange = timeConfig.customRange;

            // Parse custom range times
            const startTime = customRange.start ? new Date(customRange.start).valueOf() : null;
            const endTime = customRange.end ? new Date(customRange.end).valueOf() : null;

            // If only one is specified, use it as a single point
            if (startTime && !endTime) {
              rangeFrom = rangeTo = startTime;
            } else if (!startTime && endTime) {
              rangeFrom = rangeTo = endTime;
            } else if (startTime && endTime) {
              rangeFrom = startTime;
              rangeTo = endTime;
            } else {
              // Neither specified, fall back to Grafana range
              rangeFrom = from;
              rangeTo = to;
            }
          } else {
            // Use Grafana UI range
            rangeFrom = from;
            rangeTo = to;
          }

          // Determine step size and number of steps based on time mode
          const calculatePosition = (epochMillis: number): number[] | null => {
            try {
              const et = this.spice!.str2et(new Date(epochMillis).toISOString().replace('Z', ''));

              if (et === null) {
                return null;
              }

              const result = this.spice!.spkpos(
                spkposParam.target,
                et,
                spkposParam.frame,
                'NONE',
                spkposParam.observer
              );

              // Check if SPICE reported an error
              const module = this.spice!.module!;
              const failed = module.ccall('failed_c', 'number', [], []);
              if (failed) {
                const msgPtr = module._malloc(1841);
                try {
                  module.ccall('getmsg_c', null, ['string', 'number', 'number'], ['LONG', 1841, msgPtr]);
                  const errorMsg = module.UTF8ToString(msgPtr);
                  console.error('[calculatePosition] SPICE error:', errorMsg);
                } finally {
                  module._free(msgPtr);
                }
                module.ccall('reset_c', null, [], []);
                return null;
              }

              if (result) {
                const { ptarg } = result;
                const pos = [ptarg[0], ptarg[1], ptarg[2]];

                // Convert based on output format
                switch (spkposParam.outputFormat) {
                  case 'quaternion':
                    return this.positionToQuaternion(pos);
                  case 'euler_xyz':
                    return this.positionToEulerXYZ(pos);
                  case 'euler_zyx':
                    return this.positionToEulerZYX(pos);
                  case 'euler_zxz':
                    return this.positionToEulerZXZ(pos);
                  case 'cartesian':
                  default:
                    return pos;
                }
              }
            } catch (err) {
              console.error('SPICE calculation error:', err);
              // Don't reset spice - just return null for this calculation
              // This allows recovery when switching back to valid bodies
            }

            return null;
          };

          // Execute based on last flag
          if (timeConfig.last) {
            // Calculate only at the end of time range
            const result = calculatePosition(rangeTo);
            if (result) {
              times.push(rangeTo);
              values.push(result);
            }
          } else {
            // Calculate over time range with specified span
            let current = rangeTo;
            let span = timeConfig.span;
            switch (timeConfig.unit) {
              case 'sec': span *= 1000; break;
              case 'min': span *= 1000 * 60; break;
              case 'hour': span *= 1000 * 60 * 60; break;
              case 'day': span *= 1000 * 60 * 60 * 24; break;
            }

            while (rangeFrom <= current) {
              const result = calculatePosition(current);
              if (!result) {
                break; // Stop if SPICE calculation fails
              }

              times.unshift(current);
              values.unshift(result);
              current -= span;
            }
          }
          break;
        }
        default: {
          const span = (to - from) / 9
          for (let i = 0; i < 10; i++) {
            const current = to - span * i

            times.unshift(current)
            values.unshift([(Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 5, (Math.random() * 2 - 1) * 5])
          }
        }
      }

      // Determine field names based on output format
      let fieldNames: string[];
      const outputFormat = target.param.type === 'spkpos' ? target.param.outputFormat : 'cartesian';

      switch (outputFormat) {
        case 'quaternion':
          fieldNames = ['q0', 'q1', 'q2', 'q3'];
          break;
        case 'euler_xyz':
          fieldNames = ['roll', 'pitch', 'yaw'];
          break;
        case 'euler_zyx':
          fieldNames = ['yaw', 'pitch', 'roll'];
          break;
        case 'euler_zxz':
          fieldNames = ['precession', 'nutation', 'spin'];
          break;
        case 'cartesian':
        default:
          fieldNames = ['x', 'y', 'z'];
      }

      // Extract individual component arrays from values
      const numComponents = values.length > 0 ? values[0].length : fieldNames.length;
      const componentArrays: number[][] = Array.from({ length: numComponents }, () => []);

      for (const valueSet of values) {
        for (let i = 0; i < numComponents; i++) {
          componentArrays[i].push(valueSet[i] || 0);
        }
      }

      // Create fields dynamically
      const fields = [
        { name: 'Time', values: times, type: FieldType.time, config: {} },
        ...componentArrays.map((values, index) => ({
          name: `${target.refId}_${fieldNames[index] || index}`,
          values: values,
          type: FieldType.number,
          config: {}
        }))
      ];

      return {
        fields,
        length: times.length,
      }
    })

    return { data }
  }

  async requestDatasource(url: string, params?: string) {
    const response = getBackendSrv().fetch<DataSourceResponse>({
      url: `${this.baseUrl}${url}${params?.length ? `?${params}` : ''}`,
    });
    return lastValueFrom(response);
  }

  /**
   * Checks whether we can connect to the API.
   */
  async testDatasource() {
    const defaultErrorMessage = 'Cannot connect to API';

    for (let kernel of this.kernels.filter(k => !!k)) {
      try {
        const res = await fetch(kernel)
        if (res.status !== 200) {
          return {
            status: 'error',
            message: res.statusText ? res.statusText : defaultErrorMessage,
          }
        }
      }
      catch (err) {
        let message = '';
        if (_.isString(err)) {
          message = err
        }
        else if (isFetchError(err)) {
          message = 'Fetch error: ' + (err.statusText ? err.statusText : defaultErrorMessage)
          if (err.data && err.data.error && err.data.error.code) {
            message += ': ' + err.data.error.code + '. ' + err.data.error.message
          }
        }
        return {
          status: 'error',
          message,
        }
      }
    }

    return {
      status: 'success',
      message: 'Successfully connected to API',
    }
  }
}
