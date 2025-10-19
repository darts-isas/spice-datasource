import { DataSourcePlugin } from '@grafana/data';
import { SpiceDataSource } from './datasource';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { SpiceQuery, SpiceDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<SpiceDataSource, SpiceQuery, SpiceDataSourceOptions>(SpiceDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
