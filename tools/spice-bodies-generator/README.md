# SPICE Bodies Generator

SPKカーネルファイルからボディID一覧を抽出し、`spice-bodies.json`を生成するCLIツールです。

## 必要なもの

- Go 1.21以上
- CSPICE toolkit (https://naif.jpl.nasa.gov/naif/toolkit_C.html)

## CSPICEのインストール

### macOS

```bash
# CSPICEをダウンロード
curl -O https://naif.jpl.nasa.gov/pub/naif/toolkit//C/MacIntel_OSX_AppleC_64bit/packages/cspice.tar.Z
uncompress cspice.tar.Z
tar xf cspice.tar

# ライブラリをシステムにインストール
sudo cp cspice/lib/cspice.a /usr/local/lib/
sudo cp -r cspice/include /usr/local/include/cspice
```

### Linux

```bash
# CSPICEをダウンロード (適切なプラットフォームを選択)
curl -O https://naif.jpl.nasa.gov/pub/naif/toolkit//C/PC_Linux_GCC_64bit/packages/cspice.tar.Z
uncompress cspice.tar.Z
tar xf cspice.tar

# ライブラリをシステムにインストール
sudo cp cspice/lib/cspice.a /usr/local/lib/
sudo cp -r cspice/include /usr/local/include/cspice
```

## ビルド

### 自動ビルド（推奨）

ビルドスクリプトを使用すると、CSPICE の場所を自動検出してビルドできます：

```bash
cd tools/spice-bodies-generator
./build.sh
```

ビルドスクリプトは以下の順序で CSPICE を検索します：
1. 環境変数 `CGO_CFLAGS` と `CGO_LDFLAGS`
2. 環境変数 `CSPICE_ROOT`
3. 自動検出（Homebrew、システムパスなど）
4. プラットフォーム固有のデフォルト（main.go のビルドタグ）

### カスタムパスを指定してビルド

CSPICE が標準的な場所にない場合：

```bash
# 方法1: CSPICE_ROOT を使用
CSPICE_ROOT=/path/to/cspice ./build.sh

# 方法2: CGO フラグを直接指定
CGO_CFLAGS="-I/custom/include" CGO_LDFLAGS="-L/custom/lib -lcspice -lm" ./build.sh

# 方法3: 環境変数をエクスポート
export CSPICE_ROOT=/path/to/cspice
./build.sh
```

### 手動ビルド

```bash
cd tools/spice-bodies-generator

# デフォルトパスでビルド（プラットフォーム依存）
go build -o spice-bodies-generator

# カスタムパスでビルド
CGO_CFLAGS="-I/path/to/include" CGO_LDFLAGS="-L/path/to/lib -lcspice -lm" \
  go build -o spice-bodies-generator
```

## 使用方法

### クイックスタート

サンプルスクリプトを使用して、プロジェクトのカーネルファイルから `spice-bodies.json` を生成できます：

```bash
./example-generate.sh
```

このスクリプトは以下を行います：
- ツールが未ビルドの場合、自動的にビルド
- `../../data/kernels/` 内の全てのSPKファイルを検出
- LSKカーネルを使用して天体リストを生成
- `../../data/spice-bodies.json` に出力

### 手動での使用

```bash
# 単一のSPKファイルから生成
./spice-bodies-generator -o spice-bodies.json de432s.bsp

# 複数のSPKファイルから生成
./spice-bodies-generator -o spice-bodies.json de432s.bsp jup365.bsp

# LSKカーネルも指定する場合
./spice-bodies-generator -lsk naif0012.tls -o spice-bodies.json de432s.bsp

# 詳細ログを表示
./spice-bodies-generator -v -lsk naif0012.tls -o spice-bodies.json *.bsp
```

## オプション

- `-o, --output <file>`: 出力ファイル名 (デフォルト: `spice-bodies.json`)
- `-lsk <file>`: LSK (Leapseconds Kernel) ファイルのパス
- `-pretty`: 整形されたJSON出力 (デフォルト: 有効)
- `-v, --verbose`: 詳細ログを出力

## 出力形式

```json
{
  "bodies": [
    {
      "id": 0,
      "name": "SOLAR SYSTEM BARYCENTER"
    },
    {
      "id": 1,
      "name": "MERCURY BARYCENTER"
    }
  ]
}
```

## 提供されているスクリプト

### build.sh

ツールをビルドするためのスクリプトです。CSPICE の場所を自動検出し、適切な CGO フラグを設定してビルドを実行します。

```bash
./build.sh                           # 自動検出
CSPICE_ROOT=/path/to/cspice ./build.sh  # パス指定
```

詳細は [BUILD_EXAMPLES.md](./BUILD_EXAMPLES.md) を参照してください。

### install-cspice.sh

CSPICE toolkit をダウンロードしてインストールするスクリプトです。プラットフォームを自動検出し、適切なバージョンをインストールします。

```bash
./install-cspice.sh
```

macOS と Linux に対応しています。

### example-generate.sh

プロジェクトの `data/kernels/` ディレクトリから `spice-bodies.json` を生成するサンプルスクリプトです。

```bash
./example-generate.sh
```

以下の処理を自動化します：
- ビルドの確認とビルド実行
- カーネルファイルの検出
- spice-bodies.json の生成
