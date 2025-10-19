import React, { ChangeEvent } from 'react'
import { Button, InlineField, Input } from '@grafana/ui'
import { DataSourcePluginOptionsEditorProps } from '@grafana/data'
import { SpiceDataSourceOptions, SpiceSecureJsonData } from '../types'

interface Props extends DataSourcePluginOptionsEditorProps<SpiceDataSourceOptions, SpiceSecureJsonData> {}

export const ConfigEditor = (props: Props) => {
  const { onOptionsChange, options } = props
  const { jsonData } = options

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

  return (
    <>
			<InlineField label="SPICE Kernels" labelWidth={16} interactive tooltip={'URL of the dependent kernel'}>
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
      {/* <InlineField label="Path" labelWidth={14} interactive tooltip={'Json field returned to frontend'}>
        <Input
          id="config-editor-path"
          onChange={onPathChange}
          value={jsonData.path}
          placeholder="Enter the path, e.g. /api/v1"
          width={40}
        />
      </InlineField>
      <InlineField label="API Key" labelWidth={14} interactive tooltip={'Secure json field (backend only)'}>
        <SecretInput
          required
          id="config-editor-api-key"
          isConfigured={secureJsonFields.apiKey}
          value={secureJsonData?.apiKey}
          placeholder="Enter your API key"
          width={40}
          onReset={onResetAPIKey}
          onChange={onAPIKeyChange}
        />
      </InlineField> */}
    </>
  )
}
