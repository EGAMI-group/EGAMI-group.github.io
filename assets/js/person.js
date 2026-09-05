const profileContainer = document.querySelector("#profile");
const defaultPhoto = "assets/images/Default_pfp.jpg";

function photoUrl(photo) {
  const filename = photo?.trim();
  if (!filename) return defaultPhoto;
  return filename.includes("/") ? filename : `assets/images/profile_pictures/${filename}`;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function adsUrl(person) {
  const orcid = person.orcid?.trim();
  if (!orcid) return null;
  return `https://ui.adsabs.harvard.edu/search/q=${encodeURIComponent(`orcid:${orcid}`)}`;
}

function renderProfile(person) {
  document.title = `${person.name} | EGAMI Group`;

  const layout = createElement("article", "profile-layout");
  const image = document.createElement("img");
  image.className = "profile-photo";
  image.src = photoUrl(person.photo);
  image.alt = person.photo?.trim() ? person.name : "Default profile image";
  layout.append(image);

  const content = createElement("div", "profile-content");
  content.append(createElement("a", "back-link", "← Back to People"));
  content.lastChild.href = "index.html#people";
  content.append(createElement("h1", "profile-name", person.name));
  content.append(createElement("p", "profile-role", person.role));

  if (person.interests) {
    content.append(createElement("h2", "profile-heading", "Research interests"));
    content.append(createElement("p", "profile-interests", person.interests));
  }

  const profileLinks = createElement("div", "profile-links");
  if (person.email?.trim()) {
    const email = person.email.trim();
    const emailLink = document.createElement("a");
    emailLink.className = "profile-external-link";
    emailLink.href = `mailto:${email}`;
    emailLink.textContent = email;
    profileLinks.append(emailLink);
  }

  if (person.website) {
    const website = document.createElement("a");
    website.className = "profile-external-link";
    website.href = person.website;
    website.target = "_blank";
    website.rel = "noopener noreferrer";
    website.textContent = "Personal website ↗";
    profileLinks.append(website);
  }

  const papersUrl = adsUrl(person);
  if (papersUrl) {
    const papers = document.createElement("a");
    papers.className = "profile-external-link";
    papers.href = papersUrl;
    papers.target = "_blank";
    papers.rel = "noopener noreferrer";
    papers.textContent = "View papers on ADS ↗";
    profileLinks.append(papers);
  }

  if (profileLinks.childElementCount) {
    content.append(profileLinks);
  }

  layout.append(content);
  profileContainer.replaceChildren(layout);
}

async function loadProfile() {
  const name = new URLSearchParams(window.location.search).get("name");

  if (!name) {
    profileContainer.textContent = "No group member was selected.";
    return;
  }

  try {
    const response = await fetch("assets/data/people.json");
    if (!response.ok) throw new Error("Could not load the roster.");

    const roster = await response.json();
    const people = Array.isArray(roster) ? roster : roster.people || [];
    const person = people.find((member) => member.name === name);

    if (!person) {
      profileContainer.textContent = "This group member could not be found.";
      return;
    }

    renderProfile(person);
  } catch (error) {
    profileContainer.textContent = "This profile could not be loaded.";
  }
}

loadProfile();
