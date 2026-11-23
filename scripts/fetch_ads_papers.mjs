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
    abstract: "Meeting abstract",
    proposal: "Observing proposal",
    circular: "Astronomical circular",
    newsletter: "Newsletter",
    catalog: "Catalog",
    dataset: "Dataset",
    software: "Software",
    book: "Book",
    inbook: "Book chapter",
    erratum: "Erratum",
    bookreview: "Book review",
    pressrelease: "Press release",
    phdthesis: "PhD thesis",
    mastersthesis: "Master's thesis",
    talk: "Talk",
    misc: "Other"
  };
  if (labels[doctype]) return labels[doctype];
  if (!doctype) return "Publication";

  // ADS adds doctypes over time. Show an unrecognised one capitalised rather
  // than raw, so it still reads correctly next to the labels above.
  return doctype.charAt(0).toUpperCase() + doctype.slice(1);
}

function arxivUrl(identifiers = []) {
  const identifier = identifiers.find((value) => /^arxiv:/i.test(value));
  if (!identifier) return undefined;
  return `https://arxiv.org/abs/${identifier.replace(/^arxiv:/i, "")}`;
}

function adsQuery(person) {
  const orcid = person.orcid?.trim();
  return orcid ? `orcid:${orcid}` : null;
}

async function searchAds(query, memberName) {
  const url = new URL("https://api.adsabs.harvard.edu/v1/search/query");
  url.search = new URLSearchParams({
    q: query,
    fl: "bibcode,title,author,year,date,doctype,pub,doi,identifier,orcid_pub,orcid_user,orcid_other",
    rows: "2000",
    sort: "date desc,bibcode desc"
  });

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiToken}` }
  });

  if (!response.ok) {
    throw new Error(`ADS search failed for ${memberName}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response?.docs || [];
}

// Accents and case vary between ADS records (e.g. "Puskas" vs "Puskás").
function normalizeName(name) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// ADS's orcid_pub/orcid_user/orcid_other lists line up with the author list
// ("-" where unknown), so they give the exact 1-based position of a member.
function orcidAuthorPosition(document, orcid) {
  for (const field of ["orcid_pub", "orcid_user", "orcid_other"]) {
    const index = (document[field] || []).indexOf(orcid);
    if (index !== -1) return index + 1;
  }
  return undefined;
}

function earliestPosition(...positions) {
  const known = positions.filter(Number.isInteger);
  return known.length ? Math.min(...known) : undefined;
}

const rosterData = JSON.parse(await readFile(peoplePath, "utf8"));
const roster = getRoster(rosterData);
const members = roster.filter((person) => adsQuery(person));
const publications = new Map();

// Backup for papers a member hasn't linked to their ORCID: match the full
// "Surname, Given" name only. Initials ("Liu, Y.") are too common to trust.
const rosterNameKeys = roster
  .map((person) => person.name?.trim().split(/\s+/) || [])
  .filter((nameParts) => nameParts.length > 1)
  .map((nameParts) => normalizeName(`${nameParts.at(-1)}, ${nameParts.slice(0, -1).join(" ")}`));

function nameAuthorPosition(authors) {
  const index = authors.findIndex((author) => {
    const name = normalizeName(author);
    return rosterNameKeys.some((key) => name === key || name.startsWith(`${key} `));
  });
  return index === -1 ? undefined : index + 1;
}

for (const member of members) {
  const query = adsQuery(member);
  console.log(`Fetching ADS papers for ${member.name} using ORCID...`);
  const documents = await searchAds(query, member.name);

  for (const document of documents) {
    if (!document.bibcode || !document.title?.[0]) continue;

    const memberPosition = orcidAuthorPosition(document, member.orcid.trim());
    const existing = publications.get(document.bibcode);
    if (existing) {
      existing.members.push(member.name);
      existing.groupAuthorPosition = earliestPosition(existing.groupAuthorPosition, memberPosition);
      continue;
    }

    const authors = document.author || [];
    publications.set(document.bibcode, {
      title: document.title[0],
      // Keep ADS's "Surname, Given" names as a list: joined into one string,
      // the commas inside and between names become indistinguishable.
      authors,
      year: document.year,
      // ADS gives e.g. "2026-11-01T00:00:00Z"; month precision is what drives ordering.
      date: document.date?.slice(0, 10),
      type: publicationType(document.doctype),
      members: [member.name],
      // 1-based author position of the earliest group member; the site uses it
      // to show group-led papers (a member among the first authors) by default.
      groupAuthorPosition: earliestPosition(memberPosition, nameAuthorPosition(authors)),
      adsUrl: `https://ui.adsabs.harvard.edu/abs/${encodeURIComponent(document.bibcode)}/abstract`,
      arxivUrl: arxivUrl(document.identifier),
      doiUrl: document.doi?.[0] ? `https://doi.org/${document.doi[0]}` : undefined
    });
  }
}

// Papers were collected member by member, so sort the whole list newest first.
// Sorting by year alone would leave each year grouped by roster order, burying
// other members' new papers beneath every earlier paper by the first member.
const papers = [...publications.entries()]
  .sort(([firstBibcode, first], [secondBibcode, second]) =>
    (second.date || String(second.year)).localeCompare(first.date || String(first.year)) ||
    secondBibcode.localeCompare(firstBibcode)
  )
  .map(([, paper]) => ({ ...paper, members: [...new Set(paper.members)].sort() }));

// Keep the previous timestamp when nothing changed, so the workflow does not
// commit (and redeploy the site) every week just to bump generatedAt.
let generatedAt = new Date().toISOString();
try {
  const previous = JSON.parse(await readFile(papersPath, "utf8"));
  if (previous.generatedAt && JSON.stringify(previous.papers) === JSON.stringify(papers)) {
    generatedAt = previous.generatedAt;
  }
} catch {
  // No previous file (or unreadable): use the new timestamp.
}

const output = {
  _instructions: [
    "This file is generated automatically by the ADS update workflow.",
    "Do not edit the papers array by hand; edit people.json to update the group roster instead."
  ],
  generatedAt,
  papers
};

await writeFile(papersPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${papers.length} unique publications from ${members.length} group members.`);
const groupLed = papers.filter((paper) => paper.groupAuthorPosition <= 3).length;
const unplaced = papers.filter((paper) => !paper.groupAuthorPosition).length;
console.log(`${groupLed} have a group member among the first 3 authors; ${unplaced} have no group author position.`);
