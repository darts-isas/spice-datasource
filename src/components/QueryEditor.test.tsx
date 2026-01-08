import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryEditor } from './QueryEditor';
import { QueryEditorProps } from '@grafana/data';
import { SpiceDataSource } from '../datasource';
import { SpiceDataSourceOptions, SpiceQuery, SpiceSpkposParam, SpiceSpanUnit } from '../types';

// Mock @grafana/ui components
jest.mock('@grafana/ui', () => ({
  InlineField: ({ label, children, disabled }: any) => (
    <div data-testid="inline-field" data-label={label} data-disabled={disabled}>
      <label>{label}</label>
      {children}
    </div>
  ),
  Input: ({ value, onChange, onBlur, disabled, type, width, ...props }: any) => (
    <input
      type={type || 'text'}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      data-width={width}
      {...props}
    />
  ),
  Select: ({ options, value, onChange, disabled }: any) => {
    // Simulate Grafana Select behavior: value must be an object reference from options
    const isValueInOptions = options?.some((opt: any) => opt === value);
    const displayValue = isValueInOptions ? value?.value : '';

    return (
      <select
        value={displayValue}
        onChange={(e) => {
          const option = options?.find((opt: any) => opt.value === e.target.value);
          if (option) {
            onChange(option);
          }
        }}
        disabled={disabled}
        data-value-found={isValueInOptions}
      >
        {displayValue === '' && <option value="">Select...</option>}
        {options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )) || []}
      </select>
    );
  },
  Stack: ({ children }: any) => <div data-testid="stack">{children}</div>,
  Switch: ({ value, onChange }: any) => (
    <input
      type="checkbox"
      checked={value}
      onChange={onChange}
      data-testid="switch"
    />
  ),
}));

describe('QueryEditor', () => {
  const mockDatasource = {
    ensureBodiesLoaded: jest.fn().mockResolvedValue(undefined),
    initializeSpice: jest.fn().mockResolvedValue(undefined),
    availableBodies: [
      { id: 10, name: 'SUN' },
      { id: 399, name: 'EARTH' },
      { id: 499, name: 'MARS' },
      { id: 301, name: 'MOON' },
    ],
  } as unknown as SpiceDataSource;
  const mockOnChange = jest.fn();
  const mockOnRunQuery = jest.fn();

  const defaultQuery: SpiceQuery = {
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

  const defaultProps: QueryEditorProps<SpiceDataSource, SpiceQuery, SpiceDataSourceOptions> = {
    query: defaultQuery,
    onChange: mockOnChange,
    onRunQuery: mockOnRunQuery,
    datasource: mockDatasource,
    range: {} as any,
    data: {} as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render function selector', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Function')).toBeInTheDocument();
    });

    const functionSelect = screen.getByDisplayValue('spkpos');
    expect(functionSelect).toBeInTheDocument();
  });

  it('should render spkpos parameters when spkpos is selected', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Target')).toBeInTheDocument();
      expect(screen.getByText('Observer')).toBeInTheDocument();
      expect(screen.getByText('Range Source')).toBeInTheDocument();
      expect(screen.getByText('Span')).toBeInTheDocument();
    });
  });

  it('should update target when select changes', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Target')).toBeInTheDocument();
    });

    const fields = screen.getAllByTestId('inline-field');
    const targetField = fields.find(field => within(field).queryByText('Target'));
    expect(targetField).toBeDefined();

    const targetSelect = within(targetField!).getByRole('combobox');
    fireEvent.change(targetSelect, { target: { value: 'MARS' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultQuery,
      param: {
        ...defaultQuery.param,
        target: 'MARS',
      },
    });
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should update observer when select changes', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Observer')).toBeInTheDocument();
    });

    const fields = screen.getAllByTestId('inline-field');
    const observerField = fields.find(field => within(field).queryByText('Observer'));
    expect(observerField).toBeDefined();

    const observerSelect = within(observerField!).getByRole('combobox');
    fireEvent.change(observerSelect, { target: { value: 'EARTH' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultQuery,
      param: {
        ...defaultQuery.param,
        observer: 'EARTH',
      },
    });
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should run query when target changes', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Target')).toBeInTheDocument();
    });

    const fields = screen.getAllByTestId('inline-field');
    const targetField = fields.find(field => within(field).queryByText('Target'));
    expect(targetField).toBeDefined();

    const targetSelect = within(targetField!).getByRole('combobox');
    fireEvent.change(targetSelect, { target: { value: 'MARS' } });

    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should update span when input changes', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    const spanInput = screen.getByDisplayValue('1');
    fireEvent.change(spanInput, { target: { value: '5' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultQuery,
      param: {
        ...defaultQuery.param,
        timeConfig: {
          ...(defaultQuery.param as any).timeConfig,
          span: 5,
        },
      },
    });
  });

  it('should update unit when select changes', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('day')).toBeInTheDocument();
    });

    const unitSelect = screen.getByDisplayValue('day');
    fireEvent.change(unitSelect, { target: { value: 'hour' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultQuery,
      param: {
        ...defaultQuery.param,
        timeConfig: {
          ...(defaultQuery.param as any).timeConfig,
          unit: 'hour',
        },
      },
    });
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should change range source when selector changes', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Grafana Range')).toBeInTheDocument();
    });

    const rangeSourceSelect = screen.getByDisplayValue('Grafana Range');

    // Change to custom range
    fireEvent.change(rangeSourceSelect, { target: { value: 'custom' } });

    expect(mockOnChange).toHaveBeenCalled();
    expect(mockOnRunQuery).toHaveBeenCalled();
  });

  it('should not show span inputs when calculation mode is End Point Only', async () => {
    const queryWithLast: SpiceQuery = {
      ...defaultQuery,
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
      } as SpiceSpkposParam,
    };

    render(<QueryEditor {...defaultProps} query={queryWithLast} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('End Point Only')).toBeInTheDocument();
      // Span field should not be visible when last is true
      expect(screen.queryByLabelText('Span')).not.toBeInTheDocument();
    });
  });

  it('should change function to spkezr', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('spkpos')).toBeInTheDocument();
    });

    const functionSelect = screen.getByDisplayValue('spkpos');
    fireEvent.change(functionSelect, { target: { value: 'spkezr' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should not show spkpos parameters when spkezr is selected', async () => {
    const spkezrQuery: SpiceQuery = {
      refId: 'A',
      param: {
        type: 'spkezr',
      },
    };

    render(<QueryEditor {...defaultProps} query={spkezrQuery} />);

    await waitFor(() => {
      expect(screen.queryByText('Target')).not.toBeInTheDocument();
      expect(screen.queryByText('Observer')).not.toBeInTheDocument();
      expect(screen.queryByText('Span')).not.toBeInTheDocument();
    });
  });

  it('should handle all unit options', async () => {
    const units: SpiceSpanUnit[] = ['sec', 'min', 'hour', 'day'];

    for (const unit of units) {
      mockOnChange.mockClear();
      mockOnRunQuery.mockClear();

      // Create a query with a different unit to ensure the change is detected
      const queryWithDifferentUnit: SpiceQuery = {
        ...defaultQuery,
        param: {
          type: 'spkpos',
          target: 'EARTH',
          observer: 'SUN',
          frame: 'J2000',
          outputFormat: 'cartesian',
          timeConfig: {
            rangeSource: 'grafana',
            span: 1,
            unit: unit === 'day' ? 'sec' : 'day',
            last: false,
          },
        } as SpiceSpkposParam,
      };

      const { unmount } = render(<QueryEditor {...defaultProps} query={queryWithDifferentUnit} />);

      await waitFor(() => {
        expect(screen.getByDisplayValue(unit === 'day' ? 'sec' : 'day')).toBeInTheDocument();
      });

      const unitSelect = screen.getByDisplayValue(unit === 'day' ? 'sec' : 'day');
      fireEvent.change(unitSelect, { target: { value: unit } });

      expect(mockOnChange).toHaveBeenCalledWith({
        ...queryWithDifferentUnit,
        param: {
          ...queryWithDifferentUnit.param,
          timeConfig: {
            ...(queryWithDifferentUnit.param as any).timeConfig,
            unit,
          },
        },
      });
      expect(mockOnRunQuery).toHaveBeenCalled();

      // Clean up for next iteration
      unmount();
    }
  });

  it('should not change target if value is same', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Target')).toBeInTheDocument();
    });

    const fields = screen.getAllByTestId('inline-field');
    const targetField = fields.find(field => within(field).queryByText('Target'));
    expect(targetField).toBeDefined();

    const targetSelect = within(targetField!).getByRole('combobox');
    fireEvent.change(targetSelect, { target: { value: 'EARTH' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should not change observer if value is same', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Observer')).toBeInTheDocument();
    });

    const fields = screen.getAllByTestId('inline-field');
    const observerField = fields.find(field => within(field).queryByText('Observer'));
    expect(observerField).toBeDefined();

    const observerSelect = within(observerField!).getByRole('combobox');
    fireEvent.change(observerSelect, { target: { value: 'SUN' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should handle NaN span input gracefully', async () => {
    render(<QueryEditor {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    const spanInput = screen.getByDisplayValue('1');
    fireEvent.change(spanInput, { target: { value: 'abc' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  describe('Body list loading and selection', () => {
    it('should load available bodies on mount', async () => {
      render(<QueryEditor {...defaultProps} />);

      await waitFor(() => {
        expect(mockDatasource.initializeSpice).toHaveBeenCalled();
      });

      // Verify that body options are available in the select
      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      expect(targetField).toBeDefined();

      // The select should have all available bodies as options
      const options = within(targetField!).getAllByRole('option');
      expect(options.length).toBeGreaterThan(2); // Should have more than just EARTH and SUN

      const optionValues = options.map(opt => (opt as HTMLOptionElement).value);
      expect(optionValues).toContain('MARS');
      expect(optionValues).toContain('MOON');
    });

    it('should show selected value from available bodies', async () => {
      const queryWithMars: SpiceQuery = {
        refId: 'A',
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
            last: false,
          },
        },
      };

      render(<QueryEditor {...defaultProps} query={queryWithMars} />);

      await waitFor(() => {
        expect(screen.getByText('Target')).toBeInTheDocument();
      });

      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      const targetSelect = within(targetField!).getByRole('combobox') as HTMLSelectElement;

      // The selected value should be MARS
      expect(targetSelect.value).toBe('MARS');
    });

    it('should handle custom body values not in the list', async () => {
      const queryWithCustom: SpiceQuery = {
        refId: 'A',
        param: {
          type: 'spkpos',
          target: 'CUSTOM_BODY',
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

      render(<QueryEditor {...defaultProps} query={queryWithCustom} />);

      await waitFor(() => {
        expect(screen.getByText('Target')).toBeInTheDocument();
      });

      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      const targetSelect = within(targetField!).getByRole('combobox') as HTMLSelectElement;

      // The select should show the custom value
      expect(targetSelect.value).toBe('CUSTOM_BODY');

      // The options should include the custom value plus all available bodies
      const options = within(targetField!).getAllByRole('option');
      const optionValues = options.map(opt => (opt as HTMLOptionElement).value);
      expect(optionValues).toContain('CUSTOM_BODY');
      expect(optionValues).toContain('MARS');
    });

    it('should initialize param when query has no param', async () => {
      const queryWithoutParam: SpiceQuery = {
        refId: 'A',
      } as SpiceQuery;

      render(<QueryEditor {...defaultProps} query={queryWithoutParam} />);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(
          expect.objectContaining({
            param: expect.objectContaining({
              type: 'spkpos',
              target: 'SUN',  // First body from availableBodies
              observer: 'EARTH',  // Second body from availableBodies
            }),
          })
        );
      });
    });

    it('should use same options array for value lookup', async () => {
      // This test ensures that the Select component receives the same
      // options array instance that is used to find the selected value
      const { rerender } = render(<QueryEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Target')).toBeInTheDocument();
      });

      // Check that the value is correctly found in options (object reference match)
      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      const targetSelect = within(targetField!).getByRole('combobox') as HTMLSelectElement;

      // The select should have data-value-found="true" if value object is in options
      expect(targetSelect.getAttribute('data-value-found')).toBe('true');

      // Force a re-render
      rerender(<QueryEditor {...defaultProps} />);

      // After re-render, the value should still be correctly found
      expect(targetSelect.getAttribute('data-value-found')).toBe('true');
      expect(targetSelect.value).toBe('EARTH');
    });

    it('should detect when value object is not in options array', async () => {
      // This test verifies that our mock Select detects reference mismatches
      render(<QueryEditor {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Target')).toBeInTheDocument();
      });

      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      const targetSelect = within(targetField!).getByRole('combobox') as HTMLSelectElement;

      // With correct implementation, value should be found
      expect(targetSelect.getAttribute('data-value-found')).toBe('true');
      // And the correct value should be displayed
      expect(targetSelect.value).not.toBe('');
    });

    it('should display body list on initial load without requiring reload', async () => {
      // Simulate initial load: param is not initialized yet
      const queryWithoutParam: SpiceQuery = {
        refId: 'A',
        param: undefined as any,
      };

      render(<QueryEditor {...defaultProps} query={queryWithoutParam} />);

      // Wait for component to initialize and load bodies
      await waitFor(() => {
        expect(mockDatasource.initializeSpice).toHaveBeenCalled();
      });

      // Wait for onChange to be called with initialized param
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // Re-render with the updated query that has param initialized
      const updatedQuery = mockOnChange.mock.calls[0][0];
      render(<QueryEditor {...defaultProps} query={updatedQuery} />);

      await waitFor(() => {
        expect(screen.getByText('Target')).toBeInTheDocument();
      });

      // Get the target select
      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      expect(targetField).toBeDefined();

      const targetSelect = within(targetField!).getByRole('combobox') as HTMLSelectElement;

      // CRITICAL: The select value should be found in options even on first render
      expect(targetSelect.getAttribute('data-value-found')).toBe('true');

      // The select should display the selected value (not empty)
      expect(targetSelect.value).not.toBe('');

      // The select should have all available bodies
      const options = within(targetField!).getAllByRole('option');
      const optionValues = options.map(opt => (opt as HTMLOptionElement).value);
      expect(optionValues).toContain('EARTH');
      expect(optionValues).toContain('SUN');
      expect(optionValues).toContain('MARS');
      expect(optionValues).toContain('MOON');
    });

    it('should wait for bodies to load before initializing param with default values', async () => {
      // Simulate slow body loading
      const slowDatasource = {
        ensureBodiesLoaded: jest.fn().mockResolvedValue(undefined),
        initializeSpice: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(resolve, 100))
        ),
        availableBodies: [
          { id: 10, name: 'SUN' },
          { id: 399, name: 'EARTH' },
          { id: 499, name: 'MARS' },
        ],
      } as unknown as SpiceDataSource;

      const queryWithoutParam: SpiceQuery = {
        refId: 'A',
        param: undefined as any,
      };

      const slowOnChange = jest.fn();

      render(
        <QueryEditor
          {...defaultProps}
          datasource={slowDatasource}
          query={queryWithoutParam}
          onChange={slowOnChange}
        />
      );

      // Wait for initialization to complete
      await waitFor(() => {
        expect(slowDatasource.initializeSpice).toHaveBeenCalled();
      }, { timeout: 200 });

      // Wait for onChange to be called with initialized param
      await waitFor(() => {
        expect(slowOnChange).toHaveBeenCalled();
      }, { timeout: 200 });

      // Verify that onChange was called with param that has default values
      expect(slowOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          param: expect.objectContaining({
            type: 'spkpos',
            target: expect.any(String),
            observer: expect.any(String),
          }),
        })
      );

      // Get the actual default values set
      const paramSet = slowOnChange.mock.calls[0][0].param;

      // Verify the defaults exist in available bodies
      const availableNames = slowDatasource.availableBodies.map(b => b.name);
      expect(availableNames).toContain(paramSet.target);
      expect(availableNames).toContain(paramSet.observer);
    });

    it('should not get stuck in Loading state when onChange does not trigger immediate re-render', async () => {
      // This simulates real Grafana behavior where onChange may not immediately re-render
      const queryWithoutParam: SpiceQuery = {
        refId: 'A',
        param: undefined as any,
      };

      render(
        <QueryEditor {...defaultProps} query={queryWithoutParam} />
      );

      // Wait for bodies to load
      await waitFor(() => {
        expect(mockDatasource.ensureBodiesLoaded).toHaveBeenCalled();
      });

      // Even if onChange doesn't immediately re-render,
      // the component should not be stuck in Loading state forever
      // After a brief moment, onChange should have been called
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // Verify that onChange was called with valid param
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.param).toBeDefined();
      expect(calledWith.param.type).toBe('spkpos');
    });

    it('should display body list even when availableBodies is empty due to loading error', async () => {
      // Simulate the real issue: SPICE initialization fails (e.g., ChunkLoadError)
      // but bodies should still be loaded from JSON
      const datasourceWithError = {
        ensureBodiesLoaded: jest.fn().mockResolvedValue(undefined),
        initializeSpice: jest.fn().mockRejectedValue(new Error('ChunkLoadError: Loading chunk failed')),
        availableBodies: [
          // Even if SPICE fails, JSON-loaded bodies should be available
          { id: 10, name: 'SUN' },
          { id: 399, name: 'EARTH' },
          { id: 499, name: 'MARS' },
        ],
      } as unknown as SpiceDataSource;

      const queryWithParam: SpiceQuery = {
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

      render(
        <QueryEditor
          {...defaultProps}
          datasource={datasourceWithError}
          query={queryWithParam}
        />
      );

      // Wait for initialization to complete (even though it fails)
      await waitFor(() => {
        expect(datasourceWithError.ensureBodiesLoaded).toHaveBeenCalled();
      });

      // Should render UI (not stuck in Loading)
      await waitFor(() => {
        expect(screen.getByText('Target')).toBeInTheDocument();
      });

      // Get the target select
      const fields = screen.getAllByTestId('inline-field');
      const targetField = fields.find(field => within(field).queryByText('Target'));
      expect(targetField).toBeDefined();

      const targetSelect = within(targetField!).getByRole('combobox') as HTMLSelectElement;

      // Should show the current value
      expect(targetSelect.value).toBe('EARTH');

      // Should have bodies from JSON even though SPICE failed
      const options = within(targetField!).getAllByRole('option');
      const optionValues = options.map(opt => (opt as HTMLOptionElement).value);

      console.log('Options when SPICE fails but JSON succeeds:', optionValues);

      // Should have bodies from JSON
      expect(optionValues).toContain('EARTH');
      expect(optionValues).toContain('SUN');
      expect(optionValues).toContain('MARS');
      expect(optionValues.length).toBeGreaterThanOrEqual(3);
    });
  });
});
