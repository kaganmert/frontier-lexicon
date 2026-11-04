// Fails if any concept file shares a run of 8 consecutive words with the
// Dictionary of AI Coding (github.com/mattpocock/dictionary-of-ai-coding).
// That repository has no license: only its term names may be reused, never
// its prose (see content/README.md, "Provenance").
//
// Usage, from the repository root: node scripts/check-overlap.mjs
// Node 24, no dependencies, no git. Needs network access, so CI does not run
// it; run it by hand whenever concept text changes and paste the output in
// the pull request.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/** The dictionary commit the seed was taken from; content/README.md quotes it. */
const DICTIONARY_COMMIT = "ed1ebed3975cba04ed5e74c6ca73659274beb754";
const REPO = "mattpocock/dictionary-of-ai-coding";
const WINDOW = 8;
const CONCEPTS_DIR = "content/concepts";

async function fetchOk(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "frontier-lexicon" },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res;
}

async function dictionaryFiles() {
  const treeUrl = `https://api.github.com/repos/${REPO}/git/trees/${DICTIONARY_COMMIT}?recursive=1`;
  const { tree, truncated } = await (await fetchOk(treeUrl)).json();
  if (truncated) throw new Error(`${treeUrl}: tree listing truncated`);
  const paths = tree
    .map((entry) => entry.path)
    .filter((p) => p.startsWith("dictionary/") && p.endsWith(".md"));
  return Promise.all(
    paths.map(async (p) => {
      const url = `https://raw.githubusercontent.com/${REPO}/${DICTIONARY_COMMIT}/${p.split("/").map(encodeURIComponent).join("/")}`;
      return {
        name: p,
        text: dictionaryText(await (await fetchOk(url)).text()),
      };
    }),
  );
}

/** The `description` front matter value plus the body. */
function dictionaryText(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return raw;
  const [, frontMatter, body] = match;
  const description = frontMatter.match(/^description:\s*(.*)$/m)?.[1] ?? "";
  return `${description}\n${body}`;
}

/** Link text instead of links, lowercase, punctuation removed, words only. */
function words(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function windows(text) {
  const w = words(text);
  const out = [];
  for (let i = 0; i + WINDOW <= w.length; i++) {
    out.push(w.slice(i, i + WINDOW).join(" "));
  }
  return out;
}

const dictionary = await dictionaryFiles();
const source = new Map();
for (const { name, text } of dictionary) {
  for (const win of windows(text)) {
    if (!source.has(win)) source.set(win, name);
  }
}

const concepts = (await readdir(CONCEPTS_DIR))
  .filter((f) => f.endsWith(".mdx"))
  .sort();
let hits = 0;
for (const file of concepts) {
  const text = await readFile(path.join(CONCEPTS_DIR, file), "utf8");
  const seen = new Set();
  for (const win of windows(text)) {
    if (source.has(win) && !seen.has(win)) {
      seen.add(win);
      hits++;
      console.log(
        `${CONCEPTS_DIR}/${file}: "${win}" (also in ${source.get(win)})`,
      );
    }
  }
}

console.log(
  `${dictionary.length} dictionary files at ${DICTIONARY_COMMIT.slice(0, 12)}, ${concepts.length} concept files, ${hits} shared ${WINDOW}-word windows`,
);
process.exitCode = hits === 0 ? 0 : 1;
