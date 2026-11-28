const search = document.querySelector("#term-search");
const clearSearch = document.querySelector("#clear-search");
const searchKey = document.querySelector("#search-key");
const browseBar = document.querySelector(".browse-bar");
const catalog = document.querySelector("#catalog");
const entries = document.querySelector("#entries");
const title = document.querySelector("#catalog-title");
const count = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#term-template");
let activeCategory = "all";

function normalize(text) {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, "");
}

function renderEntry(term, category) {
  const element = template.content.firstElementChild.cloneNode(true);
  for (const field of element.querySelectorAll("[data-field]")) {
    const value = term[field.dataset.field];
    if (value) field.textContent = value;
    else field.hidden = true;
  }
  const source = sources[term.source];
  const link = element.querySelector(".source");
  link.textContent = source.label;
  link.href = source.url;

  const names = [category.name, category.id, term.name, term.english, term.symbol || "", ...(term.aliases || "").split(/\s+/)];
  const shortNames = new Set(names.map(normalize));
  for (const word of names.join(" ").toLowerCase().match(/[a-z0-9]+/g) || []) {
    shortNames.add(word);
  }
  const searchable = [...names, term.question, term.meaning, term.unit].map(normalize);
  return { element, shortNames, searchable };
}

const groups = categories.map((category) => {
  const section = document.createElement("section");
  section.className = "category-section";
  const header = document.createElement("div");
  header.className = "group-heading";
  const heading = document.createElement("h3");
  heading.id = "group-" + category.id;
  heading.textContent = category.name;
  section.setAttribute("aria-labelledby", heading.id);
  header.append(heading);
  for (const label of ["计算口径", "单位"]) {
    const column = document.createElement("span");
    column.textContent = label;
    header.append(column);
  }
  section.append(header);
  const rows = category.terms.map((term) => renderEntry(term, category));
  section.append(...rows.map((row) => row.element));
  entries.append(section);
  return { category, section, rows };
});

function addFilter(id, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.category = id;
  button.setAttribute("aria-controls", "entries");
  button.textContent = label;
  button.addEventListener("click", () => {
    const scrolledPastStart = catalog.getBoundingClientRect().top < browseBar.getBoundingClientRect().bottom;
    activeCategory = id;
    updateResults();
    if (scrolledPastStart) catalog.scrollIntoView({ block: "start" });
  });
  browseBar.insertBefore(button, count);
}

function updateResults() {
  const tokens = search.value.trim().split(/\s+/).map(normalize).filter(Boolean);
  let total = 0;
  let selectedName = "";
  for (const { category, section, rows } of groups) {
    const inCategory = activeCategory === "all" || activeCategory === category.id;
    if (activeCategory === category.id) selectedName = category.name;
    let matches = 0;
    for (const row of rows) {
      const visible = inCategory && tokens.every((token) => {
        // 短缩写按完整词匹配，以免 PE 也命中 expense。
        if (/^[a-z0-9]{1,3}$/.test(token)) return row.shortNames.has(token);
        return row.searchable.some((value) => value.includes(token));
      });
      row.element.hidden = !visible;
      if (visible) matches++;
    }
    section.hidden = !matches;
    total += matches;
  }
  for (const button of browseBar.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.category === activeCategory));
  }
  title.textContent = selectedName ? selectedName + "词条" : "指标索引";
  count.textContent = (tokens.length ? "找到 " : "共 ") + total + " 个词条";
  emptyState.hidden = total !== 0;
  clearSearch.hidden = search.value.length === 0;
  searchKey.hidden = !clearSearch.hidden;
}

addFilter("all", "全部分类");
for (const { category } of groups) addFilter(category.id, category.name);
updateResults();

function clearQuery() {
  search.value = "";
  updateResults();
  search.focus();
}

search.addEventListener("input", updateResults);
clearSearch.addEventListener("click", clearQuery);
document.querySelector("#reset-filters").addEventListener("click", () => {
  activeCategory = "all";
  clearQuery();
});
document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  catalog.focus({ preventScroll: true });
  catalog.scrollIntoView({ block: "start" });
});
document.addEventListener("keydown", (event) => {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === "/" && !event.target.matches("input, textarea, select, [contenteditable=true]")) {
    event.preventDefault();
    search.focus();
  } else if (event.key === "Escape" && event.target === search && search.value) {
    event.preventDefault();
    clearQuery();
  }
});

const price = document.querySelector("#bond-price");
const faceValue = Number(document.querySelector("#face-value").textContent);
const coupon = Number(document.querySelector("#annual-coupon").textContent);
document.querySelector("#coupon-rate").textContent = (coupon / faceValue * 100).toFixed(2);
document.querySelector("#coupon-division").textContent = coupon + " ÷ " + faceValue + "（面值）";

function updateBondExample() {
  const marketPrice = price.valueAsNumber;
  document.querySelector("#price-value").value = marketPrice + " 元";
  document.querySelector("#current-yield").value = (coupon / marketPrice * 100).toFixed(2);
  document.querySelector("#current-division").textContent = coupon + " ÷ " + marketPrice + "（市价）";
  price.setAttribute("aria-valuetext", marketPrice + " 元");
}

price.addEventListener("input", updateBondExample);
updateBondExample();
if (window.matchMedia("(max-width: 54rem)").matches) {
  document.querySelector("#bond-example").open = false;
}
