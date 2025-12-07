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
    } else if (hostname.includes("grok.com")) {
      return "grok";
    }
    return null; // Don't activate on unknown platforms
  }

  const PLATFORM = detectPlatform();
  log("Platform detected:", PLATFORM);

  // Platform Adapter Interface
  // Each adapter must implement: isActive(), getPairs(), isNewPair()
  function createChatGPTAdapter() {
    return {
      isActive: () => {
        // Check if ChatGPT page is active
        return document.querySelector("textarea[placeholder*='Ask anything']") !== null ||
               document.querySelector("textarea[placeholder*='Send a message']") !== null ||
               document.querySelector('article[data-turn]') !== null;
      },
      
      getPairs: () => {
        // Get all message nodes
        const allNodes = Array.from(document.querySelectorAll('article[data-turn]'));
        const pairs = [];
        
        // Pair user messages with their following assistant messages
        for (let i = 0; i < allNodes.length; i++) {
          const node = allNodes[i];
          if (node.getAttribute("data-turn") === "user") {
            // Find the next assistant message
            let answerContainer = null;
            for (let j = i + 1; j < allNodes.length; j++) {
              if (allNodes[j].getAttribute("data-turn") === "assistant") {
                answerContainer = allNodes[j];
                break;
              }
            }
            
            // Get question container (text-message class or user node itself)
            const questionContainer = node.querySelector('.text-message') || node;
            
            // Add pair (even if no answer yet)
            pairs.push({
              questionContainer,
              answerContainer: answerContainer || null
            });
          }
        }
        
        return pairs;
      },
      
      isNewPair: (node) => {
        // Check if node is a new article[data-turn] that hasn't been processed
        if (!(node instanceof HTMLElement)) return false;
        
        // Check if it's an article[data-turn] or contains one
        const article = node.matches?.('article[data-turn]') ? node : node.querySelector?.('article[data-turn]');
        if (!article) return false;
        
        // Only check user messages (they have question containers)
        if (article.getAttribute("data-turn") !== "user") return false;
        
        // Get the question container
        const questionContainer = article.querySelector('.text-message') || article;
        
        // Check if it's already been processed
        return !questionContainer.hasAttribute('data-chat-enhancer-collapsible-bound');
      }
    };
  }

  // Google Search AI adapter
  function createGoogleAdapter() {
    const getQuestionContainer = (pairboxNode) => {
      // Check if this is a new pairbox (has data-tr-rsts="false")
      if (pairboxNode.getAttribute('data-tr-rsts') === 'false') {
        // New structure: find role="heading" and traverse up to find parent with data-ved or wiz:wakeup
        const headingElement = pairboxNode.querySelector('[role="heading"]');
        if (headingElement) {
          let parent = headingElement.parentElement;
          while (parent && parent !== pairboxNode) {
            if (parent.hasAttribute('data-ved') || parent.hasAttribute('wiz:wakeup')) {
              return parent;
            }
            parent = parent.parentElement;
          }
          return headingElement;
        }
      } else {
        // Old structure: first child is question box
        const children = Array.from(pairboxNode.children);
        if (children.length >= 1) {
          return children[0];
        }
      }
      return pairboxNode;
    };
    
    const getAnswerContainer = (pairboxNode) => {
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
      return null;
    };
    
    return {
      isActive: () => {
        // Check if Google Search AI is active (not homepage)
        const hasAITextarea = document.querySelector("textarea[placeholder*='Ask anything']") !== null;
        if (!hasAITextarea) return false;
        
        // Don't activate on homepage
        const pathname = window.location.pathname;
        const search = window.location.search;
        const isHomePage =
          pathname === '/' ||
          pathname === '/webhp' ||
          (pathname === '/search' && (!search || search === '?' || !search.includes('q=')));
        
        return !isHomePage;
      },
      
      getPairs: () => {
        const container = document.querySelector('[data-xid="aim-mars-turn-root"]');
        if (!container) {
          return [];
        }
        
        const pairs = [];
        
        // Get old pairboxes: inside the data-tr-rsts="true" element
        const oldContainer = container.querySelector('[data-tr-rsts="true"]');
        if (oldContainer) {
          const oldPairboxes = Array.from(oldContainer.querySelectorAll('[data-scope-id="turn"]'));
          oldPairboxes.forEach(pairbox => {
            const questionContainer = getQuestionContainer(pairbox);
            const answerContainer = getAnswerContainer(pairbox);
            // Only add if has question (even if no answer yet)
            // Also verify that questionContainer actually has text content
            if (questionContainer !== pairbox) {
              const questionText = (questionContainer.textContent || questionContainer.innerText || "").trim();
              // Only add if there's actual question text
              if (questionText.length > 0) {
                pairs.push({
                  questionContainer,
                  answerContainer: answerContainer || null
                });
              }
            }
          });
        }
        
        // Get new pairbox containers: each data-tr-rsts="false" element
        const newPairboxContainers = Array.from(container.querySelectorAll('[data-tr-rsts="false"]'));
        newPairboxContainers.forEach(pairbox => {
          const questionContainer = getQuestionContainer(pairbox);
          const answerContainer = getAnswerContainer(pairbox);
          // Only add if has question (even if no answer yet)
          // Also verify that questionContainer actually has text content
          if (questionContainer !== pairbox) {
            const questionText = (questionContainer.textContent || questionContainer.innerText || "").trim();
            // Only add if there's actual question text
            if (questionText.length > 0) {
              pairs.push({
                questionContainer,
                answerContainer: answerContainer || null
              });
            }
          }
        });
        
        return pairs;
      },
      
      isNewPair: (node) => {
        // Check if node is a new pairbox that hasn't been processed
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        
        // Find the actual pairbox (could be the node itself or inside it)
        let pairbox = null;
        
        // Check if node itself is a pairbox
        const isOldPairbox = node.hasAttribute('data-scope-id') && node.getAttribute('data-scope-id') === 'turn';
        const isNewPairbox = node.hasAttribute('data-tr-rsts') && node.getAttribute('data-tr-rsts') === 'false';
        
        if (isOldPairbox || isNewPairbox) {
          pairbox = node;
        } else {
          // Check if it contains a pairbox
          pairbox = node.querySelector('[data-scope-id="turn"]') || 
                    node.querySelector('[data-tr-rsts="false"]');
        }
        
        if (!pairbox) {
          return false;
        }
        
        // Get the question container to check if it's been processed
        const questionContainer = getQuestionContainer(pairbox);
        if (!questionContainer || questionContainer === pairbox) {
          return false;
        }
        
        // Check if already processed
        return !questionContainer.hasAttribute('data-chat-enhancer-collapsible-bound');
      }
    };
  }

  // Grok adapter
  function createGrokAdapter() {
    return {
      isActive: () => {
        // Check if Grok page is active - find form element with data-placeholder="How can Grok help?"
        return document.querySelector('form [data-placeholder="How can Grok help?"]') !== null;
      },
      
      getPairs: () => {
        // Find all elements with id starting with "response-"
        // They alternate: question, answer, question, answer, ...
        const allResponses = Array.from(document.querySelectorAll('[id^="response-"]'))
          .filter(el => el.id && el.id.startsWith('response-'))
          .sort((a, b) => {
            // Sort by DOM order to maintain sequence
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
              return -1;
            } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
              return 1;
            }
            return 0;
          });
        
        const pairs = [];
        
        // Pair them: even index = question, odd index = answer
        for (let i = 0; i < allResponses.length; i += 2) {
          const questionContainer = allResponses[i];
          const answerContainer = allResponses[i + 1] || null;
          
          // Only add if question has text content
          const questionText = (questionContainer.textContent || questionContainer.innerText || "").trim();
          if (questionText.length > 0) {
            pairs.push({
              questionContainer,
              answerContainer: answerContainer || null
            });
          }
        }
        
        return pairs;
      },
      
      isNewPair: (node) => {
        // Check if node is a new response element that hasn't been processed
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        
        // Check if node itself has id starting with "response-"
        let responseElement = null;
        if (node.id && node.id.startsWith('response-')) {
          responseElement = node;
        } else {
          // Check if it contains a response element
          responseElement = node.querySelector('[id^="response-"]');
        }
        
        if (!responseElement) {
          return false;
        }
        
        // Check if it's a question (even index in sorted list)
        const allResponses = Array.from(document.querySelectorAll('[id^="response-"]'))
          .filter(el => el.id && el.id.startsWith('response-'))
          .sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
              return -1;
            } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
              return 1;
            }
            return 0;
          });
        
        const index = allResponses.indexOf(responseElement);
        // Only check questions (even indices)
        if (index % 2 !== 0) {
          return false;
        }
        
        // Check if already processed
        return !responseElement.hasAttribute('data-chat-enhancer-collapsible-bound');
      }
    };
  }

  // Platform adapters registry
  const adapters = {
    chatgpt: createChatGPTAdapter(),
    google: createGoogleAdapter(),
    grok: createGrokAdapter()
  };

  // Get the current platform adapter
  const adapter = PLATFORM ? adapters[PLATFORM] : null;

  // Don't initialize if platform is not supported
  if (!adapter) {
    log("Platform not supported:", PLATFORM);
    return;
  }

  log("Platform detected:", PLATFORM);
  log("Adapter isActive check:", adapter.isActive());

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
    const pairs = adapter.getPairs();

    pairs.forEach((pair) => {
      if (pair.answerContainer) {
        pair.answerContainer.style.display = "";
      }

      const arrow = pair.questionContainer.querySelector(
        "[data-chat-enhancer-question-arrow='1']"
      );
      if (arrow) {
        arrow.textContent = "▲";
      }
      pair.questionContainer.setAttribute("data-chat-enhancer-expanded", "1");
    });
  }

  // Collapse all answers in the current conversation
  function collapseAllAnswers() {
    const pairs = adapter.getPairs();

    pairs.forEach((pair) => {
      if (pair.answerContainer) {
        pair.answerContainer.style.display = "none";
      }

      const arrow = pair.questionContainer.querySelector(
        "[data-chat-enhancer-question-arrow='1']"
      );
      if (arrow) {
        arrow.textContent = "▼";
      }
      pair.questionContainer.setAttribute("data-chat-enhancer-expanded", "0");
    });
  }

  function updateRoundsCount() {
    const turnsEl = document.getElementById(`${EXTENSION_TAG_ID}-turns`);
    if (!turnsEl) return;
    
    // Count pairs (each pair = 1 turn)
    const pairs = adapter.getPairs();
    const count = pairs.length;
    
    turnsEl.textContent = `${count} ${count === 1 ? 'turn' : 'turns'}`;
  }

  function setupCollapsibleAnswers() {
    const PAIRED_ATTR = "data-chat-enhancer-collapsible-bound";

    function processPairs() {
      const pairs = adapter.getPairs();

      log("setupCollapsibleAnswers: found pairs:", pairs.length);

      pairs.forEach((pair, index) => {
        const { questionContainer, answerContainer } = pair;

        if (!questionContainer) {
          log("[Chat Enhancer] Error: questionContainer is null/undefined");
          return;
        }

        const isAlreadyProcessed = questionContainer.hasAttribute(PAIRED_ATTR);
        
        if (!isAlreadyProcessed) {
          questionContainer.setAttribute(PAIRED_ATTR, "1");
        }

        // Add arrow if not already present
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

        // Function to get current answerContainer (in case it was added after initial processing)
        function getCurrentAnswerContainer() {
          // Get current pairs to find the latest answerContainer for this question
          const currentPairs = adapter.getPairs();
          const currentPair = currentPairs.find(p => p.questionContainer === questionContainer);
          return currentPair ? currentPair.answerContainer : answerContainer;
        }

        function setExpanded(expanded) {
          const currentAnswerContainer = getCurrentAnswerContainer();
          if (currentAnswerContainer) {
            currentAnswerContainer.style.display = expanded ? "" : "none";
          }
          // Arrow shows the action: ▼ to expand, ▲ to collapse
          arrow.textContent = expanded ? "▲" : "▼";
          questionContainer.setAttribute(
            "data-chat-enhancer-expanded",
            expanded ? "1" : "0"
          );
        }

        // Only set initial state if not already processed
        if (!isAlreadyProcessed) {
          // New pair: newest starts expanded, others start collapsed
          const isNewestPair = index === pairs.length - 1;
          setExpanded(isNewestPair);
        } else {
          // For already processed pairs, preserve existing state
          const existingState = questionContainer.getAttribute("data-chat-enhancer-expanded");
          if (existingState !== null) {
            setExpanded(existingState === "1");
          }
        }

        // Only attach click handler if not already attached
        if (!questionContainer.hasAttribute("data-chat-enhancer-click-handler")) {
          questionContainer.setAttribute("data-chat-enhancer-click-handler", "1");
          questionContainer.style.cursor = "pointer";
          questionContainer.addEventListener("click", () => {
            const current =
              questionContainer.getAttribute("data-chat-enhancer-expanded") ===
              "1";
            setExpanded(!current);
          });
        }
      });
      
      // Update rounds count after processing
      updateRoundsCount();
    }

    // Initial pass for already-rendered messages
    processPairs();

    // Observe for new messages as the conversation continues
    let pairTimeout = null;
    const observer = new MutationObserver((mutations) => {
      let shouldRepair = false;
      for (const m of mutations) {
        if (!m.addedNodes || !m.addedNodes.length) continue;
        m.addedNodes.forEach((node) => {
          if (adapter.isNewPair(node)) {
            shouldRepair = true;
          }
        });
      }

      // Debounce: wait a bit for the DOM to settle, then re-process all pairs
      if (shouldRepair) {
        if (pairTimeout) clearTimeout(pairTimeout);
        pairTimeout = setTimeout(() => {
          processPairs();
          updateRoundsCount();
        }, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function attachBehavior(panel) {
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

    log("Init called, platform:", PLATFORM);
    
    // Wait for platform to be active
    function checkAndInit() {
      if (adapter?.isActive()) {
        log("Platform is active, creating panel");
        const panel = createPanel();
        attachBehavior(panel);
        setupCollapsibleAnswers();
        log("Enhancer initialized on", PLATFORM);
      } else {
        // Retry after a short delay
        setTimeout(checkAndInit, 500);
      }
    }
    
    checkAndInit();
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


