import * as path from "path";

const startMarker = "<!-- route-editor:generated:start -->";
const endMarker = "<!-- route-editor:generated:end -->";
const repositoryRoot = path.join(import.meta.dirname, "..");
const htmlPath = path.join(repositoryRoot, "tools", "route-editor.html");
const entryPath = path.join(
  repositoryRoot,
  "tools",
  "route-editor",
  "configEntry.ts",
);
const checkOnly = process.argv.includes("--check");

const build = await Bun.build({
  entrypoints: [entryPath],
  target: "browser",
  format: "iife",
  minify: false,
  sourcemap: "none",
});

if (!build.success) {
  for (const log of build.logs) {
    console.error(log);
  }
  process.exit(1);
}

const output = build.outputs[0];
if (!output) {
  console.error("Route editor bundleの出力がありません");
  process.exit(1);
}

const bundle = (await output.text()).trimEnd();
const generatedBlock = `${startMarker}\n<script>\n${bundle}\n</script>\n${endMarker}`;
const currentHtml = await Bun.file(htmlPath).text();
const startIndex = currentHtml.indexOf(startMarker);
const endIndex = currentHtml.indexOf(endMarker);

if (startIndex < 0 || endIndex < startIndex) {
  console.error("Route editor HTMLに生成markerがありません");
  process.exit(1);
}

const nextHtml = `${currentHtml.slice(0, startIndex)}${generatedBlock}${currentHtml.slice(
  endIndex + endMarker.length,
)}`;

if (checkOnly) {
  if (nextHtml !== currentHtml) {
    console.error(
      "Route editor HTMLが生成元と一致しません。bun run generate:route-editor を実行してください",
    );
    process.exit(1);
  }
  console.log("✓ Route editor bundle検証成功");
  process.exit(0);
}

await Bun.write(htmlPath, nextHtml);
console.log("✓ Route editor bundleを更新しました");
