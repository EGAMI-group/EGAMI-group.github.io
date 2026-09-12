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

function normalizeThemes(themes) {
  if (!themes) return [];

  return (Array.isArray(themes) ? themes : [themes])
    .map((theme) => String(theme).trim())
    .filter(Boolean);
}

function tagRow(className, tags) {
  const row = document.createElement("div");
  row.className = className;
  tags.forEach((tag) => row.append(tag));
  return row;
}

// Builds the role/honour row and the research theme row for one person.
// includeRole: cards show the role as a tag, profile pages print it above instead.
// maxThemes:   cards show only the first few themes so they stay the same height.
// fullHonors:  profile pages have room for "NSF Graduate Research Fellow",
//              cards fall back to the shorter "NSF GRFP".
// linkHonors:  a card is itself a link, so its honours must not be links too.
function createTagGroups(
  person,
  { includeRole = true, maxThemes = Infinity, fullHonors = false, linkHonors = false } = {}
) {
  const groups = document.createDocumentFragment();
  const role = person.role?.trim();
  const honors = normalizeHonors(person.honors);
  const themes = normalizeThemes(person.themes);

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

  const themeTags = themes
    .slice(0, maxThemes)
    .map((theme) => tagElement("person-tag tag-theme", theme));
  if (themeTags.length) groups.append(tagRow("person-tags", themeTags));

  return groups;
}
