import { DEFAULT_QUERY, SpiceQuery, SpiceDataSourceOptions, SpiceBody } from './types';

describe('Types', () => {
  describe('DEFAULT_QUERY', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_QUERY.param).toBeDefined();
      expect(DEFAULT_QUERY.param?.type).toBe('spkpos');
    });

    it('should have spkpos type with correct parameters', () => {
      const param = DEFAULT_QUERY.param;

      if (param && param.type === 'spkpos') {
        expect(param.target).toBe('EARTH');
        expect(param.observer).toBe('SUN');
        expect(param.timeConfig.rangeSource).toBe('grafana');
        expect(param.timeConfig.span).toBe(1);
        expect(param.timeConfig.unit).toBe('day');
        expect(param.timeConfig.last).toBe(false);
      } else {
        fail('DEFAULT_QUERY param should be spkpos type');
      }
    });
  });

  describe('SpiceQuery', () => {
    it('should accept valid spkpos query', () => {
      const query: SpiceQuery = {
        refId: 'A',
        param: {
          type: 'spkpos',
          target: 'MARS',
          observer: 'EARTH',
          frame: 'J2000',
          outputFormat: 'cartesian',
          timeConfig: {
            rangeSource: 'grafana',
            span: 2,
            unit: 'hour',
            last: false,
          },
        },
      };

      expect(query.refId).toBe('A');
      expect(query.param.type).toBe('spkpos');
    });

    it('should accept spkpos query with custom range', () => {
      const query: SpiceQuery = {
        refId: 'B',
        param: {
          type: 'spkpos',
          target: 'MOON',
          observer: 'EARTH',
          frame: 'J2000',
          outputFormat: 'cartesian',
          timeConfig: {
            rangeSource: 'custom',
            customRange: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-01-10T00:00:00Z',
            },
            span: 1,
            unit: 'day',
            last: false,
          },
        },
      };

      expect(query.param.type).toBe('spkpos');
      if (query.param.type === 'spkpos') {
        expect(query.param.timeConfig.rangeSource).toBe('custom');
        expect(query.param.timeConfig.customRange?.start).toBe('2024-01-01T00:00:00Z');
        expect(query.param.timeConfig.customRange?.end).toBe('2024-01-10T00:00:00Z');
      }
    });

    it('should accept spkezr query', () => {
      const query: SpiceQuery = {
        refId: 'C',
        param: {
          type: 'spkezr',
        },
      };

      expect(query.param.type).toBe('spkezr');
    });

    it('should accept all valid span units', () => {
      const units: Array<'sec' | 'min' | 'hour' | 'day'> = ['sec', 'min', 'hour', 'day'];

      units.forEach((unit) => {
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
              unit: unit,
              last: false,
            },
          },
        };

        expect(query.param.type).toBe('spkpos');
        if (query.param.type === 'spkpos') {
          expect(query.param.timeConfig.unit).toBe(unit);
        }
      });
    });
  });

  describe('SpiceDataSourceOptions', () => {
    it('should accept empty kernels array', () => {
      const options: SpiceDataSourceOptions = {
        kernels: [],
      };

      expect(options.kernels).toEqual([]);
    });

    it('should accept kernels array with URLs', () => {
      const options: SpiceDataSourceOptions = {
        kernels: [
          'http://localhost:3030/kernels/lsk/naif0012.tls',
          'http://localhost:3030/kernels/spk/de432s.bsp',
        ],
      };

      expect(options.kernels).toHaveLength(2);
      expect(options.kernels![0]).toBe('http://localhost:3030/kernels/lsk/naif0012.tls');
      expect(options.kernels![1]).toBe('http://localhost:3030/kernels/spk/de432s.bsp');
    });

    it('should accept undefined kernels', () => {
      const options: SpiceDataSourceOptions = {};

      expect(options.kernels).toBeUndefined();
    });
  });

  describe('SpiceParam type guards', () => {
    it('should differentiate between spkpos and spkezr params', () => {
      const spkposQuery: SpiceQuery = {
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

      const spkezrQuery: SpiceQuery = {
        refId: 'B',
        param: {
          type: 'spkezr',
        },
      };

      expect(spkposQuery.param.type).toBe('spkpos');
      expect(spkezrQuery.param.type).toBe('spkezr');

      // Type narrowing check
      if (spkposQuery.param.type === 'spkpos') {
        expect(spkposQuery.param.target).toBeDefined();
        expect(spkposQuery.param.observer).toBeDefined();
        expect(spkposQuery.param.timeConfig).toBeDefined();
        expect(spkposQuery.param.timeConfig.rangeSource).toBeDefined();
      }

      if (spkezrQuery.param.type === 'spkezr') {
        // spkezr has no additional properties currently
        expect(spkezrQuery.param.type).toBe('spkezr');
      }
    });
  });

  describe('DataPoint interface', () => {
    it('should accept valid data point', () => {
      const dataPoint = {
        Time: Date.now(),
        Value: 123.45,
      };

      expect(dataPoint.Time).toBeGreaterThan(0);
      expect(dataPoint.Value).toBe(123.45);
    });
  });

  describe('DEFAULT_QUERY immutability', () => {
    it('should not affect DEFAULT_QUERY when creating new queries from it', () => {
      const originalParam = { ...DEFAULT_QUERY.param };

      const newQuery: Partial<SpiceQuery> = {
        ...DEFAULT_QUERY,
        param: {
          type: 'spkpos',
          target: 'MARS',
          observer: 'SUN',
          frame: 'J2000',
          outputFormat: 'cartesian',
          timeConfig: {
            rangeSource: 'grafana',
            span: 5,
            unit: 'hour',
            last: false,
          },
        },
      };

      // DEFAULT_QUERY should remain unchanged
      expect(DEFAULT_QUERY.param).toEqual(originalParam);
      expect(newQuery.param?.type).toBe('spkpos');
      if (newQuery.param?.type === 'spkpos') {
        expect(newQuery.param.target).toBe('MARS');
        expect(newQuery.param.timeConfig.span).toBe(5);
      }
    });
  });

  describe('SpiceBody interface', () => {
    it('should accept valid body definition', () => {
      const body: SpiceBody = {
        id: 399,
        name: 'EARTH',
      };

      expect(body.id).toBe(399);
      expect(body.name).toBe('EARTH');
    });

    it('should accept array of bodies', () => {
      const bodies: SpiceBody[] = [
        { id: 10, name: 'SUN' },
        { id: 399, name: 'EARTH' },
        { id: 301, name: 'MOON' },
      ];

      expect(bodies).toHaveLength(3);
      expect(bodies[0].name).toBe('SUN');
    });
  });
});
