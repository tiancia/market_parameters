const search = document.querySelector("#term-search");
const clearSearch = document.querySelector("#clear-search");
const searchKey = document.querySelector("#search-key");
const filters = document.querySelector("#market-filters");
const browseBar = document.querySelector(".browse-bar");
const catalog = document.querySelector("#catalog");
const entries = document.querySelector("#entries");
const title = document.querySelector("#catalog-title");
const count = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
const template = document.querySelector("#term-template");
let activeMarket = "all";

function normalize(text) {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, "");
}

function renderEntry(term, market) {
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

  const names = [market.name, market.id, term.name, term.english, term.symbol || "", ...(term.aliases || "").split(/\s+/)];
  const shortNames = new Set(names.map(normalize));
  for (const word of names.join(" ").toLowerCase().match(/[a-z0-9]+/g) || []) {
    shortNames.add(word);
  }
  const searchable = [...names, term.question, term.meaning, term.unit].map(normalize);
  return { element, shortNames, searchable };
}

const groups = markets.map((market) => {
  const section = document.createElement("section");
  section.className = "market-section";
  const header = document.createElement("div");
  header.className = "group-heading";
  const heading = document.createElement("h3");
  heading.id = "group-" + market.id;
  heading.textContent = market.name;
  section.setAttribute("aria-labelledby", heading.id);
  header.append(heading);
  for (const label of ["计算口径", "单位"]) {
    const column = document.createElement("span");
    column.textContent = label;
    header.append(column);
  }
  section.append(header);
  const rows = market.terms.map((term) => renderEntry(term, market));
  section.append(...rows.map((row) => row.element));
  entries.append(section);
  return { market, section, rows };
});

function addFilter(id, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.market = id;
  button.setAttribute("aria-controls", "entries");
  button.textContent = label;
  button.addEventListener("click", () => {
    const scrolledPastStart = catalog.getBoundingClientRect().top < browseBar.getBoundingClientRect().bottom;
    activeMarket = id;
    updateResults();
    if (scrolledPastStart) catalog.scrollIntoView({ block: "start" });
  });
  filters.append(button);
}

function updateResults() {
  const tokens = search.value.trim().split(/\s+/).map(normalize).filter(Boolean);
  let total = 0;
  let selectedName = "";
  for (const { market, section, rows } of groups) {
    const inMarket = activeMarket === "all" || activeMarket === market.id;
    if (activeMarket === market.id) selectedName = market.name;
    let matches = 0;
    for (const row of rows) {
      const visible = inMarket && tokens.every((token) => {
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
  for (const button of filters.children) {
    button.setAttribute("aria-pressed", String(button.dataset.market === activeMarket));
  }
  title.textContent = selectedName ? selectedName + "参数" : "参数索引";
  count.textContent = (tokens.length ? "找到 " : "共 ") + total + " 个词条";
  emptyState.hidden = total !== 0;
  clearSearch.hidden = search.value.length === 0;
  searchKey.hidden = !clearSearch.hidden;
}

addFilter("all", "全部市场");
for (const { market } of groups) addFilter(market.id, market.name);
updateResults();

function clearQuery() {
  search.value = "";
  updateResults();
  search.focus();
}

search.addEventListener("input", updateResults);
clearSearch.addEventListener("click", clearQuery);
document.querySelector("#reset-filters").addEventListener("click", () => {
  activeMarket = "all";
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
