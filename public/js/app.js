import { SPARouter } from './spa-router.js';

/**
 * Main Application Frontend Controller
 * Handles SPA navigation, dynamic scenario interactions, and accessible widgets.
 */

// Global reference storage for modal focus restoration
let lastActiveElementBeforeModal = null;

// Initialize SPA router
const router = new SPARouter({
  mainContainerId: 'main-content',
  activeLinksSelector: '.nav-link'
});

// Initialize interactive widgets on initial load and route changes
function bindInteractiveWidgets() {
  console.log('[App] Binding interactive widgets for current view...');

  // 1. Register Filter Buttons
  const filterButtons = document.querySelectorAll('.filter-btn');
  const tableRows = document.querySelectorAll('#register-table tbody tr');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      tableRows.forEach(row => {
        if (filter === 'all') {
          row.style.display = '';
        } else if (filter === 'defect' || filter === 'compliant') {
          row.style.display = row.getAttribute('data-classification') === filter ? '' : 'none';
        } else if (filter === 'dynamic' || filter === 'static') {
          row.style.display = row.getAttribute('data-nature') === filter ? '' : 'none';
        }
      });
    });
  });

  // 2. Scenario S1: Route Change Demonstrations
  const s1DefectBtn = document.getElementById('s1-nav-defect');
  const s1CompBtn = document.getElementById('s1-nav-compliant');
  const s1View = document.getElementById('s1-dynamic-view');
  const s1Title = document.getElementById('s1-view-title');
  const s1Desc = document.getElementById('s1-view-desc');

  if (s1DefectBtn && s1CompBtn) {
    s1DefectBtn.addEventListener('click', () => {
      // Defective: updates content without updating document.title and without managing focus
      window.history.pushState({ view: 'profile-defect' }, '', '/scenarios?view=profile-defect');
      s1Title.textContent = 'Defective View: User Security Profile';
      s1Desc.textContent = 'Notice: document.title was NOT updated, and focus was not placed here.';
      // document.title left unchanged!
    });

    s1CompBtn.addEventListener('click', () => {
      // Compliant: updates content, updates document.title, shifts focus to view container
      window.history.pushState({ view: 'settings-compliant' }, '', '/scenarios?view=settings-compliant');
      document.title = 'Settings & Security Dashboard | WCAG 2.2 Test Bed';
      s1Title.textContent = 'Compliant View: Settings & Security Dashboard';
      s1Desc.textContent = 'Success: document.title dynamically updated and focus moved to container.';
      s1View.focus();
    });
  }

  // 3. Scenario S2: Modal Dialogs
  const s2OpenComp = document.getElementById('s2-open-compliant');
  const s2OpenDef = document.getElementById('s2-open-defect');
  const s2Feedback = document.getElementById('s2-feedback');

  const compModal = document.getElementById('modal-compliant-s2');
  const defModal = document.getElementById('modal-defect-s2');

  if (s2OpenComp && compModal) {
    const closeTop = document.getElementById('modal-s2-close-top');
    const closeCancel = document.getElementById('modal-s2-cancel');

    function openModal() {
      lastActiveElementBeforeModal = document.activeElement;
      compModal.style.display = 'flex';
      compModal.setAttribute('aria-hidden', 'false');
      if (s2Feedback) s2Feedback.textContent = 'Compliant modal is currently open.';
      // Move focus into the example dialog.
      if (closeTop) closeTop.focus();
    }

    function closeModal() {
      compModal.style.display = 'none';
      compModal.setAttribute('aria-hidden', 'true');
      if (s2Feedback) s2Feedback.textContent = 'Compliant modal closed. Focus restored.';
      if (lastActiveElementBeforeModal && typeof lastActiveElementBeforeModal.focus === 'function') {
        lastActiveElementBeforeModal.focus();
      }
    }

    s2OpenComp.addEventListener('click', openModal);
    if (closeTop) closeTop.addEventListener('click', closeModal);
    if (closeCancel) closeCancel.addEventListener('click', closeModal);

    // Trap focus inside compliant modal
    compModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = compModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });
  }

  if (s2OpenDef && defModal) {
    const defClose = document.getElementById('modal-defect-close');
    s2OpenDef.addEventListener('click', () => {
      defModal.style.display = 'block';
      if (s2Feedback) s2Feedback.textContent = 'Defective modal opened. (Focus NOT shifted inside!)';
      // Focus left on trigger button!
    });
    if (defClose) {
      defClose.addEventListener('click', () => {
        defModal.style.display = 'none';
        if (s2Feedback) s2Feedback.textContent = 'Defective modal closed. (Focus NOT restored!)';
        // Focus deliberately blurred to document body
        document.body.focus();
      });
    }
  }

  // 4. Scenario S3: Status Messages & Live Regions
  const s3SuccessBtn = document.getElementById('s3-submit-success');
  const s3ErrorBtn = document.getElementById('s3-submit-error');
  const s3DefectBtn = document.getElementById('s3-submit-defect');

  const politeRegion = document.getElementById('s3-compliant-status-region');
  const alertRegion = document.getElementById('s3-compliant-alert-region');
  const silentRegion = document.getElementById('s3-defect-container');

  if (s3SuccessBtn && politeRegion) {
    s3SuccessBtn.addEventListener('click', async () => {
      const username = document.getElementById('s3-username')?.value || 'Researcher';
      try {
        const res = await fetch('/api/submit-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'success', name: username })
        });
        const data = await res.json();
        politeRegion.textContent = `Success: ${data.message}`;
        if (alertRegion) alertRegion.textContent = '';
        if (silentRegion) silentRegion.textContent = '';
      } catch (err) {
        politeRegion.textContent = 'Network error occurred.';
      }
    });
  }

  if (s3ErrorBtn && alertRegion) {
    s3ErrorBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/submit-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'error' })
        });
        const data = await res.json();
        alertRegion.textContent = `Alert: ${data.message}`;
      } catch (err) {
        alertRegion.textContent = 'Alert: Request failed.';
      }
      if (politeRegion) politeRegion.textContent = '';
      if (silentRegion) silentRegion.textContent = '';
    });
  }

  if (s3DefectBtn && silentRegion) {
    s3DefectBtn.addEventListener('click', () => {
      // Injects message into unannounced div without live region
      silentRegion.textContent = 'Defective Notification: Information saved without screen reader announcement.';
      if (politeRegion) politeRegion.textContent = '';
      if (alertRegion) alertRegion.textContent = '';
    });
  }

  // 5. Scenario S4: Disclosure Widget
  const disclosureBtn = document.getElementById('s4-disclosure-btn');
  const disclosurePanel = document.getElementById('s4-disclosure-panel');
  if (disclosureBtn && disclosurePanel) {
    disclosureBtn.addEventListener('click', () => {
      const isExpanded = disclosureBtn.getAttribute('aria-expanded') === 'true';
      disclosureBtn.setAttribute('aria-expanded', String(!isExpanded));
      disclosurePanel.hidden = isExpanded;
    });
  }

  // 6. Scenario S4: Tablist Widget
  const tabs = document.querySelectorAll('[role="tab"]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab, tabs));
    tab.addEventListener('keydown', (e) => {
      const tabList = Array.from(tabs);
      const index = tabList.indexOf(tab);

      if (e.key === 'ArrowRight') {
        const next = tabList[(index + 1) % tabList.length];
        next.focus();
        activateTab(next, tabs);
      } else if (e.key === 'ArrowLeft') {
        const prev = tabList[(index - 1 + tabList.length) % tabList.length];
        prev.focus();
        activateTab(prev, tabs);
      } else if (e.key === 'Home') {
        tabList[0].focus();
        activateTab(tabList[0], tabs);
      } else if (e.key === 'End') {
        tabList[tabList.length - 1].focus();
        activateTab(tabList[tabList.length - 1], tabs);
      }
    });
  });

  function activateTab(activeTab, allTabs) {
    allTabs.forEach(tab => {
      const isTarget = tab === activeTab;
      tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
      tab.setAttribute('tabindex', isTarget ? '0' : '-1');
      tab.classList.toggle('active', isTarget);

      const panelId = tab.getAttribute('aria-controls');
      const panel = document.getElementById(panelId);
      if (panel) {
        panel.hidden = !isTarget;
      }
    });
  }
}

// Global modal helpers for test fixtures in test-bed
window.__openCompliantModal = function(modalId, triggerElement) {
  lastActiveElementBeforeModal = triggerElement || document.activeElement;
  const m = document.getElementById(modalId);
  if (m) {
    m.style.display = 'block';
    const firstFocusable = m.querySelector('button, [href], input');
    if (firstFocusable) firstFocusable.focus();
  }
};

window.__closeCompliantModal = function(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.style.display = 'none';
    if (lastActiveElementBeforeModal && typeof lastActiveElementBeforeModal.focus === 'function') {
      lastActiveElementBeforeModal.focus();
    }
  }
};

// Bind on initial page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindInteractiveWidgets);
} else {
  bindInteractiveWidgets();
}

// Re-bind when SPA route changes
window.addEventListener('a11y:route-changed', bindInteractiveWidgets);
