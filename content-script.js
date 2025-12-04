(() => {
  const EXTENSION_TAG_ID = "chatgpt-page-enhancer-root";
  const EXTENSION_VERSION = "v0.2-collapsible-test";

  function log(...args) {
    console.log("[ChatGPT Enhancer]", ...args);
  }

  function waitForInputContainer(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const start = performance.now();

      function find() {
        const input =
          document.querySelector("textarea[placeholder*='Send a message']") ||
          document.querySelector("textarea");

        if (input) {
          resolve(input);
          return true;
        }
        return false;
      }

      if (find()) return;

      const observer = new MutationObserver(() => {
        if (find()) {
          observer.disconnect();
        } else if (performance.now() - start > timeoutMs) {
          observer.disconnect();
          reject(new Error("Timed out waiting for ChatGPT input"));
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    });
  }

  function createPanel() {
    if (document.getElementById(EXTENSION_TAG_ID)) {
      return document.getElementById(EXTENSION_TAG_ID);
    }

    const panel = document.createElement("div");
    panel.id = EXTENSION_TAG_ID;
    panel.style.position = "fixed";
    panel.style.right = "10px";
    panel.style.bottom = "80px";
    panel.style.zIndex = "9999";
    panel.style.background = "rgba(255, 251, 245, 0.95)";
    panel.style.color = "rgb(30, 41, 59)";
    panel.style.borderRadius = "12px";
    panel.style.padding = "10px 12px";
    panel.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)";
    panel.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    panel.style.fontSize = "11px";
    panel.style.maxWidth = "160px";
    panel.style.backdropFilter = "blur(20px)";
    panel.style.border = "1px solid rgba(203, 213, 225, 0.3)";

    panel.innerHTML = `
      <div id="${EXTENSION_TAG_ID}-header" style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px;cursor:move;user-select:none;">
        <span style="font-weight:500;font-size:10px;color:rgb(51,65,85);letter-spacing:0.2px;">ChatGPT Enhancer</span>
        <button id="${EXTENSION_TAG_ID}-toggle" style="
          all:unset;
          cursor:pointer;
          padding:2px 6px;
          border-radius:999px;
          background:rgba(203,213,225,0.4);
          font-size:10px;
          color:rgb(71,85,105);
          transition:all 0.2s;
        ">▼</button>
      </div>
      <div id="${EXTENSION_TAG_ID}-content" style="display:block;">
        <div style="font-weight:400;font-size:9px;color:rgb(100,116,139);margin-bottom:6px;opacity:0.9;">
          ${EXTENSION_VERSION}
        </div>
        <div id="${EXTENSION_TAG_ID}-turns" style="font-weight:400;font-size:9px;color:rgb(100,116,139);margin-bottom:10px;padding:2px 0;text-align:center;border-bottom:1px solid rgba(203,213,225,0.3);padding-bottom:8px;">
          0 turns
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <button id="${EXTENSION_TAG_ID}-expand-all" style="
          all:unset;
          cursor:pointer;
          padding:6px 8px;
          border-radius:8px;
          background:linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.25));
          font-size:10px;
          text-align:center;
          color:rgb(20,83,45);
          font-weight:500;
          transition:all 0.2s;
          box-shadow:0 1px 3px rgba(34,197,94,0.2);
        ">Expand All</button>
          <button id="${EXTENSION_TAG_ID}-collapse-all" style="
          all:unset;
          cursor:pointer;
          padding:6px 8px;
          border-radius:8px;
          background:linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.25));
          font-size:10px;
          text-align:center;
          color:rgb(154,52,18);
          font-weight:500;
          transition:all 0.2s;
          box-shadow:0 1px 3px rgba(249,115,22,0.2);
        ">Collapse All</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  // Expand all answers in the current conversation
  function expandAllAnswers() {
    const roleNodes = Array.from(
      document.querySelectorAll('article[data-turn]')
    );
    const assistants = roleNodes.filter(
      (n) => n.getAttribute("data-turn") === "assistant"
    );

    assistants.forEach((assistantNode) => {
      // Show assistant article
      assistantNode.style.display = "";

      // Find the closest previous user article to update its arrow state
      let userNode = null;
      const assistantIndex = roleNodes.indexOf(assistantNode);
      for (let i = assistantIndex - 1; i >= 0; i -= 1) {
        const candidate = roleNodes[i];
        if (candidate.getAttribute("data-turn") === "user") {
          userNode = candidate;
          break;
        }
      }

      if (!userNode) return;

      const questionContainer =
        userNode.querySelector(".text-message") || userNode;
      const arrow = questionContainer.querySelector(
        "[data-chatgpt-enhancer-question-arrow='1']"
      );
      if (arrow) {
        arrow.textContent = "▲";
      }
      questionContainer.setAttribute("data-chatgpt-enhancer-expanded", "1");
    });
  }

  // Collapse all answers in the current conversation
  function collapseAllAnswers() {
    const roleNodes = Array.from(
      document.querySelectorAll('article[data-turn]')
    );
    const assistants = roleNodes.filter(
      (n) => n.getAttribute("data-turn") === "assistant"
    );

    assistants.forEach((assistantNode) => {
      // Hide assistant article
      assistantNode.style.display = "none";

      // Find the closest previous user article to update its arrow state
      let userNode = null;
      const assistantIndex = roleNodes.indexOf(assistantNode);
      for (let i = assistantIndex - 1; i >= 0; i -= 1) {
        const candidate = roleNodes[i];
        if (candidate.getAttribute("data-turn") === "user") {
          userNode = candidate;
          break;
        }
      }

      if (!userNode) return;

      const questionContainer =
        userNode.querySelector(".text-message") || userNode;
      const arrow = questionContainer.querySelector(
        "[data-chatgpt-enhancer-question-arrow='1']"
      );
      if (arrow) {
        arrow.textContent = "▼";
      }
      questionContainer.setAttribute("data-chatgpt-enhancer-expanded", "0");
    });
  }

  function updateRoundsCount() {
    const turnsEl = document.getElementById(`${EXTENSION_TAG_ID}-turns`);
    if (!turnsEl) return;
    
    const assistants = Array.from(
      document.querySelectorAll('article[data-turn="assistant"]')
    );
    const count = assistants.length;
    turnsEl.textContent = `${count} ${count === 1 ? 'turn' : 'turns'}`;
  }

  function setupCollapsibleAnswers() {
    // Work at the outer <article> layer:
    //   <article data-turn="user"> ... </article>
    //   <article data-turn="assistant"> ... </article>
    const ASSISTANT_SELECTOR = 'article[data-turn="assistant"]';
    const PAIRED_ATTR = "data-chatgpt-enhancer-collapsible-bound";

    function pairOnce(root = document) {
      const roleNodes = Array.from(
        root.querySelectorAll('article[data-turn]')
      );
      const assistants = roleNodes.filter(
        (n) => n.getAttribute("data-turn") === "assistant"
      );

      log(
        "setupCollapsibleAnswers: found assistant nodes in this pass (index-based):",
        assistants.length
      );

      assistants.forEach((assistantNode) => {
        if (assistantNode.getAttribute(PAIRED_ATTR) === "1") return;

        // Find the closest previous user turn in the roleNodes list
        let userNode = null;
        const assistantIndex = roleNodes.indexOf(assistantNode);
        for (let i = assistantIndex - 1; i >= 0; i -= 1) {
          const candidate = roleNodes[i];
          if (candidate.getAttribute("data-turn") === "user") {
            userNode = candidate;
            break;
          }
        }

        if (!userNode) return;

        assistantNode.setAttribute(PAIRED_ATTR, "1");

        // Build a compact title
        const rawQuestion =
          (userNode.innerText || userNode.textContent || "").trim();
        const questionPreview =
          rawQuestion.length > 120
            ? `${rawQuestion.slice(0, 117).trimEnd()}…`
            : rawQuestion;

        // Add an arrow on the visual question bubble (once per question)
        const questionContainer =
          userNode.querySelector(".text-message") || userNode;

        let arrow = questionContainer.querySelector(
          "[data-chatgpt-enhancer-question-arrow='1']"
        );
        if (!arrow) {
          arrow = document.createElement("span");
          arrow.setAttribute("data-chatgpt-enhancer-question-arrow", "1");
          arrow.textContent = "▼";

          // Position arrow just outside the right edge of the question bubble
          questionContainer.style.position =
            questionContainer.style.position || "relative";
          arrow.style.position = "absolute";
          arrow.style.right = "-14px";
          arrow.style.top = "50%";
          arrow.style.transform = "translateY(-50%)";
          arrow.style.fontSize = "11px";
          arrow.style.opacity = "0.8";

          questionContainer.appendChild(arrow);
        }

        function setExpanded(expanded) {
          assistantNode.style.display = expanded ? "" : "none";
          arrow.textContent = expanded ? "▲" : "▼";
          questionContainer.setAttribute(
            "data-chatgpt-enhancer-expanded",
            expanded ? "1" : "0"
          );
        }

        // Preserve existing state if already set, otherwise set based on whether it's new
        const existingState = questionContainer.getAttribute("data-chatgpt-enhancer-expanded");
        if (existingState !== null) {
          // Keep the existing state
          setExpanded(existingState === "1");
        } else {
          // New pair: newest starts expanded, others start collapsed
          const isNewestPair = assistants.indexOf(assistantNode) === assistants.length - 1;
          setExpanded(isNewestPair);
        }

        questionContainer.style.cursor = "pointer";
        questionContainer.addEventListener("click", () => {
          const current =
            questionContainer.getAttribute("data-chatgpt-enhancer-expanded") ===
            "1";
          setExpanded(!current);
        });
      });
      
      // Update rounds count after processing
      updateRoundsCount();
    }

    // Initial pass for already-rendered messages
    pairOnce(document);

    // Observe for new messages as the conversation continues
    let pairTimeout = null;
    const observer = new MutationObserver((mutations) => {
      let shouldRepair = false;
      for (const m of mutations) {
        if (!m.addedNodes || !m.addedNodes.length) continue;
        m.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          // Check if a new article with data-turn was added
          if (
            node.matches?.(ASSISTANT_SELECTOR) ||
            node.matches?.('article[data-turn="user"]') ||
            node.querySelector?.(ASSISTANT_SELECTOR) ||
            node.querySelector?.('article[data-turn="user"]')
          ) {
            shouldRepair = true;
          }
        });
      }

      // Debounce: wait a bit for the DOM to settle, then re-pair all messages
      if (shouldRepair) {
        if (pairTimeout) clearTimeout(pairTimeout);
        pairTimeout = setTimeout(() => {
          pairOnce(document);
          updateRoundsCount();
        }, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function attachBehavior(textarea, panel) {
    const expandAllBtn = panel.querySelector(
      `#${EXTENSION_TAG_ID}-expand-all`
    );
    const collapseAllBtn = panel.querySelector(
      `#${EXTENSION_TAG_ID}-collapse-all`
    );
    const toggleBtn = panel.querySelector(`#${EXTENSION_TAG_ID}-toggle`);
    const contentDiv = panel.querySelector(`#${EXTENSION_TAG_ID}-content`);
    const header = panel.querySelector(`#${EXTENSION_TAG_ID}-header`);

    // Make panel draggable via header
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    function convertToLeftTop() {
      const rect = panel.getBoundingClientRect();
      const left = rect.left;
      const top = rect.top;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      return { left, top };
    }

    header?.addEventListener("mousedown", (e) => {
      // Don't start drag if clicking on the toggle button
      if (e.target === toggleBtn || toggleBtn?.contains(e.target)) {
        return;
      }
      isDragging = true;
      const pos = convertToLeftTop();
      initialLeft = pos.left;
      initialTop = pos.top;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      panel.style.left = `${initialLeft + deltaX}px`;
      panel.style.top = `${initialTop + deltaY}px`;
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    expandAllBtn?.addEventListener("click", () => {
      expandAllAnswers();
    });
    expandAllBtn?.addEventListener("mouseenter", () => {
      expandAllBtn.style.background = "linear-gradient(135deg, rgba(34,197,94,0.3), rgba(22,163,74,0.35))";
      expandAllBtn.style.transform = "translateY(-1px)";
      expandAllBtn.style.boxShadow = "0 2px 6px rgba(34,197,94,0.3)";
    });
    expandAllBtn?.addEventListener("mouseleave", () => {
      expandAllBtn.style.background = "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.25))";
      expandAllBtn.style.transform = "translateY(0)";
      expandAllBtn.style.boxShadow = "0 1px 3px rgba(34,197,94,0.2)";
    });

    collapseAllBtn?.addEventListener("click", () => {
      collapseAllAnswers();
    });
    collapseAllBtn?.addEventListener("mouseenter", () => {
      collapseAllBtn.style.background = "linear-gradient(135deg, rgba(249,115,22,0.3), rgba(234,88,12,0.35))";
      collapseAllBtn.style.transform = "translateY(-1px)";
      collapseAllBtn.style.boxShadow = "0 2px 6px rgba(249,115,22,0.3)";
    });
    collapseAllBtn?.addEventListener("mouseleave", () => {
      collapseAllBtn.style.background = "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.25))";
      collapseAllBtn.style.transform = "translateY(0)";
      collapseAllBtn.style.boxShadow = "0 1px 3px rgba(249,115,22,0.2)";
    });

    // Toggle bubble content visibility
    toggleBtn?.addEventListener("click", () => {
      const isExpanded = contentDiv.style.display !== "none";
      contentDiv.style.display = isExpanded ? "none" : "block";
      toggleBtn.textContent = isExpanded ? "▲" : "▼";
      // Adjust padding when collapsed for a more compact look
      panel.style.padding = isExpanded ? "6px 12px" : "10px 12px";
    });
    toggleBtn?.addEventListener("mouseenter", () => {
      toggleBtn.style.background = "rgba(203,213,225,0.6)";
      toggleBtn.style.transform = "scale(1.1)";
    });
    toggleBtn?.addEventListener("mouseleave", () => {
      toggleBtn.style.background = "rgba(203,213,225,0.4)";
      toggleBtn.style.transform = "scale(1)";
    });
  }

  function init() {
    if (window.top !== window) return;

    waitForInputContainer()
      .then((textarea) => {
        const panel = createPanel();
        attachBehavior(textarea, panel);
        setupCollapsibleAnswers();
        log("Enhancer initialized.");
      })
      .catch((err) => {
        log("Could not initialize enhancer:", err);
      });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();


