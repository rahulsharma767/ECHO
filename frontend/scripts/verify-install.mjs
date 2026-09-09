import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "node_modules/next/package.json",
  "node_modules/react/package.json",
  "node_modules/motion/package.json",
  "node_modules/motion-dom/package.json",
  "node_modules/@fontsource/ibm-plex-sans/400.css",
  "node_modules/@fontsource/ibm-plex-mono/400.css",
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (process.platform === "win32" && process.arch === "x64") {
  const native = path.join(root, "node_modules/lightningcss-win32-x64-msvc");
  if (!fs.existsSync(native)) missing.push("node_modules/lightningcss-win32-x64-msvc");
}

if (missing.length) {
  console.error("ECHO dependency check failed. Missing:");
  for (const file of missing) console.error(`  - ${file}`);
  console.error("\nRun: npm install --include=optional");
  process.exit(1);
}

const motionVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules/motion/package.json"), "utf8")).version;
const motionDomVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules/motion-dom/package.json"), "utf8")).version;
if (!motionVersion.startsWith("13.") || !motionDomVersion.startsWith("13.")) {
  console.error(`ECHO Motion version mismatch: motion=${motionVersion}, motion-dom=${motionDomVersion}`);
  console.error("Expected both packages on the same Motion 13 major line.");
  process.exit(1);
}

if (fs.existsSync(path.join(root, "node_modules/framer-motion"))) {
  console.error("ECHO found legacy framer-motion. This project intentionally uses motion/react only.");
  process.exit(1);
}

console.log(`ECHO dependency check: OK (motion ${motionVersion} / motion-dom ${motionDomVersion})`);
