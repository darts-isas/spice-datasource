import { DEFAULT_QUERY, SpiceQuery, SpiceDataSourceOptions, SpiceBody, isLegacySpkposParam, migrateLegacySpkposParam, migrateSpiceParam, LegacySpiceSpkposParam, SpiceSpkposParam } from './types';

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

  describe('Legacy panel configuration migration', () => {
    describe('isLegacySpkposParam', () => {
      it('should return true for legacy spkpos param format', () => {
        const legacyParam = {
          type: 'spkpos',
          target: 'EARTH',
          observer: 'SUN',
          span: 1,
          unit: 'day',
          last: false,
        };

        expect(isLegacySpkposParam(legacyParam)).toBe(true);
      });

      it('should return true for legacy param with optional last as undefined', () => {
        const legacyParam = {
          type: 'spkpos',
          target: 'MARS',
          observer: 'EARTH',
          span: 2,
          unit: 'hour',
        };

        expect(isLegacySpkposParam(legacyParam)).toBe(true);
      });

      it('should return false for current spkpos param format (has timeConfig)', () => {
        const currentParam = {
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
        };

        expect(isLegacySpkposParam(currentParam)).toBe(false);
      });

      it('should return false for spkezr param', () => {
        const spkezrParam = {
          type: 'spkezr',
        };

        expect(isLegacySpkposParam(spkezrParam)).toBe(false);
      });

      it('should return false for null or undefined', () => {
        expect(isLegacySpkposParam(null)).toBe(false);
        expect(isLegacySpkposParam(undefined)).toBe(false);
      });

      it('should return false for non-object values', () => {
        expect(isLegacySpkposParam('string')).toBe(false);
        expect(isLegacySpkposParam(123)).toBe(false);
        expect(isLegacySpkposParam(true)).toBe(false);
      });
    });

    describe('migrateLegacySpkposParam', () => {
      it('should migrate legacy param with all fields', () => {
        const legacyParam: LegacySpiceSpkposParam = {
          type: 'spkpos',
          target: 'EARTH',
          observer: 'SUN',
          span: 1,
          unit: 'day',
          last: true,
        };

        const migratedParam = migrateLegacySpkposParam(legacyParam);

        expect(migratedParam.type).toBe('spkpos');
        expect(migratedParam.target).toBe('EARTH');
        expect(migratedParam.observer).toBe('SUN');
        expect(migratedParam.frame).toBe('J2000');
        expect(migratedParam.outputFormat).toBe('cartesian');
        expect(migratedParam.timeConfig.rangeSource).toBe('grafana');
        expect(migratedParam.timeConfig.span).toBe(1);
        expect(migratedParam.timeConfig.unit).toBe('day');
        expect(migratedParam.timeConfig.last).toBe(true);
      });

      it('should default last to false when undefined', () => {
        const legacyParam: LegacySpiceSpkposParam = {
          type: 'spkpos',
          target: 'MARS',
          observer: 'EARTH',
          span: 2,
          unit: 'hour',
        };

        const migratedParam = migrateLegacySpkposParam(legacyParam);

        expect(migratedParam.timeConfig.last).toBe(false);
      });

      it('should preserve all original time-related values', () => {
        const legacyParam: LegacySpiceSpkposParam = {
          type: 'spkpos',
          target: 'MOON',
          observer: 'EARTH',
          span: 30,
          unit: 'min',
          last: false,
        };

        const migratedParam = migrateLegacySpkposParam(legacyParam);

        expect(migratedParam.timeConfig.span).toBe(30);
        expect(migratedParam.timeConfig.unit).toBe('min');
      });
    });

    describe('migrateSpiceParam', () => {
      it('should migrate legacy spkpos param', () => {
        const legacyParam = {
          type: 'spkpos',
          target: 'EARTH',
          observer: 'SUN',
          span: 1,
          unit: 'day',
          last: false,
        };

        const migratedParam = migrateSpiceParam(legacyParam);

        expect(migratedParam.type).toBe('spkpos');
        if (migratedParam.type === 'spkpos') {
          expect(migratedParam.frame).toBe('J2000');
          expect(migratedParam.outputFormat).toBe('cartesian');
          expect(migratedParam.timeConfig).toBeDefined();
        }
      });

      it('should return current format unchanged', () => {
        const currentParam: SpiceSpkposParam = {
          type: 'spkpos',
          target: 'MARS',
          observer: 'EARTH',
          frame: 'ECLIPJ2000',
          outputFormat: 'quaternion',
          timeConfig: {
            rangeSource: 'custom',
            customRange: { start: '2024-01-01T00:00:00Z' },
            span: 2,
            unit: 'hour',
            last: true,
          },
        };

        const result = migrateSpiceParam(currentParam);

        expect(result.type).toBe('spkpos');
        if (result.type === 'spkpos') {
          expect(result.frame).toBe('ECLIPJ2000');
          expect(result.outputFormat).toBe('quaternion');
          expect(result.timeConfig.rangeSource).toBe('custom');
          expect(result.timeConfig.customRange?.start).toBe('2024-01-01T00:00:00Z');
        }
      });

      it('should fill missing fields in current format', () => {
        const partialParam = {
          type: 'spkpos',
          target: 'EARTH',
          observer: 'SUN',
          timeConfig: {
            span: 1,
            unit: 'day',
          },
        };

        const result = migrateSpiceParam(partialParam);

        expect(result.type).toBe('spkpos');
        if (result.type === 'spkpos') {
          expect(result.frame).toBe('J2000');
          expect(result.outputFormat).toBe('cartesian');
          expect(result.timeConfig.rangeSource).toBe('grafana');
          expect(result.timeConfig.last).toBe(false);
        }
      });

      it('should handle spkezr type', () => {
        const spkezrParam = { type: 'spkezr' };

        const result = migrateSpiceParam(spkezrParam);

        expect(result.type).toBe('spkezr');
      });

      it('should return default for null param', () => {
        const result = migrateSpiceParam(null);

        expect(result).toEqual(DEFAULT_QUERY.param);
      });

      it('should return default for undefined param', () => {
        const result = migrateSpiceParam(undefined);

        expect(result).toEqual(DEFAULT_QUERY.param);
      });

      it('should return default for unknown format', () => {
        const unknownParam = { type: 'unknown', foo: 'bar' };

        const result = migrateSpiceParam(unknownParam);

        expect(result).toEqual(DEFAULT_QUERY.param);
      });
    });
  });
});
