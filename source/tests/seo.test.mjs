import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));

function filesBelow(directory, suffix) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path, suffix) : path.endsWith(suffix) ? [path] : [];
  });
}

test("every route exposes metadata and structured data", () => {
  const pages = filesBelow(join(projectRoot, "app"), "page.tsx");
  const layout = readFileSync(join(projectRoot, "app", "layout.tsx"), "utf8");

  assert.match(layout, /export const metadata: Metadata/);
  assert.match(layout, /title:/);
  assert.match(layout, /description:/);
  assert.match(layout, /robots:/);

  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /<JsonLd data=/, `${page} is missing JSON-LD`);
    if (page !== join(projectRoot, "app", "page.tsx")) {
      assert.match(source, /export (?:const metadata|async function generateMetadata)/, `${page} is missing route metadata`);
      assert.match(source, /alternates:/, `${page} is missing a canonical URL`);
      assert.match(source, /openGraph:/, `${page} is missing Open Graph metadata`);
    }
  }
});

test("every rendered image has useful alternative text", () => {
  const sourceFiles = [
    ...filesBelow(join(projectRoot, "app"), ".tsx"),
    ...filesBelow(join(projectRoot, "components"), ".tsx"),
  ];

  for (const file of sourceFiles) {
    const source = readFileSync(file, "utf8");
    const imageTags = source.match(/<img\b[^>]*>/g) ?? [];
    for (const imageTag of imageTags) {
      assert.match(imageTag, /\balt=\{?(?:`|"|')?[^}"']+/, `${file} contains an image without useful alt text`);
    }
  }
});

test("publishes the Auto Opulence site identity and favicon", () => {
  const layout = readFileSync(join(projectRoot, "app", "layout.tsx"), "utf8");
  const home = readFileSync(join(projectRoot, "app", "page.tsx"), "utf8");
  const favicon = readFileSync(join(projectRoot, "public", "auto-opulence-favicon.svg"), "utf8");

  assert.match(layout, /applicationName: "Auto Opulence"/);
  assert.match(layout, /siteName: "Auto Opulence"/);
  assert.match(layout, /auto-opulence-favicon\.svg/);
  assert.match(home, /"@type": "WebSite"/);
  assert.match(home, /name: "Auto Opulence"/);
  assert.match(home, /alternateName: \["Auto Opulence Norwich", "Auto Opulence Detailing"\]/);
  assert.match(favicon, /<title id="title">Auto Opulence<\/title>/);
});


test("case-study images include descriptive alt text", () => {
  const source = readFileSync(join(projectRoot, "lib", "case-studies.ts"), "utf8");
  const images = [...source.matchAll(/\{ src: "([^"]+)", alt: "([^"]+)" \}/g)];

  assert.ok(images.length > 0, "No case-study images were found");
  for (const [, path, alt] of images) {
    assert.ok(alt.trim().length >= 20, `${path} has insufficient alt text`);
  }
});
