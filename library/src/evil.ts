export default () => {
  if (process.env.npm_package_description === "run evil code") {
    console.log("This is evil code.");
  }
};
