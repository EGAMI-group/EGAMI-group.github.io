const publicationResults = document.querySelector("#publication-results");
const personFilter = document.querySelector("#publication-person");
const yearFilter = document.querySelector("#publication-year");
const typeFilter = document.querySelector("#publication-type");
const publicationReset = document.querySelector("#publication-reset");

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

const isPublicationArchive = publicationResults.dataset.showAll === "true";

function renderPublications(papers, showAll = isPublicationArchive) {
  publicationResults.replaceChildren();
  const person = personFilter.value;
  const year = yearFilter.value;
  const type = typeFilter.value;
  const matching = papers.filter((paper) => {
    const hasPerson = !person || (paper.members || []).includes(person);
    const hasYear = !year || String(paper.year) === year;
    const hasType = !type || paper.type === type;
    return hasPerson && hasYear && hasType;
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

  matching.sort((first, second) => Number(second.year) - Number(first.year));
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
      if (paper.authors) article.append(publicationElement("p", "publication-authors", paper.authors));

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

    addOptions(personFilter, people.map((person) => person.name).sort());
    addOptions(yearFilter, [...new Set(papers.map((paper) => String(paper.year)))].sort().reverse());
    addOptions(typeFilter, [...new Set(papers.map((paper) => paper.type))].filter(Boolean).sort());

    [personFilter, yearFilter, typeFilter].forEach((filter) => {
      filter.addEventListener("change", () => renderPublications(papers, isPublicationArchive));
    });
    if (publicationReset) {
      publicationReset.addEventListener("click", () => {
        personFilter.value = "";
        yearFilter.value = "";
        typeFilter.value = "";
        renderPublications(papers, isPublicationArchive);
      });
    }

    renderPublications(papers, isPublicationArchive);
  } catch (error) {
    publicationResults.textContent = "The publication list could not be loaded.";
  }
}

loadPublicationExplorer();
