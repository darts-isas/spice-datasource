import React, { ChangeEvent } from 'react'
import { Button, InlineField, Input, Select } from '@grafana/ui'
import { DataSourcePluginOptionsEditorProps, SelectableValue } from '@grafana/data'
import { SpiceDataSourceOptions, SpiceSecureJsonData, SpiceBodiesSource, DEFAULT_ENUMERATE_RANGES } from '../types'

interface Props extends DataSourcePluginOptionsEditorProps<SpiceDataSourceOptions, SpiceSecureJsonData> {}

export const ConfigEditor = (props: Props) => {
  const { onOptionsChange, options } = props
  const { jsonData } = options

  const bodiesSourceOptions: Array<SelectableValue<SpiceBodiesSource>> = [
    { label: 'Enumerate from Kernels', value: 'enumerate', description: 'Enumerate bodies from loaded SPK kernels' },
    { label: 'JSON File', value: 'json', description: 'Load body list from external JSON file' },
  ];

  const onBodiesSourceChange = (selection: SelectableValue<SpiceBodiesSource>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        bodiesSource: selection.value || 'enumerate',
      },
    })
  }

  const onBodiesUrlChange = (ev: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        bodiesUrl: ev.target.value,
      },
    })
  }

  const onKernelChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const m = ev.target.id.match(/kernel-(\d+)/)
    if (m) {
      const idx = parseInt(m[1], 10)
      const kernels = [...(jsonData.kernels||[])]
      if (0 <= idx && idx < kernels.length) {
        kernels[idx] = ev.target.value
        onOptionsChange({
          ...options,
          jsonData: {
            ...jsonData,
            kernels,
          },
        })
      }
    }
    else {
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          kernels: [...(jsonData.kernels || []), ev.target.value],
        },
      })
    }
  }

  const onKernelAdd = () => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        kernels: [...(jsonData.kernels || []), ""],
      },
    })
  }

  const onKernelRemove = (idx: number) => {
    const kernels = [...(jsonData.kernels || [])]
    kernels.splice(idx, 1)
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        kernels,
      },
    })
  }

  const onRangeChange = (idx: number, field: 'start' | 'end', value: string) => {
    const ranges = [...(jsonData.enumerateRanges || DEFAULT_ENUMERATE_RANGES)];
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      ranges[idx] = { ...ranges[idx], [field]: numValue };
      onOptionsChange({
        ...options,
        jsonData: {
          ...jsonData,
          enumerateRanges: ranges,
        },
      });
    }
  };

  const onRangeAdd = () => {
    const ranges = [...(jsonData.enumerateRanges || DEFAULT_ENUMERATE_RANGES)];
    ranges.push({ start: 0, end: 0 });
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        enumerateRanges: ranges,
      },
    });
  };

  const onRangeRemove = (idx: number) => {
    const ranges = [...(jsonData.enumerateRanges || DEFAULT_ENUMERATE_RANGES)];
    ranges.splice(idx, 1);
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        enumerateRanges: ranges,
      },
    });
  };

  const onResetRanges = () => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        enumerateRanges: DEFAULT_ENUMERATE_RANGES,
      },
    });
  };

  const onTestTimeChange = (idx: number, value: string) => {
    const times = [...(jsonData.enumerateTestTimes || [])];
    times[idx] = value;
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        enumerateTestTimes: times,
      },
    });
  };

  const onTestTimeAdd = () => {
    const times = [...(jsonData.enumerateTestTimes || [])];
    times.push(new Date().toISOString());
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        enumerateTestTimes: times,
      },
    });
  };

  const onTestTimeRemove = (idx: number) => {
    const times = [...(jsonData.enumerateTestTimes || [])];
    times.splice(idx, 1);
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        enumerateTestTimes: times,
      },
    });
  };

  const currentBodiesSource = jsonData.bodiesSource || 'enumerate';
  const showRangeConfig = currentBodiesSource === 'enumerate';

  return (
    <>
      {/* SPICE Kernels configuration */}
      <InlineField label="SPICE Kernels" labelWidth={24} interactive tooltip={'URL of the dependent kernel'}>
        <>
          { options.jsonData.kernels && options.jsonData.kernels.map((kernel, idx) => (
            <Input
              id={`kernel-${idx}`}
              key={`kernel-${idx}`}
              onChange={onKernelChange}
              value={kernel}
              placeholder="Enter the kernel uri, e.g. https://example.com/kernels/foo.json"
              width={60}
              addonAfter={<Button onClick={() => onKernelRemove(idx)}>-</Button>}
            />
          ))}
          <Button onClick={onKernelAdd}>+</Button>
        </>
      </InlineField>
      {(
        <>
          <InlineField label="Bodies Source" labelWidth={24} interactive tooltip={'How to obtain the list of available celestial bodies'}>
            <Select
              options={bodiesSourceOptions}
              value={bodiesSourceOptions.find(opt => opt.value === currentBodiesSource)}
              onChange={onBodiesSourceChange}
              width={30}
            />
          </InlineField>
          {currentBodiesSource === 'json' && (
            <InlineField label="Bodies JSON URL" labelWidth={24} interactive tooltip={'URL of the JSON file containing available bodies'}>
              <Input
                onChange={onBodiesUrlChange}
                value={jsonData.bodiesUrl || ''}
                placeholder="http://localhost:3031/spice-bodies.json"
                width={60}
              />
            </InlineField>
          )}
          {showRangeConfig && (
            <>
              <InlineField label="Enumerate Ranges" labelWidth={24} interactive tooltip={'NAIF ID ranges to enumerate (default ranges cover common bodies)'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {(jsonData.enumerateRanges || DEFAULT_ENUMERATE_RANGES).map((range, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Input
                        type="number"
                        value={range.start}
                        onChange={(e) => onRangeChange(idx, 'start', e.currentTarget.value)}
                        placeholder="Start"
                        width={15}
                      />
                      <span>to</span>
                      <Input
                        type="number"
                        value={range.end}
                        onChange={(e) => onRangeChange(idx, 'end', e.currentTarget.value)}
                        placeholder="End"
                        width={15}
                      />
                      <Button onClick={() => onRangeRemove(idx)} variant="secondary" size="sm">-</Button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button onClick={onRangeAdd} variant="secondary" size="sm">+ Add Range</Button>
                    <Button onClick={onResetRanges} variant="secondary" size="sm">Reset to Default</Button>
                  </div>
                </div>
              </InlineField>
              <InlineField label="Enumerate Test Times" labelWidth={24} interactive tooltip={'Date-time strings (ISO 8601) for testing body positions during enumeration. Leave empty to use current time. Useful for spacecraft with limited SPK coverage.'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {jsonData.enumerateTestTimes && jsonData.enumerateTestTimes.length > 0 ? (
                    jsonData.enumerateTestTimes.map((time, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Input
                          type="text"
                          value={time}
                          onChange={(e) => onTestTimeChange(idx, e.currentTarget.value)}
                          placeholder="2025-12-16T00:00:00Z"
                          width={40}
                        />
                        <Button onClick={() => onTestTimeRemove(idx)} variant="secondary" size="sm">-</Button>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontStyle: 'italic', color: '#999' }}>
                      Using current time for enumeration tests
                    </div>
                  )}
                  <Button onClick={onTestTimeAdd} variant="secondary" size="sm">+ Add Test Time</Button>
                </div>
              </InlineField>
            </>
          )}
        </>
      )}
    </>
  )
}
