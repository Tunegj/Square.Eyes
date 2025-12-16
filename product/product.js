import { createFavouriteButton } from "../favourites.js";

const BASE = "https://v2.api.noroff.dev/square-eyes";

function nok(n) {
  const x = Number(n);
  return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
}

async function getProduct(id) {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const { data } = await res.json();
  return data;
}

function makeSimilarCard(m) {
  const li = document.createElement("li");
  li.className = "similar-card";

  const a = document.createElement("a");
  a.href = `./index.html?id=${encodeURIComponent(m.id)}`;
  a.className = "similar-link";

  const img = document.createElement("img");
  img.src = m.image?.url || "";
  img.alt = m.image?.alt || m.title || "Movie image";
  img.loading = "lazy";
  img.decoding = "async";

  const cap = document.createElement("div");
  cap.className = "similar-caption";

  const title = document.createElement("div");
  title.className = "similar-title";
  title.textContent = m.title || "Untitled";

  const rating = document.createElement("div");
  rating.className = "similar-rating";
  const star = document.createElement("span");
  star.className = "star";
  star.setAttribute("aria-hidden", "true");
  star.textContent = "★";
  const rt = document.createElement("span");
  rt.textContent = String(m.rating ?? "—");
  rating.append(star, rt);

  cap.append(title, rating);
  a.append(img, cap);
  li.appendChild(a);
  return li;
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const root = document.getElementById("product-root");

  const id = new URL(location.href).searchParams.get("id");
  if (!id) {
    statusEl.textContent = "Missing product id.";
    return;
  }

  try {
    const p = await getProduct(id);
    statusEl.textContent = "";
    root.innerHTML = "";

    const wrap = document.createElement("article");
    wrap.className = "product container";

    const media = document.createElement("div");
    media.className = "product-media";

    const info = document.createElement("div");
    info.className = "product-info";

    // --- image
    const img = document.createElement("img");
    img.src = p.image?.url || "";
    img.alt = p.image?.alt || p.title || "Product image";
    img.loading = "lazy";
    img.decoding = "async";
    media.append(img);

    // --- title
    const h2 = document.createElement("h2");
    h2.textContent = p.title || "Untitled";

    const favBtn = createFavouriteButton(p.id);

    function buildMeta(p) {
      const ul = document.createElement("ul");
      ul.className = "product-meta";

      const liGenre = document.createElement("li");
      liGenre.textContent = p.genre ?? "—";

      const liReleased = document.createElement("li");
      liReleased.textContent = `Released: ${p.released ?? "—"}`;

      const liRating = document.createElement("li");
      const star = document.createElement("span");
      star.className = "star";
      star.setAttribute("aria-hidden", "true");
      star.textContent = "★";

      const sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = "IMDb rating: ";

      const val = document.createElement("span");
      const r = Number(p.rating);
      val.textContent = Number.isFinite(r) ? r.toFixed(1) : "—";

      liRating.append(sr, star, " ", val);

      ul.append(liGenre, liReleased, liRating);
      return ul;
    }

    const meta = buildMeta(p);

    // --- description
    const desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = p.description || "No description.";

    // --- price
    const price = document.createElement("div");
    price.className = "product-price";
    if (p.onSale) {
      const now = document.createElement("span");
      now.className = "now";
      now.classList.add("on-sale");
      now.textContent = nok(p.discountedPrice);

      const was = document.createElement("span");
      was.className = "was";
      was.textContent = nok(p.price);

      price.append(now, was);
    } else {
      const now = document.createElement("span");
      now.className = "now";
      now.textContent = nok(p.price);
      price.append(now);
    }

    // --- add to cart
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn-primary";
    addBtn.textContent = "Add to cart";

    addBtn.addEventListener("click", () => {
      Cart.addItem({
        id: p.id,
        title: p.title,
        price: p.price,
        discountedPrice: p.discountedPrice,
        onSale: p.onSale,
        image: p.image?.url || "",
      });
      Cart.updateCartHeader();
      statusEl.textContent = "Added to basket.";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 1500);
    });

    async function getAllProductsCached() {
      const KEY = "se_all_products_v1";
      try {
        const cached = JSON.parse(sessionStorage.getItem(KEY));
        if (Array.isArray(cached)) return cached;
      } catch {}

      const res = await fetch("https://v2.api.noroff.dev/square-eyes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { data } = await res.json();
      const arr = Array.isArray(data) ? data : [];
      try {
        sessionStorage.setItem(KEY, JSON.stringify(arr));
      } catch {}
      return arr;
    }

    async function renderSimilar(currentGenre, currentId, mountNode) {
      if (!currentGenre) return;

      try {
        const all = await getAllProductsCached();
        const genreLc = String(currentGenre).toLowerCase();
        const items = all
          .filter(
            (x) =>
              (x.genre || "").toLowerCase() === genreLc && x.id !== currentId
          )
          .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
          .slice(0, 10);

        if (!items.length) return;

        const section = document.createElement("section");
        section.className = "similar container";

        const h3 = document.createElement("h3");
        h3.className = "similar-heading";
        h3.textContent = "You might also like";

        const ul = document.createElement("ul");
        ul.className = "similar-list";

        for (const m of items) {
          ul.appendChild(makeSimilarCard(m));
        }

        section.append(h3, ul);
        mountNode.appendChild(section);
      } catch (err) {
        console.error("Failed to render similar movies:", err);
      }
    }
    // --- assemble

    const actions = document.createElement("div");
    actions.className = "product-actions";
    actions.append(addBtn, favBtn);

    info.append(h2, meta, desc, price, actions);
    wrap.append(media, info);
    root.append(wrap);
    await renderSimilar(p.genre, p.id, root);

    // keep header count fresh
    Cart.updateCartHeader();
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Failed to load product: ${e.message}`;
  }
});
