import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigEditor } from './ConfigEditor';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { SpiceDataSourceOptions, SpiceSecureJsonData } from '../types';

describe('ConfigEditor', () => {
  const defaultOptions: DataSourcePluginOptionsEditorProps<SpiceDataSourceOptions, SpiceSecureJsonData>['options'] = {
    id: 1,
    uid: 'test-uid',
    orgId: 1,
    name: 'Test SPICE',
    type: 'dartsisas-spice-datasource',
    typeName: 'SPICE',
    typeLogoUrl: '',
    access: 'proxy',
    url: 'http://localhost:3000',
    user: '',
    database: '',
    basicAuth: false,
    basicAuthUser: '',
    isDefault: false,
    jsonData: {
      kernels: [],
    },
    secureJsonFields: {},
    readOnly: false,
    withCredentials: false,
    version: 1,
  };

  const mockOnOptionsChange = jest.fn();

  const defaultProps: DataSourcePluginOptionsEditorProps<SpiceDataSourceOptions, SpiceSecureJsonData> = {
    options: defaultOptions,
    onOptionsChange: mockOnOptionsChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render SPICE version selector with default lite value', () => {
    render(<ConfigEditor {...defaultProps} />);

    expect(screen.getByText('SPICE Version')).toBeInTheDocument();
    // The Select component should show "Lite (Recommended)" by default
    expect(screen.getByText('Lite (Recommended)')).toBeInTheDocument();
  });

  it('should render bodies JSON URL input field for lite version', () => {
    render(<ConfigEditor {...defaultProps} />);

    expect(screen.getByText('Bodies JSON URL')).toBeInTheDocument();
    const bodiesUrlInput = screen.getByPlaceholderText('http://localhost:3031/spice-bodies.json');
    expect(bodiesUrlInput).toBeInTheDocument();
  });

  it('should update bodiesUrl when input changes', () => {
    render(<ConfigEditor {...defaultProps} />);

    const input = screen.getByPlaceholderText('http://localhost:3031/spice-bodies.json');
    fireEvent.change(input, { target: { value: 'http://example.com/bodies.json' } });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      jsonData: {
        ...defaultOptions.jsonData,
        bodiesUrl: 'http://example.com/bodies.json',
      },
    });
  });

  it('should render kernel input field with add button', () => {
    render(<ConfigEditor {...defaultProps} />);

    expect(screen.getByText('SPICE Kernels')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+' })).toBeInTheDocument();
  });

  it('should add a new kernel field when plus button is clicked', () => {
    render(<ConfigEditor {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: '+' });
    fireEvent.click(addButton);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      jsonData: {
        ...defaultOptions.jsonData,
        kernels: [''],
      },
    });
  });

  it('should render existing kernels', () => {
    const optionsWithKernels = {
      ...defaultOptions,
      jsonData: {
        kernels: ['http://localhost:3030/kernels/lsk/naif0012.tls', 'http://localhost:3030/kernels/spk/de432s.bsp'],
      },
    };

    render(<ConfigEditor {...defaultProps} options={optionsWithKernels} />);

    const inputs = screen.getAllByPlaceholderText(/Enter the kernel uri/);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveValue('http://localhost:3030/kernels/lsk/naif0012.tls');
    expect(inputs[1]).toHaveValue('http://localhost:3030/kernels/spk/de432s.bsp');
  });

  it('should update kernel value when input changes', () => {
    const optionsWithKernels = {
      ...defaultOptions,
      jsonData: {
        kernels: [''],
      },
    };

    render(<ConfigEditor {...defaultProps} options={optionsWithKernels} />);

    const input = screen.getByPlaceholderText(/Enter the kernel uri/);
    fireEvent.change(input, { target: { value: 'http://localhost:3030/kernels/lsk/naif0012.tls' } });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...optionsWithKernels,
      jsonData: {
        ...optionsWithKernels.jsonData,
        kernels: ['http://localhost:3030/kernels/lsk/naif0012.tls'],
      },
    });
  });

  it('should remove kernel when minus button is clicked', () => {
    const optionsWithKernels = {
      ...defaultOptions,
      jsonData: {
        kernels: ['http://localhost:3030/kernels/lsk/naif0012.tls', 'http://localhost:3030/kernels/spk/de432s.bsp'],
      },
    };

    render(<ConfigEditor {...defaultProps} options={optionsWithKernels} />);

    const removeButtons = screen.getAllByRole('button', { name: '-' });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...optionsWithKernels,
      jsonData: {
        ...optionsWithKernels.jsonData,
        kernels: ['http://localhost:3030/kernels/spk/de432s.bsp'],
      },
    });
  });

  it('should handle removing kernel from middle of array', () => {
    const optionsWithKernels = {
      ...defaultOptions,
      jsonData: {
        kernels: ['kernel1.tls', 'kernel2.bsp', 'kernel3.tls'],
      },
    };

    render(<ConfigEditor {...defaultProps} options={optionsWithKernels} />);

    const removeButtons = screen.getAllByRole('button', { name: '-' });
    fireEvent.click(removeButtons[1]); // Remove middle kernel

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...optionsWithKernels,
      jsonData: {
        ...optionsWithKernels.jsonData,
        kernels: ['kernel1.tls', 'kernel3.tls'],
      },
    });
  });

  it('should handle updating specific kernel in array', () => {
    const optionsWithKernels = {
      ...defaultOptions,
      jsonData: {
        kernels: ['kernel1.tls', 'kernel2.bsp'],
      },
    };

    render(<ConfigEditor {...defaultProps} options={optionsWithKernels} />);

    const inputs = screen.getAllByPlaceholderText(/Enter the kernel uri/);
    fireEvent.change(inputs[1], { target: { value: 'updated-kernel2.bsp' } });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...optionsWithKernels,
      jsonData: {
        ...optionsWithKernels.jsonData,
        kernels: ['kernel1.tls', 'updated-kernel2.bsp'],
      },
    });
  });

  it('should handle empty kernels array', () => {
    render(<ConfigEditor {...defaultProps} />);

    const addButton = screen.getByRole('button', { name: '+' });
    expect(addButton).toBeInTheDocument();

    // Should not render any remove buttons when kernels array is empty
    const removeButtons = screen.queryAllByRole('button', { name: '-' });
    expect(removeButtons).toHaveLength(0);
  });
});
