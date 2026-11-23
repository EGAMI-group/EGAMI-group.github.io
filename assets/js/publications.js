const publicationResults = document.querySelector("#publication-results");
const personFilter = document.querySelector("#publication-person");
const roleFilter = document.querySelector("#publication-role");
const yearFilter = document.querySelector("#publication-year");
const authorshipFilter = document.querySelector("#publication-authorship");
const publicationReset = document.querySelector("#publication-reset");
// Authorship options: the latest author position a group member may hold.
// "any" is absent, so it applies no limit.
const authorshipPositionLimits = { first: 1, lead: 3 };
let memberRoles = new Map();
let groupMemberNames = [];

function publicationElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function addOptions(select, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

// Accents and case vary between ADS records (e.g. "Puskas" vs "Puskás").
function normalizeName(name) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

// The ADS forms of a member's name: "Surname, Given" and "Surname, G.".
function memberNameKeys(memberName) {
  const nameParts = memberName.trim().split(/\s+/);
  if (nameParts.length < 2) return [normalizeName(memberName)];

  const surname = nameParts.at(-1);
  const givenName = nameParts.slice(0, -1).join(" ");
  return [`${surname}, ${givenName}`, `${surname}, ${givenName.charAt(0)}.`].map(normalizeName);
}

const nameSuffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;

// ADS writes "Surname, Given", sometimes with a suffix ("Ryan, R. E., Jr").
// Show "Given Surname" so a comma-separated author list reads unambiguously.
function displayAuthorName(adsName) {
  const [surname, ...rest] = adsName.split(",").map((part) => part.trim()).filter(Boolean);
  if (!rest.length) return surname || adsName.trim();

  const suffix = nameSuffix.test(rest.at(-1)) ? rest.pop() : "";
  return [rest.join(" "), surname, suffix].filter(Boolean).join(" ");
}

function appendAuthorsWithHighlights(container, authors, members = []) {
  // Older papers.json files stored authors as one pre-joined string.
  if (!Array.isArray(authors)) {
    container.textContent = authors;
    return;
  }

  const memberKeys = members.flatMap(memberNameKeys);
  const isGroupMember = (adsName) => {
    const name = normalizeName(adsName);
    return memberKeys.some((key) => name === key || name.startsWith(`${key} `));
  };

  authors.forEach((adsName, index) => {
    if (index) container.append(document.createTextNode(", "));
    const displayName = displayAuthorName(adsName);
    if (isGroupMember(adsName)) {
      const highlightedAuthor = publicationElement("span", "group-author", displayName);
      highlightedAuthor.title = "EGAMI Group member";
      container.append(highlightedAuthor);
    } else {
      container.append(document.createTextNode(displayName));
    }
  });
}

const isPublicationArchive = publicationResults.dataset.showAll === "true";

function renderPublications(papers, showAll = isPublicationArchive) {
  publicationResults.replaceChildren();
  const person = personFilter.value;
  const role = roleFilter.value;
  const year = yearFilter.value;
  // Older papers.json files have no author positions; show everything until
  // the ADS workflow regenerates the file rather than an empty list.
  const positionLimit = papers.some((paper) => paper.groupAuthorPosition)
    ? authorshipPositionLimits[authorshipFilter.value]
    : undefined;
  const matching = papers.filter((paper) => {
    const hasPerson = !person || (paper.members || []).includes(person);
    const hasRole = !role || (paper.members || []).some((member) => memberRoles.get(member) === role);
    const hasYear = !year || String(paper.year) === year;
    const hasAuthorship = !positionLimit || paper.groupAuthorPosition <= positionLimit;
    return hasPerson && hasRole && hasYear && hasAuthorship;
  });

  if (!matching.length) {
    publicationResults.append(
      publicationElement(
        "p",
        "empty-publications",
        papers.length
          ? "No publications match these filters."
          : "The automatically updated group publication list will appear here."
      )
    );
    return;
  }

  const sortKey = (paper) => paper.date || String(paper.year);
  matching.sort((first, second) => sortKey(second).localeCompare(sortKey(first)));
  const visiblePapers = showAll ? matching : matching.slice(0, 5);

  publicationResults.append(
    publicationElement(
      "p",
      "publication-summary",
      `Showing ${visiblePapers.length} of ${matching.length} publications`
    )
  );

  visiblePapers.forEach((paper) => {
      const article = publicationElement("article", "publication-card");
      article.append(publicationElement("p", "publication-meta", `${paper.year} · ${paper.type}`));
      article.append(publicationElement("h3", "publication-title", paper.title));
      if (paper.authors) {
        const authors = publicationElement("p", "publication-authors");
        appendAuthorsWithHighlights(authors, paper.authors, groupMemberNames);
        article.append(authors);
      }

      const links = publicationElement("div", "publication-links");
      [
        ["ADS", paper.adsUrl],
        ["arXiv", paper.arxivUrl],
        ["DOI", paper.doiUrl]
      ].forEach(([label, url]) => {
        if (!url) return;
        const link = publicationElement("a", "", label);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
      });
      if (links.childElementCount) article.append(links);
      publicationResults.append(article);
  });

  if (!showAll && matching.length > visiblePapers.length) {
    const showAllLink = publicationElement(
      "a",
      "show-all-publications",
      `Show all ${matching.length} publications`
    );
    showAllLink.href = "publications.html";
    publicationResults.append(showAllLink);
  }
}

async function loadPublicationExplorer() {
  try {
    const [peopleResponse, papersResponse] = await Promise.all([
      fetch("assets/data/people.json"),
      fetch("assets/data/papers.json")
    ]);
    if (!peopleResponse.ok || !papersResponse.ok) throw new Error("Could not load data.");

    const roster = await peopleResponse.json();
    const paperData = await papersResponse.json();
    const people = Array.isArray(roster) ? roster : roster.people || [];
    const papers = Array.isArray(paperData) ? paperData : paperData.papers || [];
    memberRoles = new Map(people.map((person) => [person.name, person.role]).filter(([, role]) => role));
    groupMemberNames = people.map((person) => person.name).filter(Boolean);

    addOptions(personFilter, people.map((person) => person.name).sort());
    addOptions(roleFilter, [...new Set(memberRoles.values())].sort());
    addOptions(yearFilter, [...new Set(papers.map((paper) => String(paper.year)))].sort().reverse());

    [personFilter, roleFilter, yearFilter, authorshipFilter].forEach((filter) => {
      filter.addEventListener("change", () => renderPublications(papers, isPublicationArchive));
    });
    if (publicationReset) {
      publicationReset.addEventListener("click", () => {
        personFilter.value = "";
        roleFilter.value = "";
        yearFilter.value = "";
        authorshipFilter.value = "lead";
        renderPublications(papers, isPublicationArchive);
      });
    }

    renderPublications(papers, isPublicationArchive);
  } catch (error) {
    publicationResults.textContent = "The publication list could not be loaded.";
  }
}

loadPublicationExplorer();
