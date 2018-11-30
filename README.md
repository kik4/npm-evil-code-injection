# 概要

攻撃コードを隠蔽して仕込む実験

# 構成

- library
  - 攻撃コードを仕込んだ npm パッケージ
    - description が `run evil script` の時のみ攻撃コード実行
- app
  - 攻撃される npm パッケージ

