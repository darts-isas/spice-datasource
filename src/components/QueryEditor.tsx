import React from 'react'
import { InlineField, Input, Select, Stack, Switch } from '@grafana/ui'
import { QueryEditorProps, SelectableValue } from '@grafana/data'
import { SpiceDataSource } from '../datasource'
import { SpiceDataSourceOptions, SpiceQuery } from '../types'

type Props = QueryEditorProps<SpiceDataSource, SpiceQuery, SpiceDataSourceOptions>

export const QueryEditor = ({ query, onChange, onRunQuery }: Props) => {
  const { param } = query

  const onSelectType = (v: SelectableValue<string>) => {
    switch(v.value) {
      case 'spkpos': {
        onChange({
          ...query,
          param: {
            type: v.value,
            target: 'SUN',
            observer: 'EARTH',
            span: 1,
            unit: 'day',
            last: false,
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
    <Stack gap={0}>
      <InlineField label="Function">
        <Select
          options={[
            { label: 'spkpos', value: 'spkpos' },
            { label: 'spkezr', value: 'spkezr' },
          ]}
          value={param ? param.type : 'spkpos'}
          onChange={onSelectType}
        />
      </InlineField>

      {
        param?.type === 'spkpos' ? (
          <>
            <InlineField label="Target">
              <Input
                width={16}
                value={param?.target}
                onChange={(ev) => {
                  if (!param) { return }
                  if (ev.currentTarget.value === param.target) { return }
                  onChange({...query, param: { ...param, target: ev.currentTarget.value }})
                }}
                onBlur={(ev) => {
                  if (!param.target || !param.observer) { return }
                  onRunQuery()
                }}
              />
            </InlineField>
            <InlineField label="Observer">
              <Input
                width={16}
                value={param?.observer}
                onChange={(ev) => {
                  if (!param) { return }
                  if (ev.currentTarget.value === param.observer) { return }
                  onChange({...query, param: { ...param, observer: ev.currentTarget.value }})
                }}
                onBlur={(ev) => {
                  if (!param.target || !param.observer) { return }
                  onRunQuery()
                }}
              />
            </InlineField>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <InlineField label="Span" disabled={param?.last}>
                <div style={{display:'flex'}}>
                  <Input
                    type="number"
                    width={6}
                    value={param?.span}
                    disabled={param?.last}
                    onChange={(ev) => {
                      if (!param) { return }
                      const span = parseFloat(ev.currentTarget.value)
                      if (isNaN(span)) { return }
                      onChange({...query, param: { ...param, span }})
                    }}
                    onBlur={() => onRunQuery()}
                  />
                  <Select
                    width={10}
                    options={[
                      { label: 'sec', value: 'sec' },
                      { label: 'min', value: 'min' },
                      { label: 'hour', value: 'hour' },
                      { label: 'day', value: 'day' },
                    ]}
                    value={param.unit}
                    disabled={param?.last}
                    onChange={(ev) => {
                      if (!param || !ev.value) { return }
                      if (ev.value === param.unit) { return }
                      switch (ev.value) {
                        case 'sec':
                        case 'min':
                        case 'hour':
                        case 'day':
                          onChange({...query, param: { ...param, unit: ev.value }})
                          onRunQuery()
                          break
                      }
                    }}
                  />
                </div>
              </InlineField>
              <InlineField label="Last" tooltip="最新データポイントのみを取得します" labelWidth={8}>
                <Switch
                  value={param?.last ?? false}
                  onChange={(ev) => {
                    if (!param) { return }
                    onChange({...query, param: { ...param, last: ev.currentTarget.checked }})
                    onRunQuery()
                  }}
                />
              </InlineField>
            </div>
          </>
        ) : null
      }
    </Stack>
  )
}
