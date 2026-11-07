const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const navLinks = Array.from(document.querySelectorAll('.hud-nav a[href^="#"]'));
const hudSectionTitle = document.getElementById("hudSectionTitle");
const mastheadElem = document.querySelector(".masthead");
const heroSectionElem = document.getElementById("top");

function updateMastheadTheme() {
  if (!mastheadElem || !heroSectionElem) return;
  const heroBottom = heroSectionElem.offsetTop + heroSectionElem.offsetHeight;
  const isOverDarkHero = window.scrollY < (heroBottom - 90);
  mastheadElem.classList.toggle("is-dark", isOverDarkHero);
}

window.addEventListener("scroll", updateMastheadTheme, { passive: true });
updateMastheadTheme();

const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const setActive = (id) => {
    let activeLabel = "TOP";
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
        activeLabel = link.dataset.label || link.dataset.section?.toUpperCase() || id.toUpperCase();
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (hudSectionTitle) {
      hudSectionTitle.textContent = activeLabel;
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    { rootMargin: "-35% 0px -45% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));

  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY < 180) {
        navLinks.forEach((link) => {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
        });
        if (hudSectionTitle) {
          hudSectionTitle.textContent = "TOP";
        }
      }
    },
    { passive: true }
  );
}

const copyButton = document.querySelector(".copy");

if (copyButton) {
  const email = copyButton.dataset.email;
  let timer;

  const showResult = (copied) => {
    copyButton.textContent = copied ? "Copied" : "Copy failed";
    copyButton.classList.toggle("is-copied", copied);
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      copyButton.textContent = "Copy address";
      copyButton.classList.remove("is-copied");
    }, 2000);
  };

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(email);
      showResult(true);
    } catch {
      const field = document.createElement("textarea");
      field.value = email;
      field.setAttribute("readonly", "");
      field.style.position = "absolute";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      showResult(copied);
    }
  });
}

const intro = document.getElementById("intro");
const latentCanvas = document.getElementById("latentCanvas");
const introSkipPrompt = document.querySelector(".intro-skip, .intro-skip-prompt");
const introWipe = document.getElementById("introWipe");
const progressBar = document.getElementById("progressBar");

const revealGroups = [
  [".section-head", 0],
  [".work", 90],
  [".portrait, .about-copy", 110],
  [".facts > div", 80],
  [".entry", 65],
  [".achievement-sub", 0],
  [".skill-card", 70],
  [".contact-lede, .email, .contact-actions", 90],
  [".footer-row, .colophon", 80],
];

const revealItems = [];
let revealObserver;
let countStarted = false;
let heroCountStarted = false;
let introActive = false;
let introDone = false;
let siteRevealed = false;
let introToken = 0;
let introFallback = 0;
let introHandlers = [];

const prepareReveals = () => {
  const seen = new Set();

  revealGroups.forEach(([selector, step]) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (seen.has(element)) {
        return;
      }

      seen.add(element);
      element.dataset.reveal = "";
      if (step) {
        const delay = Math.min(index * step, 420);
        element.style.setProperty("--reveal-delay", `${delay}ms`);
      }
      revealItems.push(element);
    });
  });

  const counts = document.querySelectorAll(".count");
  counts.forEach((c) => {
    c.textContent = "0";
  });
};

const animateCount = (el) => {
  if (!el || el.dataset.counted) return;
  el.dataset.counted = "true";
  const target = Number(el.dataset.count) || 0;
  const duration = 1300;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    el.textContent = String(Math.round(target * eased));

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      el.textContent = String(target);
    }
  };

  window.requestAnimationFrame(tick);
};

const countUp = () => {
  document.querySelectorAll(".count").forEach((el) => animateCount(el));
};

const startHeroCount = () => {
  if (heroCountStarted || reduceMotion) {
    return;
  }

  const count = document.querySelector(".hero-count");
  if (!count) {
    return;
  }

  heroCountStarted = true;
  const target = Number(count.dataset.count) || 0;
  count.textContent = "0";
  const duration = 1200;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    count.textContent = String(Math.round(target * eased));

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      count.textContent = String(target);
    }
  };

  window.requestAnimationFrame(tick);
};

const scramble = (element) => {
  if (element.dataset.scrambled) {
    return;
  }

  element.dataset.scrambled = "true";
  const finalText = element.textContent;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+";
  const duration = Math.min(900, 220 + finalText.length * 24);
  const start = performance.now();

  element.setAttribute("aria-label", finalText);

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const revealed = Math.floor(progress * finalText.length);
    let output = "";

    for (let index = 0; index < finalText.length; index += 1) {
      const character = finalText[index];
      if (character === " ") {
        output += " ";
      } else if (index < revealed) {
        output += character;
      } else {
        output += letters[Math.floor(Math.random() * letters.length)];
      }
    }

    element.textContent = output;

    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      element.textContent = finalText;
    }
  };

  window.requestAnimationFrame(tick);
};

const activateReveals = () => {
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((element) => element.classList.add("is-visible"));
    countUp();
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const element = entry.target;
        element.classList.add("is-visible");

        if (element.classList.contains("section-head")) {
          const heading = element.querySelector("h2");
          if (heading) {
            window.setTimeout(() => scramble(heading), 120);
          }
        }

        if (element.classList.contains("record-body") || element.classList.contains("achievement-sub")) {
          const counts = element.querySelectorAll(".count");
          counts.forEach((c) => animateCount(c));
        }

        revealObserver.unobserve(element);
      });
    },
    { rootMargin: "0px 0px -2% 0px", threshold: 0.12 }
  );

  revealItems.forEach((element) => revealObserver.observe(element));
};

const updateProgress = () => {
  if (!progressBar) {
    return;
  }

  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? Math.min(Math.max(window.scrollY / distance, 0), 1) : 0;
  progressBar.style.transform = `scaleX(${progress})`;
  if (progressBar.parentElement) {
    progressBar.parentElement.style.opacity = progress > 0.005 ? "1" : "0";
  }
};

let progressQueued = false;

const bindProgress = () => {
  window.addEventListener(
    "scroll",
    () => {
      if (progressQueued) {
        return;
      }

      progressQueued = true;
      window.requestAnimationFrame(() => {
        updateProgress();
        progressQueued = false;
      });
    },
    { passive: true }
  );

  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();
};

const bindParallax = () => {
  if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  const hero = document.querySelector(".hero");
  if (!hero) {
    return;
  }

  let frame = 0;

  hero.addEventListener("pointermove", (event) => {
    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      hero.style.setProperty("--mx", x.toFixed(3));
      hero.style.setProperty("--my", y.toFixed(3));
    });
  });

  hero.addEventListener("pointerleave", () => {
    hero.style.setProperty("--mx", "0");
    hero.style.setProperty("--my", "0");
  });
};

let particleAnimId = null;

// High-Dimensional Latent Space Simulation
const playLatentProjection = (token) => {
  return new Promise((resolve) => {
    if (!latentCanvas) {
      resolve();
      return;
    }

    const ctx = latentCanvas.getContext("2d");
    if (!ctx) {
      resolve();
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (latentCanvas.width = window.innerWidth * dpr);
    let height = (latentCanvas.height = window.innerHeight * dpr);
    latentCanvas.style.width = `${window.innerWidth}px`;
    latentCanvas.style.height = `${window.innerHeight}px`;

    // Adaptive typography: Stack on narrow portrait screens, horizontal on wide/landscape
    const isPortrait = window.innerHeight > window.innerWidth;
    const isNarrow = window.innerWidth < 768;
    const useTwoLines = isNarrow && isPortrait;
    const lines = useTwoLines ? ["SPANDAN", "GHODKE"] : ["SPANDAN GHODKE"];

    // Increased prominent font sizes
    const cssFont = useTwoLines
      ? Math.max(50, Math.min(80, Math.floor(window.innerWidth * 0.145)))
      : Math.max(72, Math.min(115, Math.floor(window.innerWidth * 0.062)));

    const fontPx = Math.floor(cssFont * dpr);

    // 1. Generate Target Coordinates from Typographic Raster
    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d");
    offCanvas.width = width;
    offCanvas.height = height;

    offCtx.fillStyle = "#ffffff";
    offCtx.font = `600 ${fontPx}px "Newsreader", Georgia, serif`;
    offCtx.textAlign = "center";
    offCtx.textBaseline = "middle";

    const centerY = height / 2;
    const lineGap = fontPx * 1.26;

    if (lines.length === 2) {
      offCtx.fillText(lines[0], width / 2, centerY - lineGap * 0.48);
      offCtx.fillText(lines[1], width / 2, centerY + lineGap * 0.48);
    } else {
      offCtx.fillText(lines[0], width / 2, centerY);
    }

    const imgData = offCtx.getImageData(0, 0, width, height).data;
    const targets = [];
    const step = Math.max(3, Math.floor(3.2 * dpr));

    const textSpan = lines.length * lineGap + 50 * dpr;
    const minY = Math.max(0, Math.floor(centerY - textSpan / 2));
    const maxY = Math.min(height, Math.ceil(centerY + textSpan / 2));

    for (let y = minY; y < maxY; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        if (imgData[index + 3] > 110) {
          targets.push({ x, y });
        }
      }
    }

    // 2. Initialize Latent Particles
    const numParticles = Math.min(targets.length, useTwoLines ? 420 : 680);
    const shuffledTargets = targets.sort(() => Math.random() - 0.5).slice(0, numParticles);

    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      const tgt = shuffledTargets[i];
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      particles.push({
        x: startX,
        y: startY,
        startX: startX,
        startY: startY,
        targetX: tgt.x,
        targetY: tgt.y,
        radius: (Math.random() * 1.4 + 1.2) * dpr,
        color: i % 5 === 0 ? "#608983" : i % 8 === 0 ? "#3A6B65" : i % 11 === 0 ? "#EAECE9" : "#BAC5BF",
        alpha: Math.random() * 0.45 + 0.55,
        spiralAngle: (Math.random() - 0.5) * Math.PI * 2,
        spiralDist: (Math.random() * 85 + 35) * dpr,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let startTime = performance.now();

    const tick = (now) => {
      if (token !== introToken) {
        cancelAnimationFrame(particleAnimId);
        resolve();
        return;
      }

      const elapsed = (now - startTime) / 1000;

      // Soft persistence trail for particle streaks
      ctx.fillStyle = "rgba(25, 44, 45, 0.26)";
      ctx.fillRect(0, 0, width, height);

      // Dedicated compaction journey: takes 3.1 full seconds for particles to travel and assemble!
      const compactionDuration = 3.1;
      const progress = Math.min(Math.max((elapsed - 0.1) / compactionDuration, 0), 1);

      // Smooth in-out cubic easing: starts gently, swirls inward, and gracefully decelerates into letter glyphs
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (progress < 1.0) {
          // Particles actively traveling together into form over the full 3.1s
          const swirlDamp = 1 - ease;
          const currentSwirl = Math.sin(now * 0.0025 + p.phase) * p.spiralDist * swirlDamp;
          const currentAngle = p.spiralAngle * swirlDamp;

          p.x = p.startX + (p.targetX - p.startX) * ease + Math.cos(currentAngle) * currentSwirl;
          p.y = p.startY + (p.targetY - p.startY) * ease + Math.sin(currentAngle) * currentSwirl;
        } else {
          // Fully assembled into crisp letter glyphs
          p.x = p.targetX;
          p.y = p.targetY;
        }

        // Draw Vector Point
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Delaunay Mesh connecting close neighbors during active convergence
        if (progress > 0.25 && progress < 0.96 && i % 3 === 0) {
          for (let j = i + 1; j < Math.min(i + 4, particles.length); j++) {
            const p2 = particles[j];
            const distSq = (p.x - p2.x) ** 2 + (p.y - p2.y) ** 2;
            const maxDistSq = (46 * dpr) ** 2;
            if (distSq < maxDistSq) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = "#3A6B65";
              ctx.globalAlpha = (1 - distSq / maxDistSq) * 0.35;
              ctx.lineWidth = 0.75 * dpr;
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1.0;

      // 3.1s travel + brief 0.35s snap hold = 3.45s total
      if (elapsed < 3.45) {
        particleAnimId = requestAnimationFrame(tick);
      } else {
        cancelAnimationFrame(particleAnimId);
        resolve();
      }
    };

    particleAnimId = requestAnimationFrame(tick);
  });
};

const playIntro = async (token) => {
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  await Promise.race([fontsReady, wait(450)]);

  if (token !== introToken) return;

  await playLatentProjection(token);

  if (token !== introToken) return;

  finishIntro(false);
};

const revealSite = () => {
  if (siteRevealed) {
    return;
  }

  siteRevealed = true;
  document.body.classList.add("intro-done");
  startHeroCount();
  activateReveals();
  bindProgress();
  bindParallax();
  updateProgress();
};

const completeIntro = () => {
  if (introDone) {
    return;
  }

  introDone = true;
  revealSite();
  document.body.classList.remove("intro-active");

  if (intro) {
    intro.hidden = true;
  }

  if (introWipe) {
    introWipe.hidden = true;
  }

  const regions = document.querySelectorAll(".masthead, main, .footer, .skip");
  regions.forEach((region) => {
    region.inert = false;
  });

  updateProgress();
};

const finishIntro = (fast) => {
  if (!introActive) {
    return;
  }

  introActive = false;
  introToken += 1;
  window.clearTimeout(introFallback);
  introHandlers.forEach((remove) => remove());
  introHandlers = [];

  if (introSkipPrompt) {
    introSkipPrompt.hidden = true;
  }

  if (!intro || typeof intro.animate !== "function") {
    completeIntro();
    return;
  }

  const duration = fast ? 240 : 640;
  const easing = fast ? "ease" : "cubic-bezier(0.76, 0, 0.24, 1)";

  revealSite();

  if (introWipe) {
    introWipe.hidden = false;
    introWipe.animate(
      [
        { transform: "translate3d(0, 0, 0)", opacity: 0 },
        { opacity: 1, offset: 0.08 },
        { opacity: 1, offset: 0.9 },
        {
          transform: `translate3d(${window.innerWidth}px, 0, 0)`,
          opacity: 0,
        },
      ],
      { duration, easing, fill: "forwards" }
    );
  }

  intro.animate(
    [
      { clipPath: "inset(0 0 0 0%)" },
      { clipPath: "inset(0 0 0 100%)" },
    ],
    { duration, easing, fill: "forwards" }
  );

  window.setTimeout(completeIntro, duration + 60);
};

const startIntro = () => {
  if (!intro || reduceMotion) {
    if (intro) {
      intro.hidden = true;
    }
    completeIntro();
    return;
  }

  introActive = true;
  introToken += 1;
  const token = introToken;

  document.body.classList.add("intro-active", "motion-ready");
  intro.removeAttribute("hidden");

  const regions = document.querySelectorAll(".masthead, main, .footer, .skip");
  regions.forEach((region) => {
    region.inert = true;
  });

  prepareReveals();

  const skip = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") {
      return;
    }

    finishIntro(true);
  };

  if (intro) {
    intro.addEventListener("click", skip);
  }
  document.addEventListener("keydown", skip);

  introHandlers = [
    () => {
      if (intro) {
        intro.removeEventListener("click", skip);
      }
    },
    () => document.removeEventListener("keydown", skip),
  ];

  introFallback = window.setTimeout(() => finishIntro(true), 9000);
  playIntro(token).catch(() => finishIntro(true));
};

startIntro();
