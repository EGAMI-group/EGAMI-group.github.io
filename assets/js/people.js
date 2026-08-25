const currentContainer = document.querySelector("#current-members");
const alumniContainer = document.querySelector("#alumni-members");

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createCard(person) {
  const profileUrl = person.name
    ? `person.html?name=${encodeURIComponent(person.name)}`
    : person.profile;
  const card = profileUrl
    ? document.createElement("a")
    : document.createElement("article");
  card.className = "person-card";

  if (profileUrl) card.href = profileUrl;

  const image = document.createElement("img");
  image.className = "person-photo";
  image.src = person.photo || "assets/images/Default_pfp.jpg";
  image.alt = person.photo ? person.name : "Default profile image";
  card.append(image);

  const details = createElement("div", "person-details");
  details.append(createElement("h3", "person-name", person.name));
  details.append(createElement("p", "person-role", person.role));

  card.append(details);
  return card;
}

function renderGroup(container, title, people) {
  if (!people.length) return;

  container.append(createElement("h2", "", title));
  const grid = createElement("div", "people-grid");
  people.forEach((person) => grid.append(createCard(person)));
  container.append(grid);
}

async function loadPeople() {
  try {
    const response = await fetch("assets/data/people.json");
    if (!response.ok) throw new Error("Could not load the roster.");

    const roster = await response.json();
    // `_instructions` in people.json is for editors; only `people` is displayed.
    const people = Array.isArray(roster) ? roster : roster.people || [];
    const memberStatus = (person) => person.status || "active";
    const current = people.filter((person) => memberStatus(person) === "active");
    const alumni = people.filter((person) => memberStatus(person) === "alumni");

    renderGroup(currentContainer, "Current members", current);
    renderGroup(alumniContainer, "Alumni", alumni);

    if (!people.length) {
      currentContainer.append(
        createElement("p", "empty-roster", "No members have been added yet.")
      );
    }
  } catch (error) {
    currentContainer.append(
      createElement("p", "empty-roster", "The member list could not be loaded.")
    );
  }
}

loadPeople();
