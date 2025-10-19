import { getBackendSrv, isFetchError } from '@grafana/runtime'
import {
  CoreApp,
  DataFrame,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
} from '@grafana/data'
import { Spice } from 'timecraftjs';

import { SpiceQuery, SpiceDataSourceOptions, DEFAULT_QUERY, DataSourceResponse } from './types'
import { lastValueFrom } from 'rxjs'
import _ from 'lodash'

const CACHE_EXPIRE = 1000 * 60 * 60 // 1 hour

type CacheItem = {
  url: string;
  buffer: ArrayBuffer;
  expire: number;
}

export class SpiceDataSource extends DataSourceApi<SpiceQuery, SpiceDataSourceOptions> {
  spice: Spice | null;
  baseUrl: string;
  kernels: string[] = [];
  kernelCache: { [url: string]: CacheItem } = {};
  kernelExpire = 0;

  constructor(instanceSettings: DataSourceInstanceSettings<SpiceDataSourceOptions>) {
    super(instanceSettings)
    this.spice = null;
    this.baseUrl = instanceSettings.url!
    this.kernels = instanceSettings.jsonData.kernels || []
  }

  getDefaultQuery(_: CoreApp): Partial<SpiceQuery> {
    return DEFAULT_QUERY;
  }

  /**
   * エラー発生時に空のデータ構造を作成するヘルパーメソッド
   */
  private createEmptyDataResponse(targets: SpiceQuery[]): DataQueryResponse {
    const data = targets.map((target): DataFrame => {
      return {
        fields: [
          { name: 'Time', values: [], type: FieldType.time, config: {} },
          { 
            name: `${target.refId}_x`, 
            values: [], 
            type: FieldType.number, 
            config: {} 
          },
          { 
            name: `${target.refId}_y`, 
            values: [], 
            type: FieldType.number, 
            config: {} 
          },
          { 
            name: `${target.refId}_z`, 
            values: [], 
            type: FieldType.number, 
            config: {} 
          },
        ],
        length: 0,
      }
    });

    return { data };
  }

  filterQuery(query: SpiceQuery): boolean {
    // if no query has been provided, prevent the query from being executed
    // return !!query.queryText;
    return true
  }

  async loadKernel(url: string, force = false): Promise<ArrayBuffer> {
    if (url in this.kernelCache && !force) {
      const item = this.kernelCache[url]
      if (item.expire < Date.now()) {
        delete this.kernelCache[url]
      } else {
        return item.buffer
      }
    }

    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`Failed to fetch kernel from ${url}: ${res.status} ${res.statusText}`);
      }
      const blob = await res.blob()
      const buffer = await blob.arrayBuffer()
      this.kernelCache[url] = {
        url, buffer,
        expire: Date.now() + CACHE_EXPIRE,
      }
      return buffer
    } catch (err) {
      console.error(`Error loading kernel from ${url}:`, err);
      throw err; // 呼び出し元でハンドリングするために再スロー
    }
  }

  async query(options: DataQueryRequest<SpiceQuery>): Promise<DataQueryResponse> {
    if (this.kernelExpire < Date.now()) {
      this.kernelCache = {}
      this.kernelExpire = Date.now() + CACHE_EXPIRE
      this.spice = null // reset spice
    }
    if (this.spice === null) {
      try {
        this.spice = await new Spice().init();
        for (let kernel of this.kernels.filter(k => !!k)) {
          try {
            const buf = await this.loadKernel(kernel)
            this.spice.loadKernel(buf);  // `kernel` should be ArrayBuffer
          } catch (kernelErr) {
            console.error(`Failed to load kernel ${kernel}:`, kernelErr);
            // 個別のカーネルロードに失敗しても、他のカーネルの処理を続行
            // ただし、すべてのカーネルが必要な場合は、この動作を変更する必要がある
          }
        }
      } catch (err) {
        console.error('Failed to initialize SPICE or load kernels:', err);
        // SPICEの初期化に失敗した場合、空のデータセットを返す
        console.warn('Returning empty dataset due to SPICE initialization failure');
        return this.createEmptyDataResponse(options.targets);
      }
    }
    if (this.spice === null) {
      console.error("Can't initiate SPICE");
      // SPICEインスタンスが作成できない場合、空のデータセットを返す
      return this.createEmptyDataResponse(options.targets);
    }

    const { range } = options
    const from = range!.from.valueOf()
    const to = range!.to.valueOf()

    // Return a constant for each query.
    const data = options.targets.map((target): DataFrame => {
      const times: number[] = []
      const x: number[] = []
      const y: number[] = []
      const z: number[] = []

      // 各クエリの処理を独立させるため、SPICEインスタンスの状態をチェック
      if (!this.spice) {
        console.warn(`SPICE instance is null for target ${target.refId}, returning empty data`);
        return {
          fields: [
            { name: 'Time', values: [], type: FieldType.time, config: {} },
            { 
              name: `${target.refId}_x`, 
              values: [], 
              type: FieldType.number, 
              config: {} 
            },
            { 
              name: `${target.refId}_y`, 
              values: [], 
              type: FieldType.number, 
              config: {} 
            },
            { 
              name: `${target.refId}_z`, 
              values: [], 
              type: FieldType.number, 
              config: {} 
            },
          ],
          length: 0,
        };
      }

      try {
        switch (target.param.type) {
          case 'spkpos': {
            if (target.param.last) {
              // 「last」フラグが有効な場合は、timerangeの終了時刻のデータポイントのみを計算
              const at = to
              const isodt = new Date(at).toISOString().split('.')[0]
              
              times.push(at)
              try {
                // SPICEインスタンスが無効になっていないかチェック
                if (!this.spice) {
                  console.warn('SPICE instance is null, returning zero values');
                  x.push(0)
                  y.push(0)
                  z.push(0)
                } else {
                  const et = this.spice.str2et(isodt)
                  const result = this.spice.spkpos(target.param.target, et, 'J2000', 'NONE', target.param.observer)
                  if (result && result.ptarg) {
                    const {ptarg} = result
                    const [px, py, pz] = ptarg
                    x.push(px)
                    y.push(py)
                    z.push(pz)
                  } else {
                    // 結果が無効な場合は空の値を追加
                    x.push(0)
                    y.push(0)
                    z.push(0)
                  }
                }
              } catch (spiceErr) {
                console.warn(`SPICE spkpos error for target ${target.param.target} at ${isodt}:`, spiceErr);
                // 個別のSPICEエラーの場合は、SPICEインスタンスをリセットせずに0値を返す
                const errorMsg = spiceErr?.toString() || '';
                if (errorMsg.includes('SPKINSUFFDATA') || errorMsg.includes('SPICE(SPKINSUFFDATA)')) {
                  console.warn('Insufficient ephemeris data error - returning zero values');
                } else {
                  console.error('Critical SPICE error, resetting instance:', spiceErr);
                  this.spice = null;
                }
                // エラーが発生した場合は0値を追加
                x.push(0)
                y.push(0)
                z.push(0)
              }
            } else {
              // 通常の時間範囲でのデータポイント計算（既存のコード）
              let current = to
              let span = target.param.span
              switch (target.param.unit) {
                case 'sec' : span *= 1000; break
                case 'min' : span *= 1000 * 60; break
                case 'hour': span *= 1000 * 60 * 60; break
                case 'day' : span *= 1000 * 60 * 60 * 24; break
              }
              while (from <= current) {
                const at = current
                const isodt = new Date(at).toISOString().split('.')[0]
                
                times.unshift(at)
                try {
                  // SPICEインスタンスが無効になっていないかチェック
                  if (!this.spice) {
                    console.warn('SPICE instance is null, stopping data processing');
                    // 0値を追加してループを抜ける
                    x.unshift(0)
                    y.unshift(0)
                    z.unshift(0)
                    break;
                  }
                  
                  const et = this.spice.str2et(isodt)
                  const result = this.spice.spkpos(target.param.target, et, 'J2000', 'NONE', target.param.observer)
                  
                  if (result && result.ptarg) {
                    const {ptarg} = result
                    const [px, py, pz] = ptarg
                    x.unshift(px)
                    y.unshift(py)
                    z.unshift(pz)
                  } else {
                    // 結果が無効な場合は0値を追加
                    x.unshift(0)
                    y.unshift(0)
                    z.unshift(0)
                  }
                } catch (spiceErr) {
                  console.warn(`SPICE spkpos error for target ${target.param.target} at ${isodt}:`, spiceErr);
                  // 個別のSPICEエラーの場合は、SPICEインスタンスをリセットせずに0値を返す
                  // 重大なエラー（カーネルに関する問題など）の場合のみリセット
                  const errorMsg = spiceErr?.toString() || '';
                  if (errorMsg.includes('SPKINSUFFDATA') || errorMsg.includes('SPICE(SPKINSUFFDATA)')) {
                    console.warn('Insufficient ephemeris data error - continuing with zero values');
                  } else {
                    console.error('Critical SPICE error, resetting instance:', spiceErr);
                    this.spice = null;
                  }
                  // エラーが発生した場合は0値を追加してループを抜ける
                  x.unshift(0)
                  y.unshift(0)
                  z.unshift(0)
                  break;
                }

                current -= span
              }
            }
          }; break;
          case 'spkezr': {
            // spkezr機能は未実装のため、warningを出して空データを返す
            console.warn(`spkezr function is not implemented yet for target ${target.refId}`);
            times.push(to);
            x.push(0);
            y.push(0);
            z.push(0);
          }; break;
          default: {
            const span = (to - from) / 9
            for (let i = 0; i < 10; i++) {
              const current = to - span * i

              times.unshift(current)
              x.unshift((Math.random() * 2 - 1) * 5)
              y.unshift((Math.random() * 2 - 1) * 5)
              z.unshift((Math.random() * 2 - 1) * 5)
            }
          }
        }
      } catch (generalErr) {
        console.error(`Error processing query for target ${target.refId}:`, generalErr);
        // 全般的なエラーが発生した場合でも、他のクエリに影響しないよう最小限の処理
        // 空のデータ構造を作成
        if (times.length === 0) {
          times.push(to);
          x.push(0);
          y.push(0);
          z.push(0);
        }
      }

      return {
        fields: [
          { name: 'Time', values: times, type: FieldType.time, config: {} },
          { 
            name: `${target.refId}_x`, 
            values: x, 
            type: FieldType.number, 
            config: {} 
          },
          { 
            name: `${target.refId}_y`, 
            values: y, 
            type: FieldType.number, 
            config: {} 
          },
          { 
            name: `${target.refId}_z`, 
            values: z, 
            type: FieldType.number, 
            config: {} 
          },
        ],
        length: x.length,
      }
    })

    return { data }
  }

  async requestDatasource(url: string, params?: string) {
    const response = getBackendSrv().fetch<DataSourceResponse>({
      url: `${this.baseUrl}${url}${params?.length ? `?${params}` : ''}`,
    });
    return lastValueFrom(response);
  }

  /**
   * Checks whether we can connect to the API.
   */
  async testDatasource() {
    const defaultErrorMessage = 'Cannot connect to API';

    for (let kernel of this.kernels.filter(k => !!k)) {
      try {
        const res = await fetch(kernel)
        if (res.status !== 200) {
          return {
            status: 'error',
            message: res.statusText ? res.statusText : defaultErrorMessage,
          }
        }
      }
      catch (err) {
        let message = '';
        if (_.isString(err)) {
          message = err
        }
        else if (isFetchError(err)) {
          message = 'Fetch error: ' + (err.statusText ? err.statusText : defaultErrorMessage)
          if (err.data && err.data.error && err.data.error.code) {
            message += ': ' + err.data.error.code + '. ' + err.data.error.message
          }
        }
        return {
          status: 'error',
          message,
        }
      }
    }

    return {
      status: 'success',
      message: 'Successfully connected to API',
    }
  }
}
