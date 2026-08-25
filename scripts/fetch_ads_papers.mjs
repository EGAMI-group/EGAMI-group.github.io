import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const apiToken = process.env.ADS_API_TOKEN;
const peoplePath = resolve("assets/data/people.json");
const papersPath = resolve("assets/data/papers.json");

if (!apiToken) {
  throw new Error("ADS_API_TOKEN is required to fetch publications.");
}

function getRoster(data) {
  return Array.isArray(data) ? data : data.people || [];
}

function publicationType(doctype) {
  const labels = {
    article: "Journal article",
    eprint: "Preprint",
    inproceedings: "Conference paper",
    proceedings: "Conference proceeding",
    software: "Software",
    phdthesis: "PhD thesis",
    mastersthesis: "Master's thesis",
    talk: "Talk"
  };
  return labels[doctype] || doctype || "Publication";
}

function arxivUrl(identifiers = []) {
  const identifier = identifiers.find((value) => /^arxiv:/i.test(value));
  if (!identifier) return undefined;
  return `https://arxiv.org/abs/${identifier.replace(/^arxiv:/i, "")}`;
}

async function searchAds(author) {
  const url = new URL("https://api.adsabs.harvard.edu/v1/search/query");
  url.search = new URLSearchParams({
    q: `author:"${author}"`,
    fl: "bibcode,title,author,year,doctype,pub,doi,identifier",
    rows: "2000",
    sort: "date desc,bibcode desc"
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` }
  });

  if (!response.ok) {
    throw new Error(`ADS search failed for ${author}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response?.docs || [];
}

const rosterData = JSON.parse(await readFile(peoplePath, "utf8"));
const members = getRoster(rosterData).filter((person) => person.adsAuthor);
const publications = new Map();

for (const member of members) {
  console.log(`Fetching ADS papers for ${member.name}...`);
  const documents = await searchAds(member.adsAuthor);

  for (const document of documents) {
    if (!document.bibcode || !document.title?.[0]) continue;

    const existing = publications.get(document.bibcode);
    if (existing) {
      existing.members.push(member.name);
      continue;
    }

    publications.set(document.bibcode, {
      title: document.title[0],
      authors: (document.author || []).join(", "),
      year: document.year,
      type: publicationType(document.doctype),
      members: [member.name],
      adsUrl: `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(document.bibcode)}/abstract`,
      arxivUrl: arxivUrl(document.identifier),
      doiUrl: document.doi?.[0] ? `https://doi.org/${document.doi[0]}` : undefined
    });
  }
}

const papers = [...publications.values()]
  .map((paper) => ({ ...paper, members: [...new Set(paper.members)].sort() }))
  .sort((first, second) => Number(second.year) - Number(first.year));

const output = {
  _instructions: [
    "This file is generated automatically by the ADS update workflow.",
    "Do not edit the papers array by hand; edit people.json to update the group roster instead."
  ],
  generatedAt: new Date().toISOString(),
  papers
};

await writeFile(papersPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${papers.length} unique publications from ${members.length} group members.`);
