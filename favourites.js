const KEY = "square-eyes-favourites";

export function getFavourites() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavourite(id) {
  return getFavourites().includes(id);
}

export function toggleFavourite(id) {
  const favs = getFavourites();

  const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];

  localStorage.setItem(KEY, JSON.stringify(next));
  return next.includes(id);
}

export function createFavouriteButton(id) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fav-btn";
  btn.setAttribute("aria-label", "Toggle favourite");

  function setState() {
    const fav = isFavourite(id);
    btn.textContent = fav ? "♥" : "♡";
    btn.setAttribute("aria-pressed", fav ? "true" : "false");
  }
  setState();

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    toggleFavourite(id);
    setState();
  });

  return btn;
}
