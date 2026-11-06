const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const navLinks = Array.from(document.querySelectorAll('.masthead nav a[href^="#"]'));
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window && sections.length) {
  const setActive = (id) => {
    navLinks.forEach((link) => {
      const isActive = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach((section) => observer.observe(section));

  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY < 200) {
        navLinks.forEach((link) => {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
        });
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
const introCommand = document.getElementById("introCommand");
const introName = document.getElementById("introName");
const introBuildCommand = document.getElementById("introBuildCommand");
const introBuildState = document.getElementById("introBuildState");
const introSkip = document.querySelector(".intro-skip");
const introWipe = document.getElementById("introWipe");
const progressBar = document.getElementById("progressBar");

const revealGroups = [
  [".section-head", 0],
  [".work", 90],
  [".portrait, .about-copy", 110],
  [".facts > div", 80],
  [".entry", 65],
  [".record-body", 0],
  [".awards li", 70],
  [".skills > div", 55],
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

  const count = document.querySelector(".count");
  if (count) {
    count.textContent = "0";
  }
};

const countUp = () => {
  if (countStarted) {
    return;
  }

  countStarted = true;
  const count = document.querySelector(".count");
  if (!count) {
    return;
  }

  const target = Number(count.dataset.count) || 0;
  const duration = 1300;
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

        if (element.classList.contains("record-body")) {
          countUp();
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

const typeText = (element, text, speed, token) =>
  new Promise((resolve) => {
    if (!element) {
      resolve();
      return;
    }

    let index = 0;

    const type = () => {
      if (token !== introToken) {
        resolve();
        return;
      }

      element.textContent = text.slice(0, index);

      if (index >= text.length) {
        resolve();
        return;
      }

      index += 1;
      window.setTimeout(type, speed);
    };

    type();
  });

const playIntro = async (token) => {
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  await Promise.race([fontsReady, wait(650)]);

  if (token !== introToken) {
    return;
  }

  await wait(220);

  if (token !== introToken) {
    return;
  }

  await typeText(introCommand, "whoami", 62, token);

  if (token !== introToken) {
    return;
  }

  await wait(160);

  if (token !== introToken) {
    return;
  }

  intro.classList.add("is-naming");
  await typeText(introName, "spandanghodke", 34, token);

  if (token !== introToken) {
    return;
  }

  await wait(160);

  if (token !== introToken) {
    return;
  }

  intro.classList.add("is-ready");
  await wait(280);

  if (token !== introToken) {
    return;
  }

  intro.classList.add("is-shipping");
  if (introBuildState) {
    introBuildState.textContent = "pushing";
  }

  await wait(100);

  if (token !== introToken) {
    return;
  }

  await typeText(introBuildCommand, "git push origin main", 20, token);

  if (token !== introToken) {
    return;
  }

  await wait(70);

  if (token !== introToken) {
    return;
  }

  intro.classList.add("is-lighting");
  revealSite();
  await wait(760);

  if (token !== introToken) {
    return;
  }

  intro.classList.add("is-deployed");
  if (introBuildState) {
    introBuildState.textContent = "deployed";
  }

  await wait(140);

  if (token !== introToken) {
    return;
  }

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

  if (introSkip) {
    introSkip.hidden = true;
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

  if (introSkip) {
    introSkip.addEventListener("click", skip);
  }
  document.addEventListener("keydown", skip);

  introHandlers = [
    () => {
      if (introSkip) {
        introSkip.removeEventListener("click", skip);
      }
    },
    () => document.removeEventListener("keydown", skip),
  ];

  introFallback = window.setTimeout(() => finishIntro(true), 9000);
  playIntro(token).catch(() => finishIntro(true));
};

startIntro();
