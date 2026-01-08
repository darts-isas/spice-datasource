# dartsisas-spice-datasource

SPICE データを Grafana で可視化・分析するためのデータソースプラグインです。

## SPICE とは

SPICE は NASA/JPL の Navigation and Ancillary Information Facility (NAIF) が提供する、宇宙探査機や天体に関する幾何学的・時間的情報を扱うためのデータシステムとツール群です。ミッション計画や軌道解析、指向校正などに必要な「カーネル (kernel)」と呼ばれるファイルに、天体位置 (SPK)、姿勢 (CK)、時刻変換 (SCLK、LSK)、形状モデル (DSK) といったデータを保持します。詳細は NAIF の公式サイト (<https://naif.jpl.nasa.gov/naif/>) を参照してください。

このプラグインは、SPICE カーネルから取得できる位置ベクトルなどの情報を Grafana の可視化パネルで取り扱えるようにし、運用監視やミッション分析に活用できるようにします。

## プラグインオプション

### データソースオプション

- **SPICE Kernels**:

  計算で依存する SPICE カーネルデータを指定します。
  複数設定する場合は、プラスボタンでフィールドを追加することができます。

- **Bodies Source**:

  利用可能な天体のリストを取得する方法を選択します。

  - `Enumerate from Kernels`: ロードされたSPKカーネルから天体を列挙します（デフォルト）
  - `JSON File`: 外部JSONファイルから天体リストを読み込みます

- **Bodies JSON URL**（Bodies Source が JSON File の場合）:

  天体リストを含むJSONファイルのURLを指定します。
  デフォルト: `http://localhost:3031/spice-bodies.json`

- **Enumerate Ranges**（Bodies Source が Enumerate from Kernels の場合）:

  列挙するNAIF IDの範囲を指定します。
  デフォルトの範囲で一般的な天体をカバーしています。
  必要に応じて範囲を追加・削除できます。

- **Enumerate Test Times**（Bodies Source が Enumerate from Kernels の場合）:

  天体位置をテストする日時（ISO 8601形式）を指定します。
  空の場合は現在時刻を使用します。
  SPKカバレッジが限定的な探査機などに有用です。

### クエリ

- **Function**:

  実行する計算関数を指定します。
  実装されている関数は現在は以下のとおりです。

  - `spkpos`: 天体の位置を計算します

- **Target**:

  計算対象の天体を指定します。
  セレクトボックスから一般的な天体を選択できます。
  また、カスタム値の入力も可能です。
  有効な天体IDの場合は緑色、無効な場合は赤色で表示されます。

- **Observer**:

  観測天体を指定します。
  セレクトボックスから一般的な天体を選択できます。
  また、カスタム値の入力も可能です。
  有効な天体IDの場合は緑色、無効な場合は赤色で表示されます。

- **Frame**:

  計算に使用する参照フレームを指定します。
  利用可能なフレーム:
  - `J2000`: Earth Mean Equator and Equinox of J2000（デフォルト）
  - `ECLIPJ2000`: Ecliptic coordinates based on J2000
  - `GALACTIC`: Galactic System II coordinates
  - `IAU_EARTH`: Earth body-fixed frame
  - `IAU_MARS`: Mars body-fixed frame
  - `IAU_SUN`: Sun body-fixed frame

- **Range Source**:

  時間範囲の取得方法を指定します。
  - `Grafana Range`: Grafana UIの時間範囲を使用（デフォルト）
  - `Custom Range`: カスタム時間範囲を指定

- **Start Time / End Time**（Range Source が Custom Range の場合）:

  計算の開始・終了時刻をISO 8601形式で指定します。
  例: `2024-01-01T00:00:00Z`

- **Calculation**:

  計算モードを指定します。
  - `Span Intervals`: 指定された間隔で計算を実行（デフォルト）
  - `End Point Only`: 終了時点のみ計算

- **Span**（Calculation が Span Intervals の場合）:

  計算間隔を指定します。
  計算は期間の終了時刻を起点として、指定された間隔で開始方向に処理します。
  これは、期間の終了を「現在」としたときに、現在時点の計算結果を得られるようにするためです。
  単位: `sec`, `min`, `hour`, `day`

- **Output**:

  出力フォーマットを指定します。
  - `Cartesian (x,y,z)`: 位置をx, y, z座標で出力（デフォルト）
  - `Quaternion`: 回転をクォータニオン (q0,q1,q2,q3) で出力
  - `Euler XYZ`: 回転をオイラー角 (roll, pitch, yaw) で出力
  - `Euler ZYX`: 回転をオイラー角 (yaw, pitch, roll) で出力
  - `Euler ZXZ`: 回転をオイラー角 (precession, nutation, spin) で出力

### スクリーンショット

- [データソース](./screenshots/datasource.png)
- [クエリ](./screenshots/query.png)

## 開発

### ローカルサーバ

ローカルの開発サーバ起動手順は以下の通りです。

前提として Docker 環境が構築されている必要があります。
またローカルサーバにブラウザからアクセスするため、ファイアウォール設定等に注意してください。

1. ビルドサーバの起動 `pnpm dev`
2. Grafana開発サーバの起動 `docker compose up`
3. ブラウザで `http://localhost:3000` にアクセスする

Grafanaサーバは自動で開発中のデータソースを読み込もうとします。
このため、先にビルドサーバを立てておく必要があります。

### カーネルデータのロード

データソースではブラウザがカーネルデータをロードします。
このためカーネルデータは同一ドメインに置くか、
CORS 対応のデータ配信サーバで配信する必要があります。

ローカルで動作確認をする場合にも、
こうしたローカル配信サーバが必要になります。

例えば node の http-server を使う場合、
以下のようにサーバを起動すれば、 http://localhost:3030 でアクセスできます。

```sh
npx http-server -p 3030 --cors ./data
```

### データソースの設定

カーネルデータはデータソースの設定にて指定します。

複数指定することができるので、計算内容に応じて適切なカーネルデータを指定してください。
例えば spkpos の計算では、天体に合わせて以下のようなカーネルを指定します。

* http://localhost:3030/kernels/lsk/naif0012.tls
* http://localhost:3030/kernels/spk/de432s.bsp

## ビルド

`pnpm build` でビルドが実行されます。
合わせて tar.gz アーカイブを作成する make コマンドも用意しています。

```sh
make dist
```

## 依存ライブラリ

* rxjs
* timecraftjs

## 天体リストの設定

Target と Observer で選択可能な天体のリストは、外部 JSON ファイルとして提供されます。

### 設定ファイルの配置

`spice-bodies.json` を HTTP サーバで公開してください：

```sh
npx http-server -p 3031 --cors ./data
```

データソース設定で Bodies JSON URL を指定します：
- デフォルト: `http://localhost:3031/spice-bodies.json`

### spice-bodies.json の生成

SPK カーネルファイルから `spice-bodies.json` を自動生成するツールを提供しています。

詳細は [`tools/spice-bodies-generator/README.md`](./tools/spice-bodies-generator/README.md) を参照してください。

**クイックスタート:**

```bash
# CSPICE のインストール（初回のみ）
cd tools/spice-bodies-generator
./install-cspice.sh

# ツールのビルド
go build

# spice-bodies.json の生成
./spice-bodies-generator -lsk ../../data/kernels/lsk/naif0012.tls \
                          -o ../../data/spice-bodies.json \
                          ../../data/kernels/spk/*.bsp
```

生成された `spice-bodies.json` の形式:

```json
{
  "bodies": [
    {"id": 0, "name": "SOLAR SYSTEM BARYCENTER"},
    {"id": 1, "name": "MERCURY BARYCENTER"},
    {"id": 199, "name": "MERCURY"},
    ...
  ]
}
```

### ビルドの必要性

天体リストは外部 JSON として動的に読み込まれるため、
設定変更後にプラグインを再ビルドする必要はありません。

## ライセンス

GNU Lesser General Public License v3.0 の下で提供されています。

著作者: ISAS/JAXA and [NAKAHIRA, Satoshi](https://orcid.org/0000-0001-9307-046X) (© 2025)。

## 謝辞

本ソフトウェアは[株式会社アストロアーツ](https://www.astroarts.co.jp/)の協力のもと開発されました。
