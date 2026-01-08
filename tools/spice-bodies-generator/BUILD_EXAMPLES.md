# ビルド例

## 基本的な使い方

### 1. 自動検出でビルド（推奨）

```bash
./build.sh
```

ビルドスクリプトが自動的に CSPICE の場所を検出してビルドします。

### 2. CSPICE_ROOT を指定してビルド

```bash
CSPICE_ROOT=/path/to/cspice ./build.sh
```

### 3. CGO フラグを直接指定してビルド

```bash
CGO_CFLAGS="-I/custom/include" CGO_LDFLAGS="-L/custom/lib -lcspice -lm" ./build.sh
```

## プラットフォーム別の例

### macOS (Homebrew - Apple Silicon)

```bash
# 自動検出（推奨）
./build.sh

# 明示的に指定
CSPICE_ROOT=/opt/homebrew/opt/cspice ./build.sh
```

### macOS (Homebrew - Intel)

```bash
CSPICE_ROOT=/usr/local/opt/cspice ./build.sh
```

### Linux (システムインストール)

```bash
CSPICE_ROOT=/usr/local ./build.sh
```

### Linux (カスタムパス)

```bash
CSPICE_ROOT=$HOME/cspice ./build.sh
```

## 手動ビルド（ビルドスクリプトを使わない場合）

### デフォルトパスでビルド

```bash
go build -o spice-bodies-generator
```

プラットフォーム固有のデフォルトパス（main.go のビルドタグ）が使用されます：
- macOS (arm64): `/opt/homebrew/opt/cspice`
- macOS (amd64): `/usr/local/opt/cspice`
- Linux: `/usr/local`

### カスタムパスでビルド

```bash
CGO_CFLAGS="-I/path/to/include" \
CGO_LDFLAGS="-L/path/to/lib -lcspice -lm" \
go build -o spice-bodies-generator
```

## トラブルシューティング

### CSPICE が見つからない

```bash
# CSPICE をインストール
./install-cspice.sh

# またはパスを明示的に指定
CSPICE_ROOT=/path/to/cspice ./build.sh
```

### リンクエラーが発生する

CSPICE のライブラリファイルが正しい場所にあることを確認：

```bash
# macOS の場合
ls /opt/homebrew/opt/cspice/lib/cspice.a

# Linux の場合
ls /usr/local/lib/cspice.a
```

### クロスコンパイル

異なるプラットフォーム向けにビルドする場合：

```bash
# Linux 向けに macOS でビルド
GOOS=linux GOARCH=amd64 \
CGO_ENABLED=1 \
CGO_CFLAGS="-I/path/to/linux/cspice/include" \
CGO_LDFLAGS="-L/path/to/linux/cspice/lib -lcspice -lm" \
go build -o spice-bodies-generator-linux
```

注: クロスコンパイルには対象プラットフォーム用の CSPICE ライブラリが必要です。

## 環境変数の優先順位

ビルドスクリプトは以下の優先順位で CSPICE の場所を決定します：

1. **CGO_CFLAGS と CGO_LDFLAGS** - 直接指定（最優先）
2. **CSPICE_ROOT** - CSPICE インストールディレクトリ
3. **自動検出** - 一般的なパスを検索
4. **ビルドタグのデフォルト** - プラットフォーム固有のデフォルト

## 検証

ビルドが成功したか確認：

```bash
./spice-bodies-generator -h
```

実際に動作するか確認：

```bash
./spice-bodies-generator \
  -lsk ../../data/kernels/lsk/naif0012.tls \
  -o test-output.json \
  ../../data/kernels/spk/de432s.bsp
```
