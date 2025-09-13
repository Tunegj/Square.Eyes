const API_URL = "https://v2.api.noroff.dev/square-eyes";

async function fetchProducts() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

document.addEventListener("DOMContentLoaded", async () => {
  Cart.updateCartHeader();

  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("products");
  const genreSel = document.getElementById("genre");
  const priceSel = document.getElementById("price");
  const sortSel = document.getElementById("sort");
  const searchEl = document.getElementById("search");
  const clearBtn =
    document.getElementById("clear-filters") ||
    document.getElementById("clear-filter");

  statusEl?.setAttribute("role", "status");
  statusEl?.setAttribute("aria-live", "polite");
  const debouncedApply = debounce(applyFiltersAndSort, 200);

  let allProducts = [];

  function uniqueGenres(items) {
    const set = new Set();
    for (const p of items) {
      if (typeof p.genre === "string" && p.genre.trim()) {
        set.add(p.genre.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  function populateGenres(items) {
    if (!genreSel) return;
    while (genreSel.options.length > 1) genreSel.remove(1);
    for (const g of uniqueGenres(items)) {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      genreSel.appendChild(opt);
    }
  }

  function debounce(fn, ms = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function unitPrice(p) {
    const n = Number(p.onSale ? p.discountedPrice : p.price);
    return Number.isFinite(n) ? n : 0;
  }

  function readPriceRange() {
    const v = priceSel?.value || "";
    if (!v) return { min: null, max: null };
    const [min, max] = v.split("-").map(Number);
    return {
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
    };
  }

  function applyFiltersAndSort() {
    const genre = (genreSel?.value || "").trim();
    const { min, max } = readPriceRange();
    const sort = (sortSel?.value || "").trim();
    const q = (searchEl?.value || "").trim().toLowerCase();

    let items = allProducts.slice();

    if (genre) {
      items = items.filter(
        (p) => (p.genre || "").toLowerCase() === genre.toLowerCase()
      );
    }

    if (q) {
      items = items.filter((p) => (p.title || "").toLowerCase().includes(q));
    }

    if (min != null) items = items.filter((p) => unitPrice(p) >= min);
    if (max != null) items = items.filter((p) => unitPrice(p) <= max);

    switch (sort) {
      case "price-asc":
        items.sort((a, b) => unitPrice(a) - unitPrice(b));
        break;
      case "price-desc":
        items.sort((a, b) => unitPrice(b) - unitPrice(a));
        break;
      case "title-asc":
        items.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "title-desc":
        items.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
      case "rating-asc":
        items.sort((a, b) => (Number(a.rating) || 0) - (Number(b.rating) || 0));
        break;
      case "rating-desc":
        items.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        break;
    }

    renderProducts(items);

    const parts = [];

    if (genre && genre !== "all") parts.push(`genre "${genre}"`);
    if (q) parts.push(`title contains "${q}"`);
    if (min != null || max != null)
      parts.push(`price ${min ?? "…"}–${max ?? "…"}`);
    statusEl.textContent = parts.length
      ? `Showing ${items.length} of ${allProducts.length} movies (${parts.join(
          ", "
        )}).`
      : `Showing ${items.length} of ${allProducts.length} movies.`;
  }

  clearBtn?.addEventListener("click", () => {
    genreSel.value = "";
    priceSel.value = "";
    sortSel.value = "price-asc";
    if (searchEl) searchEl.value = "";
    applyFiltersAndSort();
  });

  genreSel?.addEventListener("change", applyFiltersAndSort);
  priceSel?.addEventListener("change", applyFiltersAndSort);
  sortSel?.addEventListener("change", applyFiltersAndSort);
  searchEl?.addEventListener("input", debouncedApply);

  try {
    allProducts = await fetchProducts();
    populateGenres(allProducts);
    applyFiltersAndSort();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load products.";
  }

  function nok(n) {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  }

  function renderProducts(items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = "<li>No products found.</li>";
      return;
    }

    listEl.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (const p of items) {
      const li = document.createElement("li");

      const a = document.createElement("a");
      a.href = `product/index.html?id=${encodeURIComponent(p.id)}`;

      const img = document.createElement("img");
      img.src = p.image?.url || "";
      img.alt = p.image?.alt || p.title || "Product image";
      img.loading = "lazy";

      const h3 = document.createElement("h3");
      h3.textContent = p.title || "Untitled";

      const ratingP = document.createElement("p");
      ratingP.className = "rating";

      const star = document.createElement("span");
      star.textContent = "★"; // or "⭐"
      star.className = "rating-star";
      star.setAttribute("aria-hidden", "true");

      const rating = Number(p.rating);
      ratingP.append(
        "IMDb rating: ",
        star,
        " ",
        Number.isFinite(rating) ? rating.toFixed(1) : "N/A"
      );

      const priceP = document.createElement("p");
      priceP.className = "price";

      if (p.onSale) {
        const now = document.createElement("span");
        now.className = "price-now";
        now.textContent = nok(p.discountedPrice);

        const was = document.createElement("s");
        was.className = "price-was";
        was.textContent = nok(p.price);

        priceP.innerHTML = "";
        priceP.append(now, " ", was);
      } else {
        priceP.textContent = nok(p.price);
      }

      a.append(img, h3, priceP, ratingP);
      li.appendChild(a);
      frag.appendChild(li);
    }

    listEl.appendChild(frag);
  }
});
