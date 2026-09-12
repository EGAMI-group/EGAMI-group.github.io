// Shared tag rendering for the People cards and the profile pages.
// Loaded before people.js and person.js, which both call createTagGroups.
// Every field this file reads from people.json is optional.

function tagElement(className, text, title, url) {
  const tag = document.createElement(url ? "a" : "span");
  tag.className = className;
  tag.textContent = text;
  if (title && title !== text) tag.title = title;

  if (url) {
    tag.href = url;
    tag.target = "_blank";
    tag.rel = "noopener noreferrer";
  }

  return tag;
}

// honors accepts a plain string, or an object with short / name / url.
// Both forms may be given on their own or inside an array.
function normalizeHonors(honors) {
  if (!honors) return [];

  return (Array.isArray(honors) ? honors : [honors])
    .map((honor) => (typeof honor === "string" ? { name: honor } : honor || {}))
    .map((honor) => ({
      short: honor.short?.trim() || honor.name?.trim() || "",
      full: honor.name?.trim() || honor.short?.trim() || "",
      url: honor.url?.trim() || null
    }))
    .filter((honor) => honor.short);
}

function normalizeInterests(interests) {
  if (!interests) return [];

  return (Array.isArray(interests) ? interests : [interests])
    .map((interest) => String(interest).trim())
    .filter(Boolean);
}

function tagRow(className, tags) {
  const row = document.createElement("div");
  row.className = className;
  tags.forEach((tag) => row.append(tag));
  return row;
}

// Builds the role/honour row and the research interest row for one person.
// includeRole: cards show the role as a tag, profile pages print it above instead.
// fullHonors:  profile pages have room for "NSF Graduate Research Fellow",
//              cards fall back to the shorter "NSF GRFP".
// linkHonors:  a card is itself a link, so its honours must not be links too.
function createTagGroups(
  person,
  { includeRole = true, fullHonors = false, linkHonors = false } = {}
) {
  const groups = document.createDocumentFragment();
  const role = person.role?.trim();
  const honors = normalizeHonors(person.honors);
  const interests = normalizeInterests(person.interests);

  const statusTags = [];
  if (includeRole && role) statusTags.push(tagElement("person-tag tag-role", role));
  honors.forEach((honor) => {
    statusTags.push(
      tagElement(
        "person-tag tag-honor",
        fullHonors ? honor.full : honor.short,
        honor.full,
        linkHonors ? honor.url : null
      )
    );
  });
  if (statusTags.length) groups.append(tagRow("person-tags", statusTags));

  const interestTags = interests.map((interest) => tagElement("person-tag tag-interest", interest));
  if (interestTags.length) groups.append(tagRow("person-tags", interestTags));

  return groups;
}
