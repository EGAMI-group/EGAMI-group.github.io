const currentContainer = document.querySelector("#current-members");
const alumniContainer = document.querySelector("#alumni-members");

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createCard(person) {
  const card = person.profile
    ? document.createElement("a")
    : document.createElement("article");
  card.className = "person-card";

  if (person.profile) card.href = person.profile;

  if (person.photo) {
    const image = document.createElement("img");
    image.className = "person-photo";
    image.src = person.photo;
    image.alt = person.name;
    card.append(image);
  } else {
    card.append(createElement("div", "person-photo-placeholder"));
  }

  const details = createElement("div", "person-details");
  details.append(createElement("h3", "person-name", person.name));
  details.append(createElement("p", "person-role", person.role));

  if (person.interests) {
    details.append(createElement("p", "person-interests", person.interests));
  }

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
    const current = people.filter((person) => person.status === "current");
    const alumni = people.filter((person) => person.status === "alumni");

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
