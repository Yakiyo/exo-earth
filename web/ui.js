/* Small interface helpers shared by every page: icons and toasts. */

/* An icon from icons.svg (Phosphor, MIT). Decorative unless a label is given. */
export function icon(name, label = "") {
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg class="i" ${a11y}><use href="icons.svg#i-${name}"></use></svg>`;
}

const KIND_ICON = { info: "info", success: "check-circle", error: "warning-circle" };

/* toast(message, kind): info and success hide after 5 s; errors stay until dismissed. */
export function toast(message, kind = "error") {
  let stack = document.querySelector(".toasts");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toasts";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.setAttribute("role", kind === "error" ? "alert" : "status");
  el.innerHTML = `${icon(KIND_ICON[kind] || "info")}<p></p>
    <button class="icon-button" type="button" aria-label="Dismiss">${icon("x")}</button>`;
  el.querySelector("p").textContent = message;
  const close = () => {
    if (el.classList.contains("leaving")) return;
    el.classList.add("leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 400);
  };
  el.querySelector("button").addEventListener("click", close);
  stack.appendChild(el);
  // Keep at most three on screen.
  while (stack.children.length > 3) stack.firstElementChild.remove();
  if (kind !== "error") setTimeout(close, 5000);
  return close;
}
