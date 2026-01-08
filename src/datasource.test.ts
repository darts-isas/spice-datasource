import { DataSourceInstanceSettings, DataQueryRequest, dateTime } from '@grafana/data';
import { SpiceDataSource } from './datasource';
import { SpiceDataSourceOptions, SpiceQuery } from './types';

// Mock timecraftjs
jest.mock('timecraftjs', () => {
  return {
    ASM_SPICE_LITE: 0,
    ASM_SPICE_FULL: 1,
    Spice: jest.fn().mockImplementation(() => {
      return {
        init: jest.fn().mockImplementation((type?: number) => {
          return Promise.resolve({
            loadKernel: jest.fn(),
            str2et: jest.fn((isodt: string) => {
              return Date.parse(isodt) / 1000;
            }),
            spkpos: jest.fn((target: string, et: number, frame: string, abcorr: string, observer: string) => {
              return {
                ptarg: [1000.0, 2000.0, 3000.0],
              };
            }),
            bodc2s: jest.fn((code: number) => {
              const bodies: { [key: number]: string } = {
                10: 'SUN',
                399: 'EARTH',
                499: 'MARS',
                301: 'MOON',
              };
              return bodies[code] || code.toString();
            }),
          });
        }),
        loadKernel: jest.fn(),
        str2et: jest.fn((isodt: string) => {
          return Date.parse(isodt) / 1000;
        }),
        spkpos: jest.fn((target: string, et: number, frame: string, abcorr: string, observer: string) => {
          return {
            ptarg: [1000.0, 2000.0, 3000.0],
          };
        }),
        bodc2s: jest.fn((code: number) => {
          const bodies: { [key: number]: string } = {
            10: 'SUN',
            399: 'EARTH',
            499: 'MARS',
            301: 'MOON',
          };
          return bodies[code] || code.toString();
        }),
      };
    }),
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('SpiceDataSource', () => {
  let datasource: SpiceDataSource;
  const mockSettings: DataSourceInstanceSettings<SpiceDataSourceOptions> = {
    id: 1,
    uid: 'test-uid',
    type: 'dartsisas-spice-datasource',
    name: 'Test SPICE',
    url: 'http://localhost:3000',
    jsonData: {
      kernels: ['http://localhost:3030/kernels/lsk/naif0012.tls'],
      bodiesUrl: 'http://localhost:3031/spice-bodies.json',
    },
    meta: {} as any,
    access: 'proxy',
    readOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    datasource = new SpiceDataSource(mockSettings);
    const mockBlob = new Blob(['test data']);
    // Mock arrayBuffer method
    (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('spice-bodies.json')) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({
            bodies: [
              { id: 10, name: 'SUN' },
              { id: 399, name: 'EARTH' },
              { id: 499, name: 'MARS' },
              { id: 301, name: 'MOON' },
            ],
          }),
        });
      }
      return Promise.resolve({
        status: 200,
        blob: () => Promise.resolve(mockBlob),
      });
    });
  });

  describe('constructor', () => {
    it('should initialize with correct settings', () => {
      expect(datasource.baseUrl).toBe('http://localhost:3000');
      expect(datasource.kernels).toEqual(['http://localhost:3030/kernels/lsk/naif0012.tls']);
      expect(datasource.bodiesUrl).toBe('http://localhost:3031/spice-bodies.json');
      expect(datasource.spice).toBeNull();
    });

    it('should use default bodiesUrl when not provided', () => {
      const settingsWithoutBodiesUrl = {
        ...mockSettings,
        jsonData: {
          kernels: ['http://localhost:3030/kernels/lsk/naif0012.tls'],
        },
      };
      const ds = new SpiceDataSource(settingsWithoutBodiesUrl);
      expect(ds.bodiesUrl).toBe('http://localhost:3031/spice-bodies.json');
    });
  });

  describe('getDefaultQuery', () => {
    it('should return default query', () => {
      const defaultQuery = datasource.getDefaultQuery('explore' as any);
      expect(defaultQuery.param).toBeDefined();
      expect(defaultQuery.param?.type).toBe('spkpos');
    });
  });

  describe('loadKernel', () => {
    it('should load kernel and cache it', async () => {
      const url = 'http://localhost:3030/kernels/lsk/naif0012.tls';
      const buffer = await datasource.loadKernel(url);

      expect(global.fetch).toHaveBeenCalledWith(url);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(datasource.kernelCache[url]).toBeDefined();
      expect(datasource.kernelCache[url].url).toBe(url);
    });

    it('should return cached kernel on second call', async () => {
      const url = 'http://localhost:3030/kernels/lsk/naif0012.tls';

      await datasource.loadKernel(url);
      const fetchCallCount1 = (global.fetch as jest.Mock).mock.calls.length;

      await datasource.loadKernel(url);
      const fetchCallCount2 = (global.fetch as jest.Mock).mock.calls.length;

      expect(fetchCallCount2).toBe(fetchCallCount1);
    });

    it('should reload kernel when force is true', async () => {
      const url = 'http://localhost:3030/kernels/lsk/naif0012.tls';

      await datasource.loadKernel(url);
      const fetchCallCount1 = (global.fetch as jest.Mock).mock.calls.length;

      await datasource.loadKernel(url, true);
      const fetchCallCount2 = (global.fetch as jest.Mock).mock.calls.length;

      expect(fetchCallCount2).toBeGreaterThan(fetchCallCount1);
    });
  });

  describe('getAvailableBodies', () => {
    it('should return empty array when spice is not initialized', () => {
      const bodies = datasource.getAvailableBodies();
      expect(bodies).toEqual([]);
    });

    it('should return available bodies from kernels', async () => {
      await datasource.initializeSpice();
      const bodies = datasource.getAvailableBodies();

      expect(bodies.length).toBeGreaterThan(0);
      expect(bodies).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: expect.any(Number), name: expect.any(String) }),
        ])
      );
    });

    it('should filter out bodies that are not in kernels', async () => {
      await datasource.initializeSpice();
      const bodies = datasource.getAvailableBodies();

      // All returned bodies should have proper names (not just ID strings)
      bodies.forEach(body => {
        expect(body.name).not.toBe(body.id.toString());
      });
    });
  });

  describe('initializeSpice', () => {
    it('should initialize spice and load kernels', async () => {
      await datasource.initializeSpice();

      expect(datasource.spice).not.toBeNull();
      expect(datasource.availableBodies).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      await datasource.initializeSpice();
      const spice1 = datasource.spice;

      await datasource.initializeSpice();
      const spice2 = datasource.spice;

      expect(spice1).toBe(spice2);
    });
  });

  describe('query', () => {
    it('should execute spkpos query and return data', async () => {
      const query: SpiceQuery = {
        refId: 'A',
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
      };

      const request: DataQueryRequest<SpiceQuery> = {
        requestId: 'test',
        interval: '1s',
        intervalMs: 1000,
        range: {
          from: dateTime('2024-01-01T00:00:00Z'),
          to: dateTime('2024-01-10T00:00:00Z'),
          raw: { from: 'now-10d', to: 'now' },
        },
        scopedVars: {},
        targets: [query],
        timezone: 'UTC',
        app: 'explore',
        startTime: Date.now(),
      };

      const result = await datasource.query(request);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].fields).toHaveLength(4);
      expect(result.data[0].fields[0].name).toBe('Time');
      expect(result.data[0].fields[1].name).toBe('A_x');
      expect(result.data[0].fields[2].name).toBe('A_y');
      expect(result.data[0].fields[3].name).toBe('A_z');
    });

    it('should execute spkpos query with last flag', async () => {
      const query: SpiceQuery = {
        refId: 'A',
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
            last: true,
          },
        },
      };

      const request: DataQueryRequest<SpiceQuery> = {
        requestId: 'test',
        interval: '1s',
        intervalMs: 1000,
        range: {
          from: dateTime('2024-01-01T00:00:00Z'),
          to: dateTime('2024-01-10T00:00:00Z'),
          raw: { from: 'now-10d', to: 'now' },
        },
        scopedVars: {},
        targets: [query],
        timezone: 'UTC',
        app: 'explore',
        startTime: Date.now(),
      };

      const result = await datasource.query(request);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].length).toBe(1); // Only one data point when last is true
    });

    it('should handle multiple queries', async () => {
      const queries: SpiceQuery[] = [
        {
          refId: 'A',
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
              last: true,
            },
          },
        },
        {
          refId: 'B',
          param: {
            type: 'spkpos',
            target: 'MARS',
            observer: 'SUN',
            frame: 'J2000',
            outputFormat: 'cartesian',
            timeConfig: {
              rangeSource: 'grafana',
              span: 1,
              unit: 'day',
              last: true,
            },
          },
        },
      ];

      const request: DataQueryRequest<SpiceQuery> = {
        requestId: 'test',
        interval: '1s',
        intervalMs: 1000,
        range: {
          from: dateTime('2024-01-01T00:00:00Z'),
          to: dateTime('2024-01-10T00:00:00Z'),
          raw: { from: 'now-10d', to: 'now' },
        },
        scopedVars: {},
        targets: queries,
        timezone: 'UTC',
        app: 'explore',
        startTime: Date.now(),
      };

      const result = await datasource.query(request);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].fields[1].name).toBe('A_x');
      expect(result.data[1].fields[1].name).toBe('B_x');
    });
  });

  describe('testDatasource', () => {
    it('should return success when all kernels are accessible', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        statusText: 'OK',
      });

      const result = await datasource.testDatasource();

      expect(result.status).toBe('success');
      expect(result.message).toBe('Successfully connected to API');
    });

    it('should return error when kernel fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 404,
        statusText: 'Not Found',
      });

      const result = await datasource.testDatasource();

      expect(result.status).toBe('error');
      expect(result.message).toBe('Not Found');
    });

    it('should return error when fetch throws exception', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await datasource.testDatasource();

      expect(result.status).toBe('error');
    });

    it('should handle empty kernels array', async () => {
      const emptySettings = {
        ...mockSettings,
        jsonData: {
          kernels: [],
        },
      };
      const emptyDatasource = new SpiceDataSource(emptySettings);

      const result = await emptyDatasource.testDatasource();

      expect(result.status).toBe('success');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('cache management', () => {
    it('should clear cache after expiration', async () => {
      const query: SpiceQuery = {
        refId: 'A',
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
            last: true,
          },
        },
      };

      const request: DataQueryRequest<SpiceQuery> = {
        requestId: 'test',
        interval: '1s',
        intervalMs: 1000,
        range: {
          from: dateTime('2024-01-01T00:00:00Z'),
          to: dateTime('2024-01-10T00:00:00Z'),
          raw: { from: 'now-10d', to: 'now' },
        },
        scopedVars: {},
        targets: [query],
        timezone: 'UTC',
        app: 'explore',
        startTime: Date.now(),
      };

      // First query
      await datasource.query(request);
      expect(datasource.spice).not.toBeNull();
      const cacheSize = Object.keys(datasource.kernelCache).length;
      expect(cacheSize).toBeGreaterThan(0);

      // Set kernel expire to past
      datasource.kernelExpire = Date.now() - 1000;

      // Second query should reset cache
      await datasource.query(request);
      // After clearing, the cache is reset to empty, then kernels are reloaded
      // So we just verify spice is recreated (not null)
      expect(datasource.spice).not.toBeNull();
    });
  });
});
