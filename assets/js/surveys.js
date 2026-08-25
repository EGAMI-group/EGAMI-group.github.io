const surveyContainer = document.querySelector("#survey-links");

function surveyElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

async function loadSurveys() {
  try {
    const response = await fetch("assets/data/surveys.json");
    if (!response.ok) throw new Error("Could not load surveys.");

    const data = await response.json();
    const surveys = Array.isArray(data) ? data : data.surveys || [];

    if (!surveys.length) {
      surveyContainer.append(
        surveyElement("p", "empty-surveys", "Survey links will appear here.")
      );
      return;
    }

    surveys.forEach((survey) => {
      const link = document.createElement("a");
      link.className = "survey-card";
      link.href = survey.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (survey.logo) {
        const logo = document.createElement("img");
        logo.className = "survey-logo";
        logo.src = survey.logo;
        logo.alt = `${survey.name} logo`;
        link.append(logo);
      }
      link.append(surveyElement("h3", "survey-name", survey.name));
      if (survey.description) {
        link.append(surveyElement("p", "survey-description", survey.description));
      }
      link.append(surveyElement("span", "survey-action", "Visit survey website ↗"));
      surveyContainer.append(link);
    });
  } catch (error) {
    surveyContainer.append(
      surveyElement("p", "empty-surveys", "Survey links could not be loaded.")
    );
  }
}

loadSurveys();
