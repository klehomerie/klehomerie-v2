document.addEventListener('DOMContentLoaded', function () {
    
  // --- 1. SVG ICONS DATABASE ---
  const icons = {
      key: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>`,
      camera: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
      turnover: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>`
  };

  // --- 2. PACKAGES DATA ---
  const packagesData = [
      { id: 'scan', titleKey: 'pkg_scan_title', descKey: 'pkg_scan_desc', isNew: true },
      { id: 'audit', titleKey: 'pkg_audit_title', descKey: 'pkg_audit_desc', isNew: true },
      { id: 'guardian', titleKey: 'pkg_guardian_title', descKey: 'pkg_guardian_desc', isNew: false },
      { id: 'activation', titleKey: 'pkg_activation_title', descKey: 'pkg_activation_desc', isNew: false }
  ];

  // --- 3. DOM ELEMENTS & INITIAL SETUP ---
  const header = document.getElementById('header');
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  const packagesContainer = document.getElementById('packages-container'); 

  // Theme Toggles
  const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
  const lightIcons = document.querySelectorAll('.light-mode-icon');
  const darkIcons = document.querySelectorAll('.dark-mode-icon');

  const contactForm = document.getElementById('contact-form');
  const formSuccessMessage = document.getElementById('contact-form-message');
  
  const serviceNeedsInput = document.getElementById('service-needs-input');
  const recommendServicesButton = document.getElementById('recommend-services-button');
  const recommendationOutputContainer = document.getElementById('recommendation-output-container');
  const recommendationOutput = document.getElementById('recommendation-output');
  const recommendationLoading = document.getElementById('recommendation-loading');
  
  const langButtons = document.querySelectorAll('.lang-btn');
  const scrollLinks = document.querySelectorAll('a[href^="#"]');
  
  // --- SEO FIX: READ URL PARAMETERS ---
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');

  // Determine initial language (URL Parameter > LocalStorage > Default 'en')
  let initialLang = localStorage.getItem('lang') || 'en';

  if (urlLang === 'fr') {
      initialLang = 'fr';
  } else if (urlLang === 'el') {
      initialLang = 'el'; // Cleanly mapped to your content.js 'el' key array
  } else if (urlLang === 'en') {
      initialLang = 'en';
  }

  let currentLang = initialLang;
  let currentTheme = localStorage.getItem('theme') || 'light';

  // --- 4. GENERATE FLIP CARDS ---
  if (packagesContainer) {
      packagesContainer.innerHTML = packagesData.map(pkg => `
          <div class="flip-card h-96 w-full perspective-1000 group cursor-pointer">
              <div class="flip-card-inner relative w-full h-full transition-transform duration-700 transform-style-3d">
                  
                  <div class="flip-card-front absolute w-full h-full bg-[--card-bg] rounded-xl shadow-lg flex flex-col items-center justify-center p-6 backface-hidden border border-gray-100 dark:border-gray-700">
                      ${pkg.isNew ? '<span class="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">NEW</span>' : ''}
                      
                      <div class="text-[--accent-color] mb-4 text-5xl">
                          ${pkg.id === 'scan' ? '🔎' : pkg.id === 'audit' ? '🏗️' : pkg.id === 'guardian' ? '🛡️' : '🔑'}
                      </div>
                      
                      <h3 class="text-xl md:text-2xl font-bold text-center text-[--title-color]" data-lang-key="${pkg.titleKey}">Loading...</h3>
                      
                      <div class="absolute bottom-0 right-0 w-0 h-0 border-b-[30px] border-r-[30px] border-b-gray-300 border-r-white dark:border-b-gray-600 dark:border-r-gray-800 corner-peel opacity-50"></div>
                      <p class="mt-4 text-xs text-gray-400 uppercase tracking-widest">Tap to flip</p>
                  </div>

                  <div class="flip-card-back absolute w-full h-full bg-[--accent-color] text-white rounded-xl shadow-lg flex flex-col items-center justify-center p-4 md:p-8 rotate-y-180 backface-hidden overflow-y-auto">
                      <div class="text-base font-medium leading-relaxed w-full text-[--card-back-text]" data-lang-key="${pkg.descKey}">Loading info...</div>
                  </div>
              </div>
          </div>
      `).join('');
  }

  // --- 5. THEME LOGIC ---
  function updateThemeUI(isDark) {
      if (isDark) {
          document.documentElement.classList.add('dark');
          lightIcons.forEach(icon => icon.classList.remove('hidden'));
          darkIcons.forEach(icon => icon.classList.add('hidden'));
      } else {
          document.documentElement.classList.remove('dark');
          lightIcons.forEach(icon => icon.classList.add('hidden'));
          darkIcons.forEach(icon => icon.classList.remove('hidden'));
      }
  }

  function toggleTheme() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      updateThemeUI(isDark);
  }
  
  if (currentTheme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      updateThemeUI(true);
  } else {
      updateThemeUI(false);
  }

  themeToggleBtns.forEach(btn => btn.addEventListener('click', toggleTheme));

  // --- 6. LANGUAGE LOGIC (FIXED) ---
  function updateLanguage(lang) {
      if (typeof window.translations === 'undefined') {
          console.warn("Translations not loaded yet.");
          return; 
      }

      document.querySelectorAll('[data-lang-key]').forEach(el => {
          const key = el.dataset.langKey;
          const t = window.translations[lang] || window.translations['en'];
          const translation = t[key] || window.translations['en'][key];

          if (translation) {
              if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  el.placeholder = translation;
              } 
              else if (key.includes('_desc') || key.includes('aboutText') || key.includes('pkg_') || key.includes('Text') || key.includes('faq_') || key.startsWith('privacy_') || key.startsWith('terms_')) {
                  el.innerHTML = translation.replace(/\n/g, '<br>');
              } else {
                  el.textContent = translation;
              }
          }
      });
      
      langButtons.forEach(btn => {
          if (btn.dataset.lang === lang) {
              btn.classList.add('text-[--accent-color]', 'underline');
              btn.classList.remove('text-gray-500');
          } else {
              btn.classList.remove('text-[--accent-color]', 'underline');
              btn.classList.add('text-gray-500');
          }
      });

      currentLang = lang;
      localStorage.setItem('lang', lang);
  }

  // --- 7. NAVIGATION SCROLL ---
  function handleScroll() {
      if (header && window.scrollY > 50) {
          header.classList.add('bg-white', 'shadow-md', 'dark:bg-gray-900');
      } else if (header) {
          header.classList.remove('bg-white', 'shadow-md', 'dark:bg-gray-900');
      }
  }

  // --- 8. MOBILE MENU ---
  if (mobileMenuButton && mobileMenu) {
      mobileMenuButton.addEventListener('click', () => {
          mobileMenu.classList.toggle('hidden');
      });
      mobileMenu.querySelectorAll('button').forEach(link => {
          link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
      });
  }

  function scrollToSection(event) {
      event.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (!targetElement) return;
      
      const headerOffset = header ? header.offsetHeight : 0;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
  }

  // --- 9. RECOMMENDER LOGIC ---
  function getRecommendation(prompt) {
      const lowerCasePrompt = prompt.toLowerCase();
      const t = (typeof window.translations !== 'undefined') ? (window.translations[currentLang] || window.translations['en']) : {};
      
      const keywords = {
          recommendationSupervise: ['supervise', 'watch', 'check', 'repair', 'fix'],
          recommendationInventory: ['inventory', 'tenant', 'move'],
          recommendationEmergency: ['emergency', 'storm', 'leak', 'urgent'],
          recommendationBills: ['bill', 'electricity', 'water', 'pay'],
          recommendationTurnkeyBundle: ['invest', 'buy', 'renovate'],
          recommendationNewTenantBundle: ['rent', 'lease', 'long term']
      };

      let matches = [];
      for (const [key, words] of Object.entries(keywords)) {
          if (words.some(w => lowerCasePrompt.includes(w))) {
              matches.push(t[key] || window.translations['en'][key]);
          }
      }

      if (matches.length > 0) return "Based on your input:\n\n" + [...new Set(matches)].join('\n\n');
      return t.recommendationDefault || "We recommend a Technical Audit to start.";
  }

  async function handleRecommendClick() {
      if (!serviceNeedsInput) return;
      const userInput = serviceNeedsInput.value.trim();
      if (!userInput) return;
      
      if (recommendationLoading) recommendationLoading.classList.remove('hidden');
      if (recommendationOutputContainer) recommendationOutputContainer.classList.remove('hidden');
      if (recommendationOutput) recommendationOutput.innerHTML = '';
      
      await new Promise(r => setTimeout(r, 600));
      
      const result = getRecommendation(userInput);
      if (recommendationLoading) recommendationLoading.classList.add('hidden');
      if (recommendationOutput) recommendationOutput.innerHTML = result.replace(/\n/g, '<br>');
  }

  // --- 10. FORM SUBMIT ---
  if (contactForm) {
      contactForm.addEventListener('submit', async function(event) {
          event.preventDefault();
          const submitButton = contactForm.querySelector('button[type="submit"]');
          const originalText = submitButton.textContent;
          
          submitButton.disabled = true;
          submitButton.textContent = 'Sending...';
          await new Promise(r => setTimeout(r, 1000));
          
          contactForm.reset();
          formSuccessMessage.classList.remove('hidden');
          formSuccessMessage.textContent = "Message sent! We will protect your concrete shortly.";
          formSuccessMessage.style.display = 'block';
          
          submitButton.disabled = false;
          submitButton.textContent = originalText;
          setTimeout(() => { formSuccessMessage.classList.add('hidden'); }, 5000);
      });
  }

  // --- 11. FLIP CARD INTERACTION ---
  if (packagesContainer) {
      packagesContainer.addEventListener('click', function(e) {
          const card = e.target.closest('.flip-card');
          if (card) card.classList.toggle('flipped');
      });
  }

  // --- 12. SCROLL ANIMATION ---
  const observerOptions = { root: null, rootMargin: '0px', threshold: 0.1 };
  const observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target); 
          }
      });
  }, observerOptions);

  document.querySelectorAll('.slide-in').forEach(el => observer.observe(el));

  // --- 13. RISK CALCULATOR LOGIC ---
  const calcBtn = document.getElementById('calc-btn');
  const calcResult = document.getElementById('calc-result');
  const scoreCircle = document.getElementById('score-circle');
  const scoreTitle = document.getElementById('score-title');
  const scoreText = document.getElementById('score-text');

  if (calcBtn) {
      calcBtn.addEventListener('click', function() {
          let totalRisk = 0;
          const form = document.getElementById('risk-calc-form');
          const inputs = form.querySelectorAll('input[type="radio"]:checked');
          
          let answeredCount = inputs.length;
          inputs.forEach(input => { totalRisk += parseInt(input.value); });

          totalRisk += (5 - answeredCount) * 10; 
          if (totalRisk > 100) totalRisk = 100;

          const t = (typeof window.translations !== 'undefined') ? (window.translations[currentLang] || window.translations['en']) : {};
          let title = '', text = '', color = '';

          if (totalRisk >= 50) {
              title = t.resultHigh || "CRITICAL RISK";
              text = t.resultTextHigh || "High exposure detected.";
              color = "#C66C54"; 
          } else if (totalRisk >= 20) {
              title = t.resultMod || "MODERATE RISK";
              text = t.resultTextHigh || "Caution advised."; 
              color = "#F59E0B"; 
          } else {
              title = t.resultLow || "SECURE";
              text = t.resultTextLow || "Visuals look good.";
              color = "#10B981"; 
          }

          calcResult.classList.remove('hidden');
          scoreCircle.style.borderColor = color;
          scoreTitle.style.color = color;
          scoreTitle.textContent = title;
          scoreText.textContent = text;
          
          let currentScore = 0;
          const interval = setInterval(() => {
              scoreCircle.textContent = currentScore + "%";
              if (currentScore >= totalRisk) clearInterval(interval);
              currentScore++;
          }, 10);
          
          calcResult.scrollIntoView({ behavior: 'smooth' });
      });
  }

  // --- 14. FAQ GENERATION ---
  const faqData = [
      { q: 'faq_q1', a: 'faq_a1' }, 
      { q: 'faq_q2', a: 'faq_a2' },
      { q: 'faq_q3', a: 'faq_a3' },
      { q: 'faq_q4', a: 'faq_a4', img: 'images/thermal-audit-example.png' }, 
      { q: 'faq_q5', a: 'faq_a5' },
      { q: 'faq_q6', a: 'faq_a6' },
      { q: 'faq_q7', a: 'faq_a7' },
      { q: 'faq_q8', a: 'faq_a8' },
      { q: 'faq_q9', a: 'faq_a9' },
      { q: 'faq_q10', a: 'faq_a10' },
      { q: 'faq_q11', a: 'faq_a11' }
  ];

  const faqContainer = document.getElementById('faq-container');
  const modal = document.getElementById('image-modal');
  const modalImg = document.getElementById('modal-img');

  if (faqContainer) {
      faqContainer.innerHTML = faqData.map(item => {
          const hasImage = item.img ? true : false;
          return `
          <div class="faq-item bg-[--card-bg] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3">
              <button class="faq-question w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <span class="font-bold text-[--title-color] text-lg" data-lang-key="${item.q}">Loading...</span>
                  <svg class="faq-icon w-5 h-5 text-[--accent-color] transform transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              <div class="faq-answer px-6 pb-0 text-[--text-color]">
                  <div class="py-4">
                      <p class="mb-4 leading-relaxed" data-lang-key="${item.a}">Loading...</p>
                      ${hasImage ? `
                      <div class="mt-4 relative group cursor-zoom-in w-full md:w-2/3 lg:w-1/2" onclick="openModal('${item.img}')">
                          <img src="${item.img}" alt="Technical Audit Thermal Scan" class="rounded-lg shadow-md border-2 border-[--accent-color] w-full object-cover h-48 md:h-64">
                          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                              <span class="opacity-0 group-hover:opacity-100 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">Tap to Zoom 🔍</span>
                          </div>
                      </div>` : ''}
                  </div>
              </div>
          </div>
          `;
      }).join('');

      // Accordion Logic
      document.querySelectorAll('.faq-question').forEach(btn => {
          btn.addEventListener('click', () => {
              const item = btn.parentElement;
              const isActive = item.classList.contains('active');
              document.querySelectorAll('.faq-item').forEach(i => {
                  i.classList.remove('active');
                  i.querySelector('.faq-icon').style.transform = 'rotate(0deg)';
              });
              if (!isActive) {
                  item.classList.add('active');
                  btn.querySelector('.faq-icon').style.transform = 'rotate(180deg)';
              }
          });
      });
  }

  // Modal Logic
  window.openModal = function(src) {
      if(modal && modalImg) {
          modalImg.src = src;
          modal.classList.remove('hidden');
          modal.classList.add('visible'); 
      }
  }

  if (modal) {
      modal.addEventListener('click', () => {
          modal.classList.add('hidden');
          modal.classList.remove('visible');
      });
  }

  // --- 15. INITIALIZATION & EVENTS ---
  window.addEventListener('scroll', handleScroll);
  langButtons.forEach(btn => btn.addEventListener('click', () => updateLanguage(btn.dataset.lang)));
  scrollLinks.forEach(link => link.addEventListener('click', scrollToSection));
  if (recommendServicesButton) recommendServicesButton.addEventListener('click', handleRecommendClick);

  // Force unified translation mapping sync
  if (typeof window.translations !== 'undefined') {
      updateLanguage(currentLang);
  } else {
      setTimeout(() => updateLanguage(currentLang), 100);
      setTimeout(() => updateLanguage(currentLang), 500);
  }
});