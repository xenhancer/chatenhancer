(() => {
  const EXTENSION_TAG_ID = "chat-enhancer-root";
  const EXTENSION_VERSION = "v1.0.0";

  function log(...args) {
    console.log("[Chat Enhancer]", ...args);
  }

  log("Script loaded, URL:", window.location.href);

  // Platform detection
  function detectPlatform() {
    const hostname = window.location.hostname;
    log("Detecting platform, hostname:", hostname);
    if (hostname.includes("chat.openai.com") || hostname.includes("chatgpt.com")) {
      return "chatgpt";
    } else if (hostname.includes("google.com")) {
      return "google";
    }
    return null; // Don't activate on unknown platforms
  }

  const PLATFORM = detectPlatform();
  log("Platform detected:", PLATFORM);

  // Platform Adapter Interface
  // Each adapter must implement all these methods
  function createChatGPTAdapter() {
    return {
      name: "chatgpt",
      
      isActive: () => {
        // For ChatGPT, check if input field exists (messages might not exist yet)
        return document.querySelector("textarea[placeholder*='Ask anything']") !== null ||
               document.querySelector("textarea[placeholder*='Send a message']") !== null ||
               document.querySelector('article[data-turn]') !== null;
      },
      
      findInput: (timeoutMs = 15000) => {
        return new Promise((resolve, reject) => {
          const start = performance.now();
          
          function find() {
            const input =
              document.querySelector("textarea[placeholder*='Ask anything']") ||
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
              reject(new Error("Timed out waiting for chat input"));
            }
          });
          
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
        });
      },
      
      getAllMessageNodes: () => {
        return Array.from(document.querySelectorAll('article[data-turn]'));
      },
      
      isUserMessage: (node) => {
        return node.getAttribute("data-turn") === "user";
      },
      
      isAssistantMessage: (node) => {
        return node.getAttribute("data-turn") === "assistant";
      },
      
      getQuestionContainer: (userNode) => {
        // Find element with text-message class within the user node
        const textMessage = userNode.querySelector('.text-message');
        return textMessage || userNode;
      },
      
      getAnswerContainer: (assistantNode) => {
        return assistantNode;
      },
      
      isNewMessage: (node) => {
        if (!(node instanceof HTMLElement)) return false;
        return node.matches?.('article[data-turn]') ||
               node.querySelector?.('article[data-turn]');
      }
    };
  }

  // Google Search AI adapter (stub - does nothing yet)
  function createGoogleAdapter() {
    const adapter = {
      name: "google",
      
      isActive: () => {
        // Simple check: only detect textarea placeholder
        return document.querySelector("textarea[placeholder*='Ask anything']") !== null;
      },
      
      findInput: (timeoutMs = 15000) => {
        return new Promise((resolve, reject) => {
          const start = performance.now();
          
          function find() {
            const input = document.querySelector("textarea[placeholder*='Ask anything']");
            
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
              reject(new Error("Timed out waiting for chat input"));
            }
          });
          
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true
          });
        });
      },
      
      getAllMessageNodes: () => {
        // Structure:
        // - Under data-xid="aim-mars-turn-root":
        //   1. ONE element with data-tr-rsts="true" contains multiple old pairboxes (each has data-scope-id="turn")
        //   2. MULTIPLE elements with data-tr-rsts="false", each contains ONE new pairbox
        const container = document.querySelector('[data-xid="aim-mars-turn-root"]');
        if (!container) {
          return [];
        }
        
        // Get old pairboxes: inside the data-tr-rsts="true" element, find all data-scope-id="turn"
        const oldContainer = container.querySelector('[data-tr-rsts="true"]');
        const oldPairboxes = oldContainer 
          ? Array.from(oldContainer.querySelectorAll('[data-scope-id="turn"]'))
          : [];
        
        // Get new pairbox containers: each data-tr-rsts="false" element contains one new pairbox
        // The container itself is what we'll use as the "pairbox" node
        const newPairboxContainers = Array.from(container.querySelectorAll('[data-tr-rsts="false"]'));
        
        // Combine both types
        const allPairboxes = [...oldPairboxes, ...newPairboxContainers];
        
        // Debug: log each pairbox to see what we're finding
        log(`[Chat Enhancer] Google: Found ${allPairboxes.length} total pairboxes (${oldPairboxes.length} old, ${newPairboxContainers.length} new)`);
        allPairboxes.forEach((pb, idx) => {
          const isOld = pb.getAttribute('data-scope-id') === 'turn';
          const isNew = pb.getAttribute('data-tr-rsts') === 'false';
          const hasQuestion = adapter.getQuestionContainer(pb) !== pb;
          const hasAnswer = adapter.isAssistantMessage(pb);
          log(`  Pairbox ${idx + 1}: old=${isOld}, new=${isNew}, hasQuestion=${hasQuestion}, hasAnswer=${hasAnswer}`);
        });
        
        // Filter to only include pairboxes that have questions (even if no answer yet)
        const pairboxesWithQuestions = allPairboxes.filter(pb => adapter.isUserMessage(pb) || adapter.isAssistantMessage(pb));
        
        log(`[Chat Enhancer] Google: ${pairboxesWithQuestions.length} pairboxes with questions`);
        return pairboxesWithQuestions;
      },
      
      getAnswerContainer: (pairboxNode) => {
        // Check if this is a new pairbox (has data-tr-rsts="false")
        if (pairboxNode.getAttribute('data-tr-rsts') === 'false') {
          // New structure: find element with data-scope-id="turn" (answer box)
          const answerBox = pairboxNode.querySelector('[data-scope-id="turn"]');
          if (answerBox) {
            return answerBox;
          }
        } else {
          // Old structure: second child is answer box
          const children = Array.from(pairboxNode.children);
          if (children.length >= 2) {
            return children[1]; // Second child is answer
          }
        }
        return pairboxNode;
      },
      
      getQuestionContainer: (pairboxNode) => {
        // Check if this is a new pairbox (has data-tr-rsts="false")
        if (pairboxNode.getAttribute('data-tr-rsts') === 'false') {
          // New structure: find element with role="heading" (question box)
          const questionBox = pairboxNode.querySelector('[role="heading"]');
          if (questionBox) {
            return questionBox;
          }
        } else {
          // Old structure: first child is question box
          const children = Array.from(pairboxNode.children);
          if (children.length >= 1) {
            const firstChild = children[0];
            // Check if first child has the question class or is the question itself
            // Look for div.iLZyRc.R7mRQb which is the question bubble
            const questionBubble = firstChild.querySelector?.('.iLZyRc.R7mRQb') || 
                                   firstChild.querySelector?.('.iLZyRc') ||
                                   (firstChild.classList?.contains('iLZyRc') ? firstChild : null);
            if (questionBubble) {
              return questionBubble;
            }
            // Fallback to first child
            return firstChild;
          }
        }
        return pairboxNode;
      },
      
      isUserMessage: (pairboxNode) => {
        // Each pairbox contains (questbox, answerbox) as siblings
        // Check if this pairbox contains a question box (sibling of answer box with eid)
        // Find answer box first, then check if question box exists
        const answerBox = adapter.getAnswerContainer(pairboxNode);
        if (answerBox && answerBox !== pairboxNode) {
          return adapter.getQuestionContainer(pairboxNode) !== pairboxNode;
        }
        return false;
      },
      
      isAssistantMessage: (pairboxNode) => {
        // Check if this pairbox contains an answer box
        if (pairboxNode.getAttribute('data-tr-rsts') === 'false') {
          // New structure: check if pairbox has an element with data-scope-id="turn" (answer box)
          const answerBox = pairboxNode.querySelector('[data-scope-id="turn"]');
          return answerBox !== null;
        } else {
          // Old structure: check if second child exists (answer box)
          const children = Array.from(pairboxNode.children);
          return children.length >= 2;
        }
      },
      
      isNewMessage: (node) => {
        // Check if this pairbox is new (not yet processed)
        // Check if it already has our data attribute
        // Only check if node is an Element (not text node, comment, etc.)
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        return !node.hasAttribute('data-chat-enhancer-processed');
      }
    };
    
    return adapter;
  }

  // Platform adapters registry
  const adapters = {
    chatgpt: createChatGPTAdapter(),
    google: createGoogleAdapter()
  };

  // Get the current platform adapter
  const adapter = PLATFORM ? adapters[PLATFORM] : null;

  // Don't initialize if platform is not supported
  if (!adapter) {
    log("Platform not supported:", PLATFORM);
    return;
  }

  log("Platform detected:", PLATFORM, "using adapter:", adapter.name);
  log("Adapter isActive check:", adapter.isActive());

  // Use adapter to find input
  function waitForInputContainer(timeoutMs = 15000) {
    return adapter.findInput(timeoutMs);
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

    // Create header
    const header = document.createElement("div");
    header.id = `${EXTENSION_TAG_ID}-header`;
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px;cursor:move;user-select:none;";
    
    const title = document.createElement("span");
    title.textContent = "Chat Enhancer";
    title.style.cssText = "font-weight:500;font-size:10px;color:rgb(51,65,85);letter-spacing:0.2px;";
    
    const toggleBtn = document.createElement("button");
    toggleBtn.id = `${EXTENSION_TAG_ID}-toggle`;
    toggleBtn.textContent = "▲";
    toggleBtn.style.cssText = "all:unset;cursor:pointer;padding:2px 6px;border-radius:999px;background:rgba(203,213,225,0.4);font-size:10px;color:rgb(71,85,105);transition:all 0.2s;";
    
    header.appendChild(title);
    header.appendChild(toggleBtn);
    
    // Create content
    const content = document.createElement("div");
    content.id = `${EXTENSION_TAG_ID}-content`;
    content.style.display = "block";
    
    const turnsDiv = document.createElement("div");
    turnsDiv.id = `${EXTENSION_TAG_ID}-turns`;
    turnsDiv.textContent = "0 turns";
    turnsDiv.style.cssText = "font-weight:500;font-size:13px;color:rgb(100,116,139);margin-bottom:12px;padding:2px 0;text-align:center;border-bottom:1px solid rgba(203,213,225,0.3);padding-bottom:8px;";
    
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.cssText = "display:flex;flex-direction:column;gap:8px;";
    
    const expandBtn = document.createElement("button");
    expandBtn.id = `${EXTENSION_TAG_ID}-expand-all`;
    expandBtn.textContent = "Expand All";
    expandBtn.style.cssText = "all:unset;cursor:pointer;padding:6px 8px;border-radius:8px;background:linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.25));font-size:10px;text-align:center;color:rgb(20,83,45);font-weight:500;transition:all 0.2s;box-shadow:0 1px 3px rgba(34,197,94,0.2);";
    
    const collapseBtn = document.createElement("button");
    collapseBtn.id = `${EXTENSION_TAG_ID}-collapse-all`;
    collapseBtn.textContent = "Collapse All";
    collapseBtn.style.cssText = "all:unset;cursor:pointer;padding:6px 8px;border-radius:8px;background:linear-gradient(135deg, rgba(249,115,22,0.2), rgba(234,88,12,0.25));font-size:10px;text-align:center;color:rgb(154,52,18);font-weight:500;transition:all 0.2s;box-shadow:0 1px 3px rgba(249,115,22,0.2);";
    
    buttonsContainer.appendChild(expandBtn);
    buttonsContainer.appendChild(collapseBtn);
    
    const versionDiv = document.createElement("div");
    versionDiv.textContent = EXTENSION_VERSION;
    versionDiv.style.cssText = "font-weight:400;font-size:8px;color:rgb(100,116,139);margin-top:10px;text-align:center;opacity:0.7;";
    
    content.appendChild(turnsDiv);
    content.appendChild(buttonsContainer);
    content.appendChild(versionDiv);
    
    panel.appendChild(header);
    panel.appendChild(content);

    document.body.appendChild(panel);
    return panel;
  }

  // Expand all answers in the current conversation
  function expandAllAnswers() {
    const roleNodes = adapter.getAllMessageNodes();
    const assistants = roleNodes.filter((n) => adapter.isAssistantMessage(n));

    assistants.forEach((assistantNode) => {
      // Show assistant article
      const answerContainer = adapter.getAnswerContainer(assistantNode);
      answerContainer.style.display = "";

      // Find the closest previous user article to update its arrow state
      let userNode = null;
      const assistantIndex = roleNodes.indexOf(assistantNode);
      for (let i = assistantIndex - 1; i >= 0; i -= 1) {
        const candidate = roleNodes[i];
        if (adapter.isUserMessage(candidate)) {
          userNode = candidate;
          break;
        }
      }

      if (!userNode) return;

      const questionContainer = adapter.getQuestionContainer(userNode);
      const arrow = questionContainer.querySelector(
        "[data-chat-enhancer-question-arrow='1']"
      );
      if (arrow) {
        arrow.textContent = "▲";
      }
      questionContainer.setAttribute("data-chat-enhancer-expanded", "1");
    });
  }

  // Collapse all answers in the current conversation
  function collapseAllAnswers() {
    const roleNodes = adapter.getAllMessageNodes();
    const assistants = roleNodes.filter((n) => adapter.isAssistantMessage(n));

    assistants.forEach((assistantNode) => {
      // Hide assistant article
      const answerContainer = adapter.getAnswerContainer(assistantNode);
      answerContainer.style.display = "none";

      // Find the closest previous user article to update its arrow state
      let userNode = null;
      const assistantIndex = roleNodes.indexOf(assistantNode);
      for (let i = assistantIndex - 1; i >= 0; i -= 1) {
        const candidate = roleNodes[i];
        if (adapter.isUserMessage(candidate)) {
          userNode = candidate;
          break;
        }
      }

      if (!userNode) return;

      const questionContainer = adapter.getQuestionContainer(userNode);
      const arrow = questionContainer.querySelector(
        "[data-chat-enhancer-question-arrow='1']"
      );
      if (arrow) {
        arrow.textContent = "▼";
      }
      questionContainer.setAttribute("data-chat-enhancer-expanded", "0");
    });
  }

  function updateRoundsCount() {
    const turnsEl = document.getElementById(`${EXTENSION_TAG_ID}-turns`);
    if (!turnsEl) return;
    
    const roleNodes = adapter.getAllMessageNodes();
    
    let count;
    if (adapter.name === "chatgpt") {
      // For ChatGPT: count user messages (questions) as turns
      // A turn starts when a question is asked, even if answer is still processing
      count = roleNodes.filter((n) => adapter.isUserMessage(n)).length;
    } else {
      // For Google: count pairboxes with questions (each pairbox = 1 turn)
      // Already filtered to only include pairboxes with questions
      count = roleNodes.length;
      // Debug logging for Google
      const withAnswers = roleNodes.filter((n) => adapter.isAssistantMessage(n)).length;
      log(`[Chat Enhancer] updateRoundsCount: ${count} total turns, ${withAnswers} with answers`);
    }
    
    turnsEl.textContent = `${count} ${count === 1 ? 'turn' : 'turns'}`;
  }

  function setupCollapsibleAnswers() {
    // Use platform adapter for all operations
    const PAIRED_ATTR = "data-chat-enhancer-collapsible-bound";

    function pairOnce(root = document) {
      const roleNodes = adapter.getAllMessageNodes();
      const assistants = roleNodes.filter((n) => adapter.isAssistantMessage(n));

      log(
        "setupCollapsibleAnswers: found assistant nodes in this pass (index-based):",
        assistants.length
      );

      assistants.forEach((assistantNode) => {
        if (assistantNode.getAttribute(PAIRED_ATTR) === "1") return;

        // For Google: each pairbox contains both question and answer
        // So the userNode is the same pairbox (it contains both)
        // For ChatGPT: find the closest previous user turn
        let userNode = null;
        if (adapter.name === "google") {
          // In Google, the pairbox itself contains both question and answer
          // So use the same node
          userNode = assistantNode;
        } else {
          // For ChatGPT, find the closest previous user turn
          const assistantIndex = roleNodes.indexOf(assistantNode);
          for (let i = assistantIndex - 1; i >= 0; i -= 1) {
            const candidate = roleNodes[i];
            if (adapter.isUserMessage(candidate)) {
              userNode = candidate;
              break;
            }
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
        const questionContainer = adapter.getQuestionContainer(userNode);
        const answerContainer = adapter.getAnswerContainer(assistantNode);

        if (!questionContainer) {
          log("[Chat Enhancer] Error: questionContainer is null/undefined");
          return;
        }

        let arrow = questionContainer.querySelector(
          "[data-chat-enhancer-question-arrow='1']"
        );
        if (!arrow) {
          arrow = document.createElement("span");
          arrow.setAttribute("data-chat-enhancer-question-arrow", "1");
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
          answerContainer.style.display = expanded ? "" : "none";
          // Arrow shows the action: ▼ to expand, ▲ to collapse
          arrow.textContent = expanded ? "▲" : "▼";
          questionContainer.setAttribute(
            "data-chat-enhancer-expanded",
            expanded ? "1" : "0"
          );
        }

        // Preserve existing state if already set, otherwise set based on whether it's new
        const existingState = questionContainer.getAttribute("data-chat-enhancer-expanded");
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
            questionContainer.getAttribute("data-chat-enhancer-expanded") ===
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
          if (adapter.isNewMessage(node)) {
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
      // Arrow shows the action: ▼ to expand, ▲ to collapse
      toggleBtn.textContent = isExpanded ? "▼" : "▲";
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
    if (window.top !== window) {
      log("Skipping init: not in top window");
      return;
    }

    log("Init called, platform:", PLATFORM, "adapter:", adapter?.name);
    log("Checking if adapter is active:", adapter?.isActive());

    waitForInputContainer()
      .then((textarea) => {
        log("Input found, creating panel");
        const panel = createPanel();
        attachBehavior(textarea, panel);
        setupCollapsibleAnswers();
        log("Enhancer initialized on", PLATFORM);
      })
      .catch((err) => {
        log("Could not initialize enhancer:", err);
        log("Error details:", err.message, err.stack);
      });
  }

  log("Document ready state:", document.readyState);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    log("Calling init immediately");
    init();
  } else {
    log("Waiting for DOMContentLoaded");
    window.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();


