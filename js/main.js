// ================================================
// main.js — Group Motion Synced Version
// ================================================

// Simple navigation helper
function navigate(path) {
  window.location.href = path;
}

// Example contact form handler
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Form submitted! (Hook up backend)");
    });
  }
});


let PROJECT_DATA = {};

async function loadProjectJSON() {
  PROJECT_DATA = await fetch("data/projects.json").then(r => r.json());
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadProjectJSON();
});



// ---------------------------------------------
// SVG Setup
// ---------------------------------------------
const svg = document.getElementById("connection-svg");
const originEl = document.getElementById("line-origin");
const buttons = document.querySelectorAll(".big-button");
const profileBlock = document.querySelector(".profile-block");

// Line geometry
const LINE_OFFSET = 250; // Distance form profile block toward button
const LINE_OFFSET_PERCENTAGE = 0.5;
const LINE_WIDTH = 4; 
const LINE_COLOR_IDLE = "#444";

// Flow animation
const FLOW_RATE = 0.02; // % amount speed of flow fills/drains per frame
const FLOW_COLOR_IDLE = "#444";

// Snap Animation
const SNAP_DURATION = 150; 

// Transition animation
const TRANSITION_DURATION = 500;
const TRANSITION_DISTANCE_RATIO = 0.37;

// Fill to Completion
const FILL_COMPLETION_RATE = 0.02;

// UI motion
const BUTTON_FADE_OPACITY = 0;

let currentPoint = null;
let isSnapped = false;
let mouseMoveListenerActive = true;
let flowProgress = 0;
let flowDirection = 1;
let flowActive = false;
let flowAnimationFrame = null;
let targetButton = null;
let transitionLocked = false;
let cancelSnap = false;
let snapAnimationFrame = null;


const buttonColors = {
  "projects-btn": "var(--proj)",
  "about-btn": "var(--about)",
  "contact-btn": "var(--contact)"
};

const buttonTransitions = {
  "projects-btn": {
    forward: [
      { dx: -0.25, dy: 0.0, duration: 500}, // left 
      { dx: 0, dy: 0.25, duration: 500 },    // down
      { dx: -0.25, dy: 0, duration: 500 }   // left
    ]
  },
  "about-btn": {
    forward: [
      { dx: -0.5, dy: 0, duration: 1000 }    // just left
    ]
  },
  "contact-btn": {
    forward: [
      { dx: -0.25, dy: 0, duration: 500 }, // left
      { dx: 0, dy: -0.25, duration: 500 },  // up
      { dx: -0.25, dy: 0, duration: 500 }  // left
    ]
  }
};

const otherButtonAnimations = {
  "projects-btn": [
    { selector: ".about-btn", dy: 100, duration: 300 },   // move down
    { selector: ".contact-btn", dy: 100, duration: 300 }  // move down
  ],
  "about-btn": [
    { selector: ".projects-btn", dy: -100, duration: 300 }, // move up
    { selector: ".contact-btn", dy: 100, duration: 300 }   // move down
  ],
  "contact-btn": [
    { selector: ".projects-btn", dy: -100, duration: 300 }, // move up
    { selector: ".about-btn", dy: -100, duration: 300 }    // move up
  ]
};

const otherButtonAnimationsBack = {
  "projects-btn": [
    { selector: ".about-btn", dy: -100, fadeIn: true, duration: 300 },
    { selector: ".contact-btn", dy: -100, fadeIn: true, duration: 300 }
  ],
  "about-btn": [
    { selector: ".projects-btn", dy: 100, fadeIn: true, duration: 300 },
    { selector: ".contact-btn", dy: -100, fadeIn: true, duration: 300 }
  ],
  "contact-btn": [
    { selector: ".projects-btn", dy: 100, fadeIn: true, duration: 300 },
    { selector: ".about-btn", dy: 100, fadeIn: true, duration: 300 }
  ]
};


// Create base and overlay paths
const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("stroke", LINE_COLOR_IDLE);
path.setAttribute("stroke-width", LINE_WIDTH);
path.setAttribute("fill", "none");
svg.appendChild(path);

const overlayPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
overlayPath.setAttribute("stroke-width", LINE_WIDTH);
overlayPath.setAttribute("fill", "none");
overlayPath.style.strokeLinecap = "round";
svg.appendChild(overlayPath);

// ---------------------------------------------
// Geometry helpers
// ---------------------------------------------
// Gets the center of the right side of the profile block
function getOrigin() {
  const r = originEl.getBoundingClientRect();
  return { x: r.right, y: r.top + r.height / 2 };
}

// Gets the center of the left side of the target button
function getButtonTarget(btn) {
  const r = btn.getBoundingClientRect();
  return { x: r.left, y: r.top + r.height / 2 };
}

function getLineOffset() {
  const profileRect = originEl.getBoundingClientRect();
  const buttonRect = buttons[0].getBoundingClientRect();
  const distance = buttonRect.left - profileRect.right;
  return distance * LINE_OFFSET_PERCENTAGE;
}

// Builds the path from an origin point to a new point
// First calculates midX which is the origin plus the offset to the right
// It then creates the path of svg
// M states where the path starts at the origin position
// It then draws a line from the origin to the mid position
// It then draws a line vertically to the position of the target
// Finally it draws a line horizontally to the target
function buildPath(o, t) {
  const midX = o.x + LINE_OFFSET;
  //const midX = o.x + getLineOffset();
  return `M ${o.x} ${o.y}
          L ${midX} ${o.y}
          L ${midX} ${t.y}
          L ${t.x} ${t.y}`;
}

// Connects two points with the line path
// First gets the origin of the line
// Sets the attribute "d" or the path of the svg object of the path and overlay path
function updatePaths(target) {
  const origin = getOrigin();
  requestAnimationFrame(() => {
    path.setAttribute("d", buildPath(origin, target));
    overlayPath.setAttribute("d", buildPath(origin, target));
  });
}

// ---------------------------------------------
// Flow animation logic
// ---------------------------------------------
function animateFlow() {
  if (!flowActive) return;

  // Update the progress of the flow (0 to 1)
  // Flow direction 1 (fill) or -1 (drain)
  flowProgress += flowDirection * FLOW_RATE;

  // If the flow is completely filled
  if (flowProgress >= 1) {
    // Clamp to 100%
    flowProgress = 1;

    // Add glowing/pulsing effect
    overlayPath.classList.add("pulse");

    // Lock the button so it's active
    targetButton.classList.add("flow-lock");
  } 
  // If the flow is completely empty
  else if (flowProgress <= 0) {
    // Clamp to 0%
    flowProgress = 0;

    // Remove the glow effect
    overlayPath.classList.remove("pulse");

    // Reset the line color
    overlayPath.style.stroke = FLOW_COLOR_IDLE;
  }

  const length = overlayPath.getTotalLength();

  // Hides part of the line based on progress
  overlayPath.style.strokeDasharray = length;
  overlayPath.style.strokeDashoffset = length * (1 - flowProgress);

  flowAnimationFrame = requestAnimationFrame(animateFlow);
}

// ---------------------------------------------
// Unified mouse tracking
// ---------------------------------------------
// Listen for when the mouse moves anywhere on the screen with e being its position
document.addEventListener("mousemove", (e) => {
  // If the mouse tracking is off or the line is "snapped" to a button, do nothing
  if (!mouseMoveListenerActive || isSnapped) return;

  // Gets the current mouse position
  const target = { x: e.clientX, y: e.clientY };

  // Saves the current mouse position
  currentPoint = target;

  // Updates the line to follow the mouse
  updatePaths(target);
});

// ---------------------------------------------
// Snap behavior on hover
// ---------------------------------------------
// For every button we add a listener for entering and exiting
buttons.forEach((btn) => {

  // When the mouse moves over a button
  btn.addEventListener("mouseenter", () => {
    if(transitionLocked) return;
    if(btn.classList.contains("active")) return;
    // Lock the line to this button
    isSnapped = true;

    // Remember what button is targeted
    targetButton = btn;

    // Get the exact point on the button to snap to
    const t = getButtonTarget(btn);

    // Smoothly move the line to the button
    //animateSnap(t);
    animateSnapAsync(t);

    // Set the fill/overlay path to the button's color
    overlayPath.style.stroke = buttonColors[btn.classList[1]];
    //overlayPath.classList.remove("pulse");

    // Set flow direction towards the button
    flowDirection = 1;

    // Activate the flow
    flowActive = true;

    // Stop any previous animation
    cancelAnimationFrame(flowAnimationFrame);

    // Start the flow animation
    flowAnimationFrame = requestAnimationFrame(animateFlow);
  });

  // When the mouse leaves the button
  btn.addEventListener("mouseleave", () => {
    if(transitionLocked) return;
    // Don't un-snap if the button is pressed/active
    if (btn.classList.contains("active") || btn.classList.contains("pending-transition")) return;

    if(btn.classList.contains("flow-lock")) btn.classList.remove("flow-lock");
    
    cancelSnap = true;
    cancelAnimationFrame(snapAnimationFrame);

    // Unlock the line from the button
    isSnapped = false;

    // Allow for the flow to go back to the profile block
    flowDirection = -1;

    // Stop any previous animation
    cancelAnimationFrame(flowAnimationFrame);

    // Start drain animation
    flowAnimationFrame = requestAnimationFrame(animateFlow);
  });
});

function animateSnap(target, duration = SNAP_DURATION) {
  const origin = getOrigin();

  // If the line already has a current point, start from there; otherwise, start from origin
  const start = currentPoint ? { ...currentPoint } : { ...origin };
  const end = target;

  // Record the start time of the animation
  const startTime = performance.now();

  function animate(time) {
    // Calculates progress from 0 to 1
    const progress = Math.min((time - startTime) / duration, 1);

    // Apply an "ease out" effect to make the motion smooth
    // This ease function is an ease out quad of 1 - ((1-x) ^ 2)
    const ease = progress * (2 - progress);

    // Calculate new point based on easing
    currentPoint = {
      x: start.x + (end.x - start.x) * ease,
      y: start.y + (end.y - start.y) * ease,
    };

    // Redraw the line to the new point
    updatePaths(currentPoint);

    // If animation not finished, request next frame
    if (progress < 1) requestAnimationFrame(animate);
  }

  // Start the animation
  requestAnimationFrame(animate);
}

// Smoothly animate the line snapping from current position to button
// Returns a Promise that resolves once the snap is complete
function animateSnapAsync(target, duration = SNAP_DURATION) {
  return new Promise((resolve) => {
    cancelSnap = false;
    const origin = getOrigin();
    const start = currentPoint ? { ...currentPoint } : { ...origin };
    const end = target;
    const startTime = performance.now();

    function animate(time) {
      if(cancelSnap) {
        cancelAnimationFrame(snapAnimationFrame);
        resolve("cancelled");
        return;
      }

      const progress = Math.min((time - startTime) / duration, 1);
      const ease = progress * (2 - progress); // ease-out quadratic
      currentPoint = {
        x: start.x + (end.x - start.x) * ease,
        y: start.y + (end.y - start.y) * ease,
      };

      updatePaths(currentPoint);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve(); // Snap complete
      }
    }

    requestAnimationFrame(animate);
  });
}

// ---------------------------------------------
// Click → transition
// ---------------------------------------------
buttons.forEach(btn => {
  btn.addEventListener("click", () => handleBigButtonClick(btn));
});

async function handleBigButtonClick(btn) {
  // Ignore reundant clicks on already active buttons
  if(btn.classList.contains("active")) return;
  if(transitionLocked) return;

  transitionLocked = true;
  
  targetButton = btn;
  const t = getButtonTarget(btn);

  // Prevent user interaction & mouse drain during animation
  btn.classList.add("pending-transition");
  isSnapped = true;
  flowActive = false;
  cancelAnimationFrame(flowAnimationFrame);

  // Set the target color
  overlayPath.style.stroke = buttonColors[btn.classList[1]];

  await Promise.all([
    animateSnapAsync(t),
    fillFlowToCompletionAsync()
  ]);

  btn.classList.remove("pending-transition");
  // Make sure transforms are initialized to prevent teleport frame
  btn.style.transform = getComputedStyle(btn).transform === 'none' ? 'translateX(0px)' : getComputedStyle(btn).transform;
  profileBlock.style.transform = getComputedStyle(profileBlock).transform === 'none' ? 'translateX(0px)' : getComputedStyle(profileBlock).transform;

  // Wait one frame so browser commits transforms before moving
  await new Promise(r => requestAnimationFrame(r));
  startTransition(btn);

  /*
  if (btn.classList.contains("active") || flowProgress < 1) {
    targetButton = btn;
    flowDirection = 1;
    flowActive = true;
    cancelAnimationFrame(flowAnimationFrame);
    flowAnimationFrame = requestAnimationFrame(() => fillToCompletionThenTransition(btn));
    return;
  }
  */
  
}

function fillToCompletionThenTransition(btn) {
  if (flowProgress < 1) {
    flowProgress += FILL_COMPLETION_RATE;
    const length = overlayPath.getTotalLength();
    overlayPath.style.strokeDasharray = length;
    overlayPath.style.strokeDashoffset = length * (1 - flowProgress);
    requestAnimationFrame(() => fillToCompletionThenTransition(btn));
  } else {
    overlayPath.classList.add("pulse");
    startTransition(btn);
  }
}

// Smoothly fill the flow line until 100%
// Returns a Promise that resolves when flowProgress reaches 1
function fillFlowToCompletionAsync() {
  return new Promise((resolve) => {
    function step() {
      if (flowProgress < 1) {
        flowProgress += FILL_COMPLETION_RATE;
        const length = overlayPath.getTotalLength();
        overlayPath.style.strokeDasharray = length;
        overlayPath.style.strokeDashoffset = length * (1 - flowProgress);
        requestAnimationFrame(step);
      } else {
        // When full, visually pulse the line and lock it in
        overlayPath.classList.add("pulse");
        resolve(); // Flow complete
      }
    }
    requestAnimationFrame(step);
  });
}

// ---------------------------------------------
// Group-motion transition
// ---------------------------------------------
async function startTransition(btn) {
  mouseMoveListenerActive = false;
  isSnapped = true;
  flowActive = false;
  cancelAnimationFrame(flowAnimationFrame);

  overlayPath.style.stroke = buttonColors[btn.classList[1]];
  overlayPath.classList.add("pulse");

  btn.classList.add("active", "flow-lock");

  const homeContainer = document.querySelector(".home-container");
  homeContainer.classList.add("transitioning");

  const otherButtons = [...buttons].filter(b => b !== btn);
  otherButtons.forEach((b) => {
    b.style.transition = "transform 0.5s var(--ease), opacity 0.5s var(--ease)";

    b.getBoundingClientRect();
    
    b.style.opacity = "0";
  });

  const panel = document.querySelector(`[data-section-panel='${btn.dataset.section}']`);

  
  const sequence = buttonTransitions[btn.classList[1]].forward;
  await moveElementsSequence([btn, profileBlock], sequence);

  // Calculate distance to move left
  //const distance = window.innerWidth * TRANSITION_DISTANCE_RATIO;

  // Move active button + profile block left
  //await moveElements([btn, profileBlock], -distance, 0, TRANSITION_DURATION);

  // After movement completes → show panel + back button
  //panel.classList.add("visible");
  requestAnimationFrame(() => {
    panel.classList.add("visible");
  });
  document.getElementById("back-btn").classList.add("visible");
}

// Keep per-element current offsets in memory
const elementOffsets = new WeakMap();

function moveElements(elements, dx = 0, dy = 0, duration = TRANSITION_DURATION) {
  return new Promise((resolve) => {
    elements.forEach(el => el.style.transition = 'none');

    const startTime = performance.now();

    // Read current known offsets (default to 0)
    const startOffsets = elements.map(el => {
      const cur = elementOffsets.get(el) || { x: 0, y: 0 };
      return { startX: cur.x, startY: cur.y };
    });

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      //const ease = t * (2 - t);

      elements.forEach((el, i) => {
        const { startX, startY } = startOffsets[i];

        // Animate relative to current stored offset with ease
        //const offsetX = startX + dx * ease;
        //const offsetY = startY + dy * ease;

        // Animate relative to current stored offset
        const offsetX = startX + dx * t;
        const offsetY = startY + dy * t;

        el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

        // Update map on final frame
        if (t === 1) elementOffsets.set(el, { x: offsetX, y: offsetY });
      });

      // Sync line once per frame
      if (elements[0]) updatePaths(getButtonTarget(elements[0]));

      if (t < 1) requestAnimationFrame(animate);
      else resolve();
    }

    requestAnimationFrame(animate);
  });
}


// ---------------------------------------------
// Moves button, profile, and SVG together left
// ---------------------------------------------
function moveGroupLeft(btn, profileBlock, panel) {
  const distance = window.innerWidth * TRANSITION_DISTANCE_RATIO; // how far left they move
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / TRANSITION_DURATION, 1);
    const ease = t * (2 - t);

    const offset = -distance * t;

    // Move both elements
    btn.style.transform = `translateX(${offset}px)`;
    profileBlock.style.transform = `translateX(${offset}px)`;

    // Sync SVG line between them
    updatePaths(getButtonTarget(btn));

    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      panel.classList.add("visible");
      document.getElementById("back-btn").classList.add("visible");
    }
  }

  requestAnimationFrame(animate);
}

async function moveGroupRight(btn) {
  const panel = document.querySelector(`[data-section-panel='${btn.dataset.section}']`);

  // Hide panel BEFORE movement
  if (panel) panel.classList.remove("visible");
  document.getElementById("back-btn").classList.remove("visible");

  // Move active button + profile block back to original position
  await moveElements([btn, profileBlock], window.innerWidth * TRANSITION_DISTANCE_RATIO, 0, TRANSITION_DURATION); 
  // dx = 0 and dy = 0 works because moveElements calculates offset from current position

  // Cleanup after movement
  finalizeReturnTransition(btn, profileBlock);
}

// ---------------------------------------------
// Back button resets everything
// ---------------------------------------------
document.getElementById("back-btn").addEventListener("click", () => {
  reverseTransition();
});


async function reverseTransition() {
  const activeBtn = document.querySelector(".big-button.active");
  if (!activeBtn) return;

  const panel = document.querySelector(`[data-section-panel='${activeBtn.dataset.section}']`);
  const backBtn = document.getElementById("back-btn");
  const distance = window.innerWidth * TRANSITION_DISTANCE_RATIO;

  transitionLocked = true;

  // Hide panel and back button
  if (panel) panel.classList.remove("visible");
  backBtn.classList.remove("visible");

  // Wait for both to finish their CSS transitions before moving
  await Promise.all([
    waitForTransitionEnd(panel),
    waitForTransitionEnd(backBtn)
  ]);

  const forwardSequence = buttonTransitions[activeBtn.classList[1]].forward;
  const reverseSequence = getReverseSequence(forwardSequence);

  
  await moveElementsSequence([activeBtn, profileBlock], reverseSequence);

  //const distance2 = window.innerWidth * TRANSITION_DISTANCE_RATIO;

  // Now move both elements back to their original position
  //await moveElements([activeBtn, profileBlock], distance2, 0, TRANSITION_DURATION);

  // Clean up after the animation finishes
  finalizeReturnTransition(activeBtn);
}

function finalizeReturnTransition(activeBtn) {
  const container = document.querySelector(".home-container");

  container.classList.remove("transitioning");

  overlayPath.classList.remove("pulse", "moving");
  path.classList.remove("moving");
  overlayPath.style.stroke = FLOW_COLOR_IDLE;

  // Reset transforms and styles
  profileBlock.style.transform = "";
  buttons.forEach(b => {
    b.classList.remove("active", "flow-lock", "move-up", "move-down");
    b.style.opacity = "1";
    b.style.transform = "";
  });

  flowProgress = 0;
  isSnapped = false;
  mouseMoveListenerActive = true;
  cancelAnimationFrame(flowAnimationFrame);
  transitionLocked = false;
}


function waitForTransitionEnd(element) {
  return new Promise((resolve) => {
    if (!element) return resolve();
    const computed = getComputedStyle(element);
    const duration = parseFloat(computed.transitionDuration) * 1000;
    if (duration === 0) return resolve();

    const onEnd = () => {
      element.removeEventListener("transitionend", onEnd);
      resolve();
    };

    // Fallback in case 'transitionend' doesn't fire
    element.addEventListener("transitionend", onEnd, { once: true });
    setTimeout(resolve, duration + 50);
  });
}

async function moveElementsSequence(elements, sequence) {
  for (const step of sequence) {
    const dx = step.dx * window.innerWidth;
    const dy = step.dy * window.innerHeight;
    const duration = step.duration ?? TRANSITION_DURATION;
    await moveElements(elements, dx, dy, duration);
  }
}

function getReverseSequence(forwardSequence) {
  return [...forwardSequence].reverse().map(step => ({
    dx: -step.dx,
    dy: -step.dy,
    duration: step.duration
  }));
}



// ===== Projects Carousel Setup (robust overlay open/close) =====
document.addEventListener("DOMContentLoaded", () => {
  const carouselList = document.querySelector(".carousel__list");
  if (!carouselList) return; // if not on projects panel

  const carouselItems = document.querySelectorAll(".carousel__item");
  const elems = Array.from(carouselItems);
  const overlay = document.getElementById("project-overlay");
  const overlayBox = overlay && overlay.querySelector(".project-overlay-box");
  if (!overlay || !overlayBox) {
    console.warn("project overlay elements missing");
    return;
  }

  // Prevent clicks inside the overlayBox from closing the overlay
  overlayBox.addEventListener("click", (ev) => {
    ev.stopPropagation();
  });

  carouselList.addEventListener("click", (event) => {
    const item = event.target.closest(".carousel__item");
    if (!item) return;

    const isCenter = item.dataset.pos == "0";
    if (!isCenter) {
      updateCarousel(item);
      return;
    }

    // center card clicked -> open overlay
    const card = item.querySelector(".card");
    const rect = card.getBoundingClientRect();

    // Populate content
    populateProjectOverlay(card);

    // Ensure overlay is visible (do not use display:none; CSS uses opacity/pointer-events)
    overlay.classList.add("active");
    // Lock scrolling while overlay open
    document.body.style.overflow = "hidden";

    // Start overlayBox from card bounds
    Object.assign(overlayBox.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      opacity: "0",
      transition: "top 0.55s var(--ease), left 0.55s var(--ease), width 0.55s var(--ease), height 0.55s var(--ease), opacity 0.35s ease"
    });

    // Force layout so transitions will run
    overlayBox.getBoundingClientRect();

    // Expand to full overlay state on next frame (so CSS transition animates)
    requestAnimationFrame(() => {
      overlayBox.classList.add("expanded");
      overlayBox.style.opacity = "1";
    });

    // Close when clicking the overlay background (outside box). Use overlay click so it won't catch unrelated document clicks.
    const onOverlayClick = (e) => {
      if (e.target !== overlay) return; // only close if user clicked outside the box
      closeAndRevert();
    };
    overlay.addEventListener("click", onOverlayClick);

    // Close helper that reverses animation, then restores state
    function closeAndRevert() {
      // remove listener to avoid double-close
      overlay.removeEventListener("click", onOverlayClick);

      // Reverse animation: collapse box back to card rect
      overlayBox.classList.remove("expanded");
      overlayBox.style.opacity = "0";

      // animate box to card position/size (re-apply rect)
      Object.assign(overlayBox.style, {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      });

      // Fade overlay background (CSS active state controls opacity/pointer-events)
      overlay.classList.remove("active");

      // After transition completes, clear inline styles and restore scroll
      // Use timeout slightly longer than CSS transition (0.6s)
      setTimeout(() => {
        // clean inline styles that were only for animation
        overlayBox.style.transition = "";
        overlayBox.style.top = "";
        overlayBox.style.left = "";
        overlayBox.style.width = "";
        overlayBox.style.height = "";
        overlayBox.style.opacity = "";

        // restore body scroll
        document.body.style.overflow = "";
      }, 650);
    }
  });

  function updateCarousel(newActive) {
    const newPos = parseInt(newActive.dataset.pos);
    elems.forEach(elem => {
      const current = parseInt(elem.dataset.pos);
      const diff = current - newPos;
      if (Math.abs(diff) > 2) {
        //elem.dataset.pos = -current;
        elem.dataset.pos = (diff > 0 ? diff - 5 : diff + 5);
      } else {
        elem.dataset.pos = diff;
      }
    });
  }
});


function populateProjectOverlay(card) {
  const title = card.querySelector("h3").textContent;
  const data = PROJECT_DATA[title];

  if (!data) {
    console.warn(`No project data for "${title}"`);
    return;
  }

  // Title stays as-is
  document.getElementById("project-title").textContent = title;

  // Render all dynamic sections in order
  const contentHTML = renderProject(data);

  // Replace the ENTIRE overlay right-side content with dynamic HTML
  document.querySelector(".project-overlay-content").innerHTML = contentHTML;
}

function renderBlock(block) {
  switch (block.type) {

    case "p":
      return `<p>${block.content}</p>`;

    case "h2":
      return `<h2>${block.content}</h2>`;

    case "h3":
      return `<h3>${block.content}</h3>`;

    case "media":
      return `<div class="project-media">${block.content}</div>`;

    case "ul":
      return `<ul>${block.items.map(i => `<li>${i}</li>`).join("")}</ul>`;

    default:
      return "";
  }
}

function renderProject(project) {
  return project.sections.map(renderBlock).join("");
}
