const fs = require("fs");
const path = require("path");

const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = require(packageJsonPath);
const headerFile = path.join(__dirname, "tampermonkey-header.js");
const inputFile = path.join(__dirname, "dist", "xgroups.min.js");
const metaFile = path.join(__dirname, "dist", "xgroups.meta.js");
const outputFile = path.join(__dirname, "dist", "xgroups.userscript.js");

const bumpVersion = (version) => {
  const parts = version.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid version format");
  }
  const major = parseInt(parts[0]);
  const minor = parseInt(parts[1]);
  const patch = parseInt(parts[2]) + 1; // Increment the patch version
  return `${major}.${minor}.${patch}`;
};

fs.readFile(headerFile, "utf8", (err, header) => {
  if (err) throw err;

  // bump the version in package.json
  packageJson.version = bumpVersion(packageJson.version);
  // save the updated package.json
  fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), (err) => {
    if (err) throw err;
    console.log("Updated package.json version to: ", packageJson.version);
  });
  // replace @version in header with the version from package.json
  header = header.replace(
    /@version\s+\d+\.\d+\.\d+/,
    `@version      ${packageJson.version}`
  );

  fs.writeFile(metaFile, header, (err) => {
    if (err) throw err;
    console.log("Saved meta file to: ", metaFile);
  });

  fs.readFile(inputFile, "utf8", (err, script) => {
    if (err) throw err;
    const output = `${header}\n${script}`;
    fs.writeFile(outputFile, output, (err) => {
      if (err) throw err;
      console.log("TamperMonkey script built: ", outputFile);
    });
  });
});
