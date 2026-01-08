import React, { useState, useEffect } from 'react'
import { InlineField, Input, Select, Stack } from '@grafana/ui'
import { QueryEditorProps, SelectableValue } from '@grafana/data'
import { SpiceDataSource } from '../datasource'
import { SpiceDataSourceOptions, SpiceQuery, SpiceBody, SpiceFrame, SpiceOutputFormat, SpiceRangeSource, migrateSpiceParam, isLegacySpkposParam } from '../types'

type Props = QueryEditorProps<SpiceDataSource, SpiceQuery, SpiceDataSourceOptions>

export const QueryEditor = ({ query, onChange, onRunQuery, datasource }: Props) => {
  const { param } = query
  const [availableBodies, setAvailableBodies] = useState<SpiceBody[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [targetValid, setTargetValid] = useState<boolean | null>(null)
  const [observerValid, setObserverValid] = useState<boolean | null>(null)

  // Load available bodies when component mounts or datasource changes
  useEffect(() => {
    const loadBodies = async () => {
      setIsLoading(true)
      try {
        // Load bodies from JSON if using JSON source
        if (datasource.bodiesSource === 'json') {
          await datasource.ensureBodiesLoaded()
        }

        // Initialize SPICE (loads kernels and populates availableBodies)
        await datasource.initializeSpice()

        // Update available bodies from what was successfully loaded
        setAvailableBodies(datasource.availableBodies)
      } catch (err) {
        console.error('Failed to load available bodies:', err)
        // Even if SPICE init fails, we might have bodies from JSON
        setAvailableBodies(datasource.availableBodies)
      } finally {
        setIsLoading(false)
      }
    }
    loadBodies()
  }, [datasource])

  // Initialize param with default values AFTER bodies are loaded
  // Also handles migration from legacy panel configurations
  useEffect(() => {
    // Only initialize if loading is complete and param is not set
    if (isLoading) {
      return
    }

    // Check if we need to migrate legacy configuration
    if (query.param && isLegacySpkposParam(query.param)) {
      // Migrate legacy format to current format
      const migratedParam = migrateSpiceParam(query.param)
      onChange({
        ...query,
        param: migratedParam,
      })
      return
    }

    if (!query.param || !query.param.type) {
      const bodies = availableBodies
      const defaultTarget = bodies.length > 0 ? bodies[0].name : 'EARTH'
      const defaultObserver = bodies.length > 1
        ? bodies.find(b => b.name !== defaultTarget)?.name || bodies[0].name
        : 'SUN'

      onChange({
        ...query,
        param: {
          type: 'spkpos',
          target: defaultTarget,
          observer: defaultObserver,
          frame: 'J2000',
          outputFormat: 'cartesian',
          timeConfig: {
            rangeSource: 'grafana',
            span: 1,
            unit: 'day',
            last: false,
          },
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, availableBodies])

  // Validate target and observer when they change
  useEffect(() => {
    if (!param || param.type !== 'spkpos') {
      setTargetValid(null)
      setObserverValid(null)
      return
    }

    if (param.target) {
      const isValid = datasource.validateBody(param.target)
      setTargetValid(isValid)
    } else {
      setTargetValid(null)
    }

    if (param.observer) {
      const isValid = datasource.validateBody(param.observer)
      setObserverValid(isValid)
    } else {
      setObserverValid(null)
    }
  }, [param, datasource])

  const bodyOptions: Array<SelectableValue<string>> = availableBodies.map(body => ({
    label: body.name,
    value: body.name,
    description: `ID: ${body.id}`,
  }))

  // Show loading only while bodies are being loaded
  if (isLoading) {
    return <div>Loading...</div>
  }

  // Use param or create a temporary default for rendering
  // This prevents getting stuck in Loading state if onChange doesn't immediately trigger re-render
  const effectiveParam = param && param.type ? param : {
    type: 'spkpos' as const,
    target: availableBodies.length > 0 ? availableBodies[0].name : 'EARTH',
    observer: availableBodies.length > 1
      ? availableBodies.find(b => b.name !== (availableBodies[0]?.name))?.name || availableBodies[0].name
      : 'SUN',
    frame: 'J2000' as const,
    outputFormat: 'cartesian' as const,
    timeConfig: {
      rangeSource: 'grafana' as const,
      span: 1,
      unit: 'day' as const,
      last: false,
    },
  }

  // For spkpos, we need target and observer options
  // IMPORTANT: Create options arrays once and reuse same instances for value lookup
  const targetOptions = effectiveParam.type === 'spkpos' && effectiveParam.target ? (
    bodyOptions.some(opt => opt.value === effectiveParam.target)
      ? bodyOptions
      : [{ label: effectiveParam.target, value: effectiveParam.target, description: 'Custom' }, ...bodyOptions]
  ) : bodyOptions

  const observerOptions = effectiveParam.type === 'spkpos' && effectiveParam.observer ? (
    bodyOptions.some(opt => opt.value === effectiveParam.observer)
      ? bodyOptions
      : [{ label: effectiveParam.observer, value: effectiveParam.observer, description: 'Custom' }, ...bodyOptions]
  ) : bodyOptions

  const targetValue = effectiveParam.type === 'spkpos' && effectiveParam.target
    ? targetOptions.find(opt => opt.value === effectiveParam.target)
    : undefined

  const observerValue = effectiveParam.type === 'spkpos' && effectiveParam.observer
    ? observerOptions.find(opt => opt.value === effectiveParam.observer)
    : undefined

  // Unit options - keep same instance for reference equality
  const unitOptions = [
    { label: 'sec', value: 'sec' },
    { label: 'min', value: 'min' },
    { label: 'hour', value: 'hour' },
    { label: 'day', value: 'day' },
  ] as const

  // Frame options - common SPICE reference frames
  const frameOptions = [
    { label: 'J2000', value: 'J2000', description: 'Earth Mean Equator and Equinox of J2000' },
    { label: 'ECLIPJ2000', value: 'ECLIPJ2000', description: 'Ecliptic coordinates based on J2000' },
    { label: 'GALACTIC', value: 'GALACTIC', description: 'Galactic System II coordinates' },
    { label: 'IAU_EARTH', value: 'IAU_EARTH', description: 'Earth body-fixed frame' },
    { label: 'IAU_MARS', value: 'IAU_MARS', description: 'Mars body-fixed frame' },
    { label: 'IAU_SUN', value: 'IAU_SUN', description: 'Sun body-fixed frame' },
  ] as const

  // Output format options
  const outputFormatOptions = [
    { label: 'Cartesian (x,y,z)', value: 'cartesian', description: 'Position as x, y, z coordinates' },
    { label: 'Quaternion', value: 'quaternion', description: 'Rotation as quaternion (q0,q1,q2,q3)' },
    { label: 'Euler XYZ', value: 'euler_xyz', description: 'Rotation as Euler angles (roll, pitch, yaw)' },
    { label: 'Euler ZYX', value: 'euler_zyx', description: 'Rotation as Euler angles (yaw, pitch, roll)' },
    { label: 'Euler ZXZ', value: 'euler_zxz', description: 'Rotation as Euler angles (precession, nutation, spin)' },
  ] as const

  // Range source options
  const rangeSourceOptions = [
    { label: 'Grafana Range', value: 'grafana', description: 'Use time range from Grafana UI' },
    { label: 'Custom Range', value: 'custom', description: 'Specify custom time range' },
  ] as const

  // Calculation mode options
  const calculationOptions = [
    { label: 'Span Intervals', value: 'span' },
    { label: 'End Point Only', value: 'last' },
  ] as const

  // Function type options - keep same instance for reference equality
  const typeOptions = [
    { label: 'spkpos', value: 'spkpos' },
    { label: 'spkezr', value: 'spkezr' },
  ] as const

  const typeValue = effectiveParam ? typeOptions.find(opt => opt.value === effectiveParam.type) : undefined

  const onSelectType = (v: SelectableValue<string>) => {
    switch(v.value) {
      case 'spkpos': {
        // Use first available body as default, or fallback to common names
        const defaultTarget = availableBodies.length > 0 ? availableBodies[0].name : 'EARTH'
        const defaultObserver = availableBodies.length > 1 ? availableBodies.find(b => b.name !== defaultTarget)?.name || availableBodies[0].name : 'SUN'

        onChange({
          ...query,
          param: {
            type: v.value,
            target: defaultTarget,
            observer: defaultObserver,
            frame: 'J2000',
            outputFormat: 'cartesian',
            timeConfig: {
              rangeSource: 'grafana',
              span: 1,
              unit: 'day',
              last: false,
            },
          }
        })
      } break
      case 'spkezr': {
        onChange({
          ...query,
          param: {
            type: v.value,
          }
        })
      } break
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Function selection */}
      <Stack gap={0}>
        <InlineField label="Function">
          <Select
            options={typeOptions as unknown as Array<SelectableValue<'spkpos' | 'spkezr'>>}
            value={typeValue}
            onChange={onSelectType}
          />
        </InlineField>
      </Stack>

      {effectiveParam && effectiveParam.type === 'spkpos' && (
        <>
          {/* Target and Observer row */}
          <Stack gap={0}>
            <InlineField
              label="Target"
              invalid={targetValid === false}
              style={{
                borderLeft: targetValid === true ? '3px solid #52c41a' : targetValid === false ? '3px solid #f5222d' : undefined,
                paddingLeft: targetValid !== null ? '8px' : undefined,
              }}
            >
              <Select
                width={16}
                options={targetOptions}
                value={targetValue}
                onChange={(ev) => {
                  if (!ev.value) { return }
                  if (ev.value === effectiveParam.target) { return }
                  onChange({...query, param: { ...effectiveParam, target: ev.value }})
                  if (effectiveParam.observer) {
                    onRunQuery()
                  }
                }}
                allowCustomValue={true}
                isLoading={isLoading}
              />
            </InlineField>
            <InlineField
              label="Observer"
              invalid={observerValid === false}
              style={{
                borderLeft: observerValid === true ? '3px solid #52c41a' : observerValid === false ? '3px solid #f5222d' : undefined,
                paddingLeft: observerValid !== null ? '8px' : undefined,
              }}
            >
              <Select
                width={16}
                options={observerOptions}
                value={observerValue}
                onChange={(ev) => {
                  if (!ev.value) { return }
                  if (ev.value === effectiveParam.observer) { return }
                  onChange({...query, param: { ...effectiveParam, observer: ev.value }})
                  if (effectiveParam.target) {
                    onRunQuery()
                  }
                }}
                allowCustomValue={true}
                isLoading={isLoading}
              />
            </InlineField>
            <InlineField label="Frame" labelWidth={14}>
              <Select
                width={20}
                options={frameOptions as unknown as Array<SelectableValue<SpiceFrame>>}
                value={frameOptions.find(opt => opt.value === effectiveParam.frame)}
                onChange={(ev) => {
                  if (!ev.value) { return }
                  if (ev.value === effectiveParam.frame) { return }
                  onChange({...query, param: { ...effectiveParam, frame: ev.value }})
                  onRunQuery()
                }}
              />
            </InlineField>
          </Stack>

          {/* Range Source row */}
          <Stack gap={0}>
            <InlineField label="Range Source" labelWidth={14}>
              <Select
                width={20}
                options={rangeSourceOptions as unknown as Array<SelectableValue<SpiceRangeSource>>}
                value={rangeSourceOptions.find(opt => opt.value === effectiveParam.timeConfig.rangeSource)}
                onChange={(ev) => {
                  if (!ev.value) { return }
                  if (ev.value === effectiveParam.timeConfig.rangeSource) { return }

                  onChange({...query, param: {
                    ...effectiveParam,
                    timeConfig: {
                      ...effectiveParam.timeConfig,
                      rangeSource: ev.value,
                      customRange: ev.value === 'custom' ? {} : undefined
                    }
                  }})
                  onRunQuery()
                }}
              />
            </InlineField>

            {/* Custom Range Fields */}
            {effectiveParam.timeConfig.rangeSource === 'custom' && (
              <>
                <InlineField label="Start Time" labelWidth={14} tooltip="ISO 8601 format (optional, e.g., 2024-01-01T00:00:00Z)">
                  <Input
                    type="text"
                    width={30}
                    value={effectiveParam.timeConfig.customRange?.start || ''}
                    onChange={(ev) => {
                      onChange({...query, param: {
                        ...effectiveParam,
                        timeConfig: {
                          ...effectiveParam.timeConfig,
                          customRange: {
                            ...effectiveParam.timeConfig.customRange,
                            start: ev.currentTarget.value || undefined
                          }
                        }
                      }})
                    }}
                    onBlur={() => onRunQuery()}
                    placeholder="2024-01-01T00:00:00Z (optional)"
                  />
                </InlineField>
                <InlineField label="End Time" labelWidth={14} tooltip="ISO 8601 format (optional, e.g., 2024-01-10T00:00:00Z)">
                  <Input
                    type="text"
                    width={30}
                    value={effectiveParam.timeConfig.customRange?.end || ''}
                    onChange={(ev) => {
                      onChange({...query, param: {
                        ...effectiveParam,
                        timeConfig: {
                          ...effectiveParam.timeConfig,
                          customRange: {
                            ...effectiveParam.timeConfig.customRange,
                            end: ev.currentTarget.value || undefined
                          }
                        }
                      }})
                    }}
                    onBlur={() => onRunQuery()}
                    placeholder="2024-01-10T00:00:00Z (optional)"
                  />
                </InlineField>
              </>
            )}
          </Stack>

          {/* Calculation row */}
          <Stack gap={0}>
            {/* Calculation Mode */}
            <InlineField label="Calculation" labelWidth={14}>
              <Select
                width={20}
                options={calculationOptions as unknown as Array<SelectableValue<string>>}
                value={calculationOptions.find(opt => opt.value === (effectiveParam.timeConfig.last ? 'last' : 'span'))}
                onChange={(ev) => {
                  if (!ev.value) { return }
                  const newLast = ev.value === 'last'
                  onChange({...query, param: {
                    ...effectiveParam,
                    timeConfig: {
                      ...effectiveParam.timeConfig,
                      last: newLast
                    }
                  }})
                  onRunQuery()
                }}
              />
            </InlineField>

            {/* Span and Unit fields - only show when not last */}
            {!effectiveParam.timeConfig.last && (
              <InlineField label="Span">
                <div style={{display:'flex'}}>
                  <Input
                    type="number"
                    width={6}
                    value={effectiveParam.timeConfig.span}
                    onChange={(ev) => {
                      const span = parseFloat(ev.currentTarget.value)
                      if (isNaN(span)) { return }
                      onChange({...query, param: {
                        ...effectiveParam,
                        timeConfig: {
                          ...effectiveParam.timeConfig,
                          span
                        }
                      }})
                    }}
                    onBlur={() => onRunQuery()}
                  />
                  <Select
                    width={10}
                    options={unitOptions as unknown as Array<SelectableValue<'sec' | 'min' | 'hour' | 'day'>>}
                    value={unitOptions.find(opt => opt.value === effectiveParam.timeConfig.unit)}
                    onChange={(ev) => {
                      if (!ev.value) { return }
                      if (ev.value === effectiveParam.timeConfig.unit) { return }
                      switch (ev.value) {
                        case 'sec':
                        case 'min':
                        case 'hour':
                        case 'day':
                          onChange({...query, param: {
                            ...effectiveParam,
                            timeConfig: {
                              ...effectiveParam.timeConfig,
                              unit: ev.value
                            }
                          }})
                          onRunQuery()
                          break
                      }
                    }}
                  />
                </div>
              </InlineField>
            )}
          </Stack>

          {/* Output format row */}
          <Stack gap={0}>
            <InlineField label="Output" labelWidth={14}>
              <Select
                width={24}
                options={outputFormatOptions as unknown as Array<SelectableValue<SpiceOutputFormat>>}
                value={outputFormatOptions.find(opt => opt.value === effectiveParam.outputFormat)}
                onChange={(ev) => {
                  if (!ev.value) { return }
                  if (ev.value === effectiveParam.outputFormat) { return }
                  onChange({...query, param: { ...effectiveParam, outputFormat: ev.value }})
                  onRunQuery()
                }}
              />
            </InlineField>
          </Stack>
        </>
      )}
    </div>
  )
}
