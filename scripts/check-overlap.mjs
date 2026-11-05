// Overlap guard for the concept seed; why and when to run it is in
// content/README.md, "Provenance".
//
//   node scripts/check-overlap.mjs
//
// Exit 0: no shared window. Exit 1: at least one concept file shares a run of
// WINDOW consecutive words with the dictionary. Exit 2: the dictionary could
// not be fetched or the concept files could not be read.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/** Pinned dictionary commit; content/README.md quotes the same value. */
const DICTIONARY_COMMIT = "ed1ebed3975cba04ed5e74c6ca73659274beb754";
const DICTIONARY_REPO = "mattpocock/dictionary-of-ai-coding";
const WINDOW = 8;
const CONCEPTS_DIR = path.resolve(import.meta.dirname, "../content/concepts");

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "frontier-lexicon" },
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Every Markdown file in the repository: the entries under dictionary/, the
 * README that repeats them, and internal/ (the curriculum order and the README
 * template).
 */
async function dictionaryFiles() {
  const treeUrl = `https://api.github.com/repos/${DICTIONARY_REPO}/git/trees/${DICTIONARY_COMMIT}?recursive=1`;
  const { tree, truncated } = JSON.parse(await fetchText(treeUrl));
  if (truncated) throw new Error(`${treeUrl}: tree listing truncated`);
  const paths = tree
    .filter((entry) => entry.type === "blob" && entry.path.endsWith(".md"))
    .map((entry) => entry.path);
  return Promise.all(
    paths.map(async (p) => {
      const encoded = p.split("/").map(encodeURIComponent).join("/");
      const url = `https://raw.githubusercontent.com/${DICTIONARY_REPO}/${DICTIONARY_COMMIT}/${encoded}`;
      return { name: p, text: await fetchText(url) };
    }),
  );
}

/** Whole file, front matter included: link text instead of links, NFC, lowercase, words only. */
function words(text) {
  return text
    .normalize("NFC")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function windowsOf(text) {
  const tokens = words(text);
  const windows = [];
  for (let i = 0; i + WINDOW <= tokens.length; i++) {
    windows.push(tokens.slice(i, i + WINDOW).join(" "));
  }
  return windows;
}

async function main() {
  const dictionary = await dictionaryFiles();
  const dictionaryWindows = new Map();
  for (const { name, text } of dictionary) {
    for (const window of windowsOf(text)) {
      if (!dictionaryWindows.has(window)) dictionaryWindows.set(window, name);
    }
  }

  const conceptFiles = (await readdir(CONCEPTS_DIR))
    .filter((f) => f.endsWith(".mdx"))
    .sort();
  let hits = 0;
  for (const file of conceptFiles) {
    const text = await readFile(path.join(CONCEPTS_DIR, file), "utf8");
    const reported = new Set();
    for (const window of windowsOf(text)) {
      if (dictionaryWindows.has(window) && !reported.has(window)) {
        reported.add(window);
        hits++;
        console.log(
          `content/concepts/${file}: "${window}" (also in ${dictionaryWindows.get(window)})`,
        );
      }
    }
  }

  console.log(
    `${dictionary.length} dictionary files at ${DICTIONARY_COMMIT.slice(0, 12)}, ${conceptFiles.length} concept files, ${hits} shared ${WINDOW}-word windows`,
  );
  return hits === 0 ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (err) {
  console.error(`check-overlap: ${err.message}`);
  process.exitCode = 2;
}
