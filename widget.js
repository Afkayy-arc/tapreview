/*!
 * TapReview widget — drop-in review flow for any website.
 *
 * Floating button (default):
 *   <script src="https://afkayy-arc.github.io/tapreview/widget.js"
 *     data-business="demo"></script>
 *
 * Inline embed:
 *   <div id="tapreview"></div>
 *   <script src="https://afkayy-arc.github.io/tapreview/widget.js"
 *     data-business="demo" data-display="inline" data-target="#tapreview"></script>
 *
 * Options (all optional except data-business):
 *   data-display   "button" (floating launcher, default) | "inline"
 *   data-target    CSS selector to mount the inline embed into (default "#tapreview")
 *   data-accent    brand color, e.g. "#2563EB"
 *   data-theme     "light" | "dark" (default: follow the visitor's system)
 *   data-lang      "en" | "ur" default language
 *   data-label     launcher button text (default "⭐ Rate us")
 *   data-position  "right" (default) | "left" — launcher corner
 *   data-base      TapReview install URL (defaults to where widget.js is served from)
 */
(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;

  var base = script.getAttribute("data-base") || script.src.replace(/widget\.js.*$/, "");
  var business = script.getAttribute("data-business") || "";
  var accent = script.getAttribute("data-accent") || "";
  var theme = script.getAttribute("data-theme") || "";
  var lang = script.getAttribute("data-lang") || "";
  var label = script.getAttribute("data-label") || "⭐ Rate us";
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";
  var display = script.getAttribute("data-display") === "inline" ? "inline" : "button";
  var target = script.getAttribute("data-target") || "#tapreview";

  if (!business) {
    console.warn("[TapReview] data-business is required");
    return;
  }

  function frameUrl() {
    var u = base + "?id=" + encodeURIComponent(business) + "&embed=1";
    if (accent) u += "&accent=" + encodeURIComponent(accent.replace("#", ""));
    if (theme === "light" || theme === "dark") u += "&mode=" + theme;
    if (lang) u += "&lang=" + encodeURIComponent(lang);
    return u;
  }

  var btnColor = accent || "#1E6B4E";

  /* ---------- inline mode ---------- */
  if (display === "inline") {
    function mount() {
      var host = document.querySelector(target);
      if (!host) { console.warn("[TapReview] target not found: " + target); return; }
      var iframe = document.createElement("iframe");
      iframe.src = frameUrl();
      iframe.title = "TapReview";
      iframe.style.cssText = "width:100%;border:0;border-radius:16px;min-height:480px;display:block;";
      host.appendChild(iframe);
      window.addEventListener("message", function (e) {
        if (e.data && e.data.type === "tapreview:height" && e.source === iframe.contentWindow) {
          iframe.style.height = Math.max(420, e.data.height) + "px";
        }
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
    else mount();
    return;
  }

  /* ---------- floating button + modal ---------- */
  var Z = 2147483000;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.setAttribute("aria-haspopup", "dialog");
  btn.style.cssText =
    "position:fixed;bottom:20px;" + position + ":20px;z-index:" + Z + ";" +
    "background:" + btnColor + ";color:#fff;border:none;border-radius:999px;" +
    "padding:12px 20px;font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;" +
    "cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);";

  var overlay = null;

  function close() {
    if (overlay) { overlay.remove(); overlay = null; }
    document.removeEventListener("keydown", onKey);
    btn.style.display = "";
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open() {
    overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:" + (Z + 1) + ";background:rgba(0,0,0,.45);" +
      "display:flex;align-items:center;justify-content:center;padding:16px;";
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    var box = document.createElement("div");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Leave a review");
    box.style.cssText =
      "position:relative;width:100%;max-width:430px;height:min(640px,92vh);" +
      "border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);background:#fff;";

    var x = document.createElement("button");
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    x.innerHTML = "&#10005;";
    x.style.cssText =
      "position:absolute;top:10px;" + (position === "left" ? "right" : "left") + ":10px;z-index:2;" +
      "width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;" +
      "background:rgba(0,0,0,.45);color:#fff;font-size:15px;line-height:1;";
    x.addEventListener("click", close);

    var iframe = document.createElement("iframe");
    iframe.src = frameUrl();
    iframe.title = "TapReview";
    iframe.style.cssText = "width:100%;height:100%;border:0;display:block;";

    box.appendChild(x);
    box.appendChild(iframe);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
    btn.style.display = "none";
  }

  btn.addEventListener("click", open);

  function mountBtn() { document.body.appendChild(btn); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountBtn);
  else mountBtn();
})();
