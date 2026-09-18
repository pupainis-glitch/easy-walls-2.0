/**
 * Easy walls 2.0 — Mentora ("Aiz rokas") darba plūsma un pakāpeniskā atklāšana
 * Virziens 1: Šveices modernisms & Muzeja arhitektūra
 */
window.EW = window.EW || {};

EW.Mentor = (function() {
  let currentStep = 1;
  const STORAGE_KEY_STEP = 'ew_mentor_step';
  const STORAGE_KEY_EXPERT = 'ew_expert_view';

  const STEPS = [
    {
      id: 1,
      num: 1,
      shortTitle: '1. Telpa',
      fullTitle: '1. Telpas plāns & Ekspozīcijas',
      hint: 'Izvēlieties telpu veidni, atveriet saglabāto ekspozīciju vai izveidojiet jaunu.',
      openCards: ['cardPlan', 'cardGrids'],
      nextLabel: 'Tālāk: 2. Sienu karkass ➔'
    },
    {
      id: 2,
      num: 2,
      shortTitle: '2. Karkass',
      fullTitle: '2. Sienu karkass & Paneļi',
      hint: 'Izvietojiet moduļu sienas ar Drag & Drop (2×1m, 1×2m, 1×1m) un uzģenerējiet apdares paneļus.',
      openCards: ['cardModules', 'cardPanels'],
      nextLabel: 'Tālāk: 3. Dokumentācija & PDF ➔'
    },
    {
      id: 3,
      num: 3,
      shortTitle: '3. Eksports',
      fullTitle: '3. Dokumentācija & PDF',
      hint: 'Apskatiet montāžas specifikāciju un lejupielādējiet gatavo montāžas PDF rasējumu.',
      openCards: ['cardDocs'],
      nextLabel: 'Pabeigt ekspozīciju ✓'
    }
  ];

  function getStep() {
    return currentStep;
  }

  function setStep(stepNum, triggerAnimation = true) {
    stepNum = Math.max(1, Math.min(STEPS.length, parseInt(stepNum, 10) || 1));
    currentStep = stepNum;

    try {
      localStorage.setItem(STORAGE_KEY_STEP, String(currentStep));
    } catch (e) {}

    // Update body dataset
    document.body.classList.add('mentor-mode');
    document.body.dataset.mentorStep = String(currentStep);

    const stepDef = STEPS[currentStep - 1];

    // Update stepper UI
    const stepEls = document.querySelectorAll('#mentorStepperList .mentor-step');
    stepEls.forEach(el => {
      const s = parseInt(el.dataset.step, 10);
      el.classList.toggle('active', s === currentStep);
      el.classList.toggle('completed', s < currentStep);
    });

    // Update hint
    const hintMsg = document.getElementById('mentorHintMsg');
    if (hintMsg) {
      hintMsg.innerHTML = `<b>${stepDef.shortTitle}</b> · ${stepDef.hint}`;
    }

    // Update prev/next buttons
    const btnPrev = document.getElementById('btnMentorPrev');
    if (btnPrev) {
      btnPrev.disabled = currentStep === 1;
      btnPrev.title = currentStep > 1 ? `Atpakaļ uz soli ${currentStep - 1}` : 'Iepriekšējais solis';
    }

    const btnNext = document.getElementById('btnMentorNext');
    if (btnNext) {
      btnNext.textContent = stepDef.nextLabel;
      btnNext.title = currentStep < STEPS.length ? `Pāriet uz soli ${currentStep + 1}` : 'Ekspozīcijas pabeigšana un eksports';
    }

    // Update accordions: if not in expert view, auto open the designated cards
    if (!document.body.classList.contains('expert-view')) {
      const allCards = document.querySelectorAll('.side-card[data-step]');
      allCards.forEach(card => {
        const cStep = card.getAttribute('data-step');
        if (cStep === String(currentStep)) {
          if (stepDef.openCards.includes(card.id)) {
            card.open = true;
          }
        } else {
          card.open = false;
        }
      });
    }

    // Update dock icon highlight to match active step
    const primaryCard = stepDef.openCards[0];
    if (primaryCard) {
      const dockBtns = document.querySelectorAll('#appToolDock .dock-btn[data-target-card]');
      dockBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.targetCard === primaryCard);
      });
      if (document.body.classList.contains('drawer-open') && EW.UI && typeof EW.UI.openToolDrawer === 'function') {
        EW.UI.openToolDrawer(primaryCard);
      }
    }

    // Optional Framer Motion micro-animation
    if (triggerAnimation && window.Motion) {
      try {
        window.Motion.animate(
          '#stageMentorBar .mentor-step.active',
          { scale: [0.94, 1.03, 1], opacity: [0.8, 1] },
          { duration: 0.28, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
        );
      } catch (e) {}
    }
  }

  function nextStep() {
    if (currentStep < STEPS.length) {
      setStep(currentStep + 1);
    } else {
      // Step 4 final action
      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast('Ekspozīcija sagatavota! Varat lejupielādēt montāžas PDF un specifikāciju.');
      }
      const cardDocs = document.getElementById('cardDocs');
      if (cardDocs) cardDocs.open = true;
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  }

  function isExpertView() {
    return document.body.classList.contains('expert-view');
  }

  function setExpertView(enable) {
    document.body.classList.toggle('expert-view', !!enable);
    try {
      localStorage.setItem(STORAGE_KEY_EXPERT, enable ? 'true' : 'false');
    } catch (e) {}

    const btn = document.getElementById('btnToggleExpertView');
    const icon = document.getElementById('expertViewIcon');
    const txt = document.getElementById('expertViewText');

    if (enable) {
      if (icon) icon.textContent = '📋';
      if (txt) txt.textContent = 'Vedņa skats (Soļi 1–4)';
      if (btn) btn.title = 'Atgriezties pie vadītā soļu procesa';
      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast('Eksperta režīms ieslēgts: visi rīki ir redzami');
      }
    } else {
      if (icon) icon.textContent = '👁️';
      if (txt) txt.textContent = 'Eksperta skats (visi rīki)';
      if (btn) btn.title = 'Rādīt visus rīkus vienlaicīgi bez soļu ierobežojuma';
      setStep(currentStep, false);
      if (EW.UI && typeof EW.UI.toast === 'function') {
        EW.UI.toast('Mentora vedņa režīms: rādīti tikai aktīvā soļa rīki');
      }
    }
  }

  function toggleExpertView() {
    setExpertView(!isExpertView());
  }

  function init() {
    let savedStep = 1;
    try {
      const s = localStorage.getItem(STORAGE_KEY_STEP);
      if (s) savedStep = parseInt(s, 10) || 1;
    } catch (e) {}

    let savedExpert = false;
    try {
      savedExpert = localStorage.getItem(STORAGE_KEY_EXPERT) === 'true';
    } catch (e) {}

    // Stepper click handlers
    const stepEls = document.querySelectorAll('#mentorStepperList .mentor-step');
    stepEls.forEach(el => {
      el.addEventListener('click', () => {
        const s = parseInt(el.dataset.step, 10);
        if (s) setStep(s);
      });
    });

    // Prev / Next button listeners
    const btnPrev = document.getElementById('btnMentorPrev');
    if (btnPrev) {
      btnPrev.addEventListener('click', prevStep);
    }

    const btnNext = document.getElementById('btnMentorNext');
    if (btnNext) {
      btnNext.addEventListener('click', nextStep);
    }

    // Expert view toggle button
    const btnExpert = document.getElementById('btnToggleExpertView');
    if (btnExpert) {
      btnExpert.addEventListener('click', toggleExpertView);
    }

    // Apply expert view if saved
    if (savedExpert) {
      setExpertView(true);
    }

    // Apply initial step
    setStep(savedStep, false);
  }

  return {
    init,
    getStep,
    setStep,
    nextStep,
    prevStep,
    isExpertView,
    setExpertView,
    toggleExpertView,
    STEPS
  };
})();
