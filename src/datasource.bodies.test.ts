import { DataSourceInstanceSettings } from '@grafana/data';
import { SpiceDataSource } from './datasource';
import { SpiceDataSourceOptions } from './types';

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
            bodc2s: jest.fn((code: number) => {
              const bodies: { [key: number]: string } = {
                0: 'SOLAR SYSTEM BARYCENTER',
                1: 'MERCURY BARYCENTER',
                2: 'VENUS BARYCENTER',
                3: 'EARTH BARYCENTER',
                4: 'MARS BARYCENTER',
                5: 'JUPITER BARYCENTER',
                6: 'SATURN BARYCENTER',
                7: 'URANUS BARYCENTER',
                8: 'NEPTUNE BARYCENTER',
                9: 'PLUTO BARYCENTER',
                10: 'SUN',
                199: 'MERCURY',
                299: 'VENUS',
                399: 'EARTH',
                301: 'MOON',
                499: 'MARS',
              };
              return bodies[code] || code.toString();
            }),
          });
        }),
        loadKernel: jest.fn(),
        bodc2s: jest.fn((code: number) => {
          const bodies: { [key: number]: string } = {
            0: 'SOLAR SYSTEM BARYCENTER',
            1: 'MERCURY BARYCENTER',
            2: 'VENUS BARYCENTER',
            3: 'EARTH BARYCENTER',
            4: 'MARS BARYCENTER',
            5: 'JUPITER BARYCENTER',
            6: 'SATURN BARYCENTER',
            7: 'URANUS BARYCENTER',
            8: 'NEPTUNE BARYCENTER',
            9: 'PLUTO BARYCENTER',
            10: 'SUN',
            199: 'MERCURY',
            299: 'VENUS',
            399: 'EARTH',
            301: 'MOON',
            499: 'MARS',
          };
          return bodies[code] || code.toString();
        }),
      };
    }),
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('SpiceDataSource - External Bodies Loading', () => {
  let datasource: SpiceDataSource;
  const mockSettings: DataSourceInstanceSettings<SpiceDataSourceOptions> = {
    id: 1,
    uid: 'test-uid',
    type: 'dartsisas-spice-datasource',
    name: 'Test SPICE',
    url: 'http://localhost:3000',
    jsonData: {
      kernels: [
        'http://localhost:3031/kernels/spk/de432s.bsp',
        'http://localhost:3031/kernels/lsk/naif0012.tls',
      ],
      bodiesUrl: 'http://localhost:3031/spice-bodies.json',
    },
    meta: {} as any,
    access: 'proxy',
    readOnly: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.error
    jest.restoreAllMocks();
  });

  describe('loadBodies', () => {
    it('should load bodies from external URL', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('spice-bodies.json')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
              bodies: [
                { id: 0, name: 'SOLAR SYSTEM BARYCENTER' },
                { id: 10, name: 'SUN' },
                { id: 399, name: 'EARTH' },
                { id: 499, name: 'MARS' },
              ],
            }),
          });
        }
        const mockBlob = new Blob(['kernel data']);
        (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
        return Promise.resolve({
          status: 200,
          blob: () => Promise.resolve(mockBlob),
        });
      });

      datasource = new SpiceDataSource(mockSettings);
      await datasource.initializeSpice();

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3031/spice-bodies.json');
      expect(datasource.bodyIds).toEqual([0, 10, 399, 499]);
      expect(datasource.availableBodies).toHaveLength(4);
      expect(datasource.availableBodies[0]).toEqual({ id: 0, name: 'SOLAR SYSTEM BARYCENTER' });
      expect(datasource.availableBodies[1]).toEqual({ id: 10, name: 'SUN' });
    });

    it('should handle empty bodies array', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('spice-bodies.json')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({ bodies: [] }),
          });
        }
        const mockBlob = new Blob(['kernel data']);
        (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
        return Promise.resolve({
          status: 200,
          blob: () => Promise.resolve(mockBlob),
        });
      });

      datasource = new SpiceDataSource(mockSettings);
      await datasource.initializeSpice();

      expect(datasource.bodyIds).toEqual([]);
      expect(datasource.availableBodies).toEqual([]);
    });

    it('should handle network error when fetching bodies', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('spice-bodies.json')) {
          return Promise.reject(new Error('Network error'));
        }
        const mockBlob = new Blob(['kernel data']);
        (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
        return Promise.resolve({
          status: 200,
          blob: () => Promise.resolve(mockBlob),
        });
      });

      datasource = new SpiceDataSource(mockSettings);
      await datasource.initializeSpice();

      // Should fall back to empty arrays when fetch fails
      expect(datasource.bodyIds).toEqual([]);
      expect(datasource.availableBodies).toEqual([]);
    });

    it('should use custom bodiesUrl from settings', async () => {
      const customSettings = {
        ...mockSettings,
        jsonData: {
          ...mockSettings.jsonData,
          bodiesUrl: 'http://custom-server:8080/bodies.json',
        },
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('bodies.json')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
              bodies: [{ id: 10, name: 'SUN' }],
            }),
          });
        }
        const mockBlob = new Blob(['kernel data']);
        (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
        return Promise.resolve({
          status: 200,
          blob: () => Promise.resolve(mockBlob),
        });
      });

      datasource = new SpiceDataSource(customSettings);
      await datasource.initializeSpice();

      expect(global.fetch).toHaveBeenCalledWith('http://custom-server:8080/bodies.json');
    });

    it('should convert body IDs to names using bodc2s', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('spice-bodies.json')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
              bodies: [
                { id: 0, name: 'SOLAR SYSTEM BARYCENTER' },
                { id: 10, name: 'SUN' },
                { id: 399, name: 'EARTH' },
                { id: 301, name: 'MOON' },
              ],
            }),
          });
        }
        const mockBlob = new Blob(['kernel data']);
        (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
        return Promise.resolve({
          status: 200,
          blob: () => Promise.resolve(mockBlob),
        });
      });

      datasource = new SpiceDataSource(mockSettings);
      await datasource.initializeSpice();

      // bodc2s should be called for each body ID
      expect(datasource.spice?.bodc2s).toHaveBeenCalledWith(0);
      expect(datasource.spice?.bodc2s).toHaveBeenCalledWith(10);
      expect(datasource.spice?.bodc2s).toHaveBeenCalledWith(399);
      expect(datasource.spice?.bodc2s).toHaveBeenCalledWith(301);

      // Names should be populated correctly
      expect(datasource.availableBodies.map(b => b.name)).toEqual([
        'SOLAR SYSTEM BARYCENTER',
        'SUN',
        'EARTH',
        'MOON',
      ]);
    });
  });

  describe('Kernel Error Handling', () => {
    it('should continue initialization when one kernel fails to load', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('spice-bodies.json')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
              bodies: [
                { id: 10, name: 'SUN' },
                { id: 399, name: 'EARTH' },
              ],
            }),
          });
        }
        if (url.includes('de432s.bsp')) {
          const mockBlob = new Blob(['kernel data']);
          (mockBlob as any).arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(8));
          return Promise.resolve({
            status: 200,
            blob: () => Promise.resolve(mockBlob),
          });
        }
        if (url.includes('naif0012.tls')) {
          return Promise.reject(new Error('Kernel not found'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      datasource = new SpiceDataSource(mockSettings);
      await datasource.initializeSpice();

      // Should still have bodies loaded despite kernel failure
      expect(datasource.availableBodies).toHaveLength(2);
      expect(datasource.availableBodies[0]).toEqual({ id: 10, name: 'SUN' });
      expect(datasource.availableBodies[1]).toEqual({ id: 399, name: 'EARTH' });
    });

    it('should handle when all kernels fail to load', async () => {
      const settingsWithMissingKernels = {
        ...mockSettings,
        jsonData: {
          kernels: [
            'http://localhost:3031/kernels/missing1.bsp',
            'http://localhost:3031/kernels/missing2.bsp',
          ],
          bodiesUrl: 'http://localhost:3031/spice-bodies.json',
        },
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('spice-bodies.json')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({
              bodies: [
                { id: 10, name: 'SUN' },
                { id: 399, name: 'EARTH' },
              ],
            }),
          });
        }
        // All kernel requests fail
        return Promise.reject(new Error('Kernel not found'));
      });

      datasource = new SpiceDataSource(settingsWithMissingKernels);
      await datasource.initializeSpice();

      // Bodies should still be loaded even if all kernels fail
      expect(datasource.availableBodies).toHaveLength(2);
    });
  });

  describe('Default bodiesUrl', () => {
    it('should use default bodiesUrl when not specified', () => {
      const settingsWithoutBodiesUrl = {
        ...mockSettings,
        jsonData: {
          kernels: mockSettings.jsonData.kernels,
        },
      };

      datasource = new SpiceDataSource(settingsWithoutBodiesUrl);

      expect(datasource.bodiesUrl).toBe('http://localhost:3031/spice-bodies.json');
    });

    it('should use provided bodiesUrl when specified', () => {
      const settingsWithCustomUrl = {
        ...mockSettings,
        jsonData: {
          ...mockSettings.jsonData,
          bodiesUrl: 'http://example.com/custom-bodies.json',
        },
      };

      datasource = new SpiceDataSource(settingsWithCustomUrl);

      expect(datasource.bodiesUrl).toBe('http://example.com/custom-bodies.json');
    });
  });
});
