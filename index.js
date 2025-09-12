const API_URL = "https://v2.api.noroff.dev/square-eyes";

// Fetch products from the API

async function fetchProducts() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

// When the DOM is loaded, fetch and display products

document.addEventListener("DOMContentLoaded", async () => {
  Cart.updateCartHeader();
  // Get references to DOM elements
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

  // All products will be stored here
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
      // <-- fixed name
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

  // Helper to get the unit price of a product
  function unitPrice(p) {
    const n = Number(p.onSale ? p.discountedPrice : p.price);
    return Number.isFinite(n) ? n : 0;
  }

  // Read the selected price range and return {min, max}
  function readPriceRange() {
    const v = priceSel?.value || "";
    if (!v) return { min: null, max: null };
    const [min, max] = v.split("-").map(Number);
    return {
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
    };
  }

  // Apply filters and sorting, then render products and update status
  function applyFiltersAndSort() {
    const genre = (genreSel?.value || "").trim();
    const { min, max } = readPriceRange();
    const sort = (sortSel?.value || "").trim();
    const q = (searchEl?.value || "").trim().toLowerCase();

    // Start with all products
    let items = allProducts.slice();

    // Apply genre filter
    if (genre) {
      items = items.filter(
        // case-insensitive match
        (p) => (p.genre || "").toLowerCase() === genre.toLowerCase()
      );
    }

    // Apply search query filter
    if (q) {
      // case-insensitive substring match on title
      items = items.filter((p) => (p.title || "").toLowerCase().includes(q));
    }

    // Apply price range filter
    if (min != null) items = items.filter((p) => unitPrice(p) >= min);
    if (max != null) items = items.filter((p) => unitPrice(p) <= max);

    // Apply sorting
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

    // Render products and update status
    renderProducts(items);

    const parts = [];
    // Describe active filters in status
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

  // Clear all filters and sorting

  clearBtn?.addEventListener("click", () => {
    genreSel.value = "";
    priceSel.value = "";
    sortSel.value = "";
    if (searchEl) searchEl.value = "";
    applyFiltersAndSort();
  });

  // Set up event listeners for filters and sorting
  genreSel?.addEventListener("change", applyFiltersAndSort);
  priceSel?.addEventListener("change", applyFiltersAndSort);
  sortSel?.addEventListener("change", applyFiltersAndSort);
  searchEl?.addEventListener("input", debouncedApply);

  // Fetch products and initialize
  try {
    allProducts = await fetchProducts();
    populateGenres(allProducts);
    applyFiltersAndSort(); // this will call renderProducts + set status
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load products.";
  }

  // Helper to format number as NOK currency
  function nok(n) {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  }

  // Render a list of products into the DOM
  function renderProducts(items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = "<li>No products found.</li>";
      return;
    }

    // Clear existing content
    listEl.innerHTML = "";
    const frag = document.createDocumentFragment();

    // Create and append list items for each product
    for (const p of items) {
      const li = document.createElement("li");
      li.style.border = "1px solid #e5e7eb";
      li.style.borderRadius = "8px";
      li.style.padding = "8px";

      const a = document.createElement("a");
      a.href = `product/index.html?id=${encodeURIComponent(p.id)}`;
      a.style.display = "block";
      a.style.textDecoration = "none";
      a.style.color = "inherit";

      const img = document.createElement("img");
      img.src = p.image?.url || "";
      img.alt = p.image?.alt || p.title || "Product image";
      img.loading = "lazy";
      img.style.width = "100%";
      img.style.aspectRatio = "4 / 4";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";

      const h3 = document.createElement("h3");
      h3.textContent = p.title || "Untitled";
      h3.style.color = "#111827";

      const ratingP = document.createElement("span");
      ratingP.textContent = `IMDB rating: ${p.rating}` || "no rating";
      ratingP.style.color = "#11827";

      const priceP = document.createElement("p");
      priceP.style.margin = "0";
      priceP.style.color = "#111827";

      if (p.onSale) {
        const now = document.createElement("span");
        now.textContent = nok(p.discountedPrice);
        now.style.color = "#b91c1c";
        now.style.fontWeight = "600";

        const was = document.createElement("s");
        was.textContent = nok(p.price);
        was.style.color = "#6b7280";
        was.style.marginLeft = "6px";

        // Combine "now" and "was" into the price paragraph
        priceP.append(now, " ", was);
      } else {
        priceP.textContent = nok(p.price);
        priceP.style.fontWeight = "600";
      }

      a.append(img, h3, priceP, ratingP);
      li.appendChild(a);
      frag.appendChild(li);
    }

    // Append the fragment to the list element
    listEl.appendChild(frag);
  }
});
