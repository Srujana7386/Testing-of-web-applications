/**
 * Client-Side SPA Router
 * Implements HTML5 History API, Fetch-based partial view hydration,
 * focus management, dynamic document title updates, and deterministic state indicators.
 */

export class SPARouter {
  constructor(options = {}) {
    this.mainContainerId = options.mainContainerId || 'main-content';
    this.activeLinksSelector = options.activeLinksSelector || '.nav-link';
    this.isNavigating = false;

    this.init();
  }

  init() {
    // Intercept clicks on links intended for SPA routing
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      // Only intercept internal same-origin relative links that are not downloads or anchors
      if (href && href.startsWith('/') && !href.startsWith('//') && !link.hasAttribute('download') && link.target !== '_blank') {
        e.preventDefault();
        this.navigate(href);
      }
    });

    // Handle browser back and forward actions
    window.addEventListener('popstate', (e) => {
      this.loadRoute(window.location.pathname, false);
    });

    // Mark initial state
    document.body.setAttribute('data-app-state', 'ready');
    console.log('[SPARouter] Router initialized. State: ready');
  }

  async navigate(path) {
    if (this.isNavigating || path === window.location.pathname) return;
    window.history.pushState({ path }, '', path);
    await this.loadRoute(path, true);
  }

  async loadRoute(path, updateHistory = false) {
    this.isNavigating = true;
    document.body.setAttribute('data-app-state', 'loading');

    const container = document.getElementById(this.mainContainerId);
    if (!container) {
      console.error(`[SPARouter] Container #${this.mainContainerId} not found.`);
      this.isNavigating = false;
      return;
    }

    try {
      console.log(`[SPARouter] Fetching partial view for path: ${path}...`);
      const response = await fetch(`${path}${path.includes('?') ? '&' : '?'}format=fragment`, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'text/html'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load view fragment: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      container.innerHTML = html;

      // Extract and update document title if a heading or title exists in fragment
      const h2 = container.querySelector('h2');
      if (h2 && h2.textContent.trim()) {
        document.title = `${h2.textContent.trim()} | WCAG 2.2 Conformance Test Bed`;
      } else {
        document.title = 'WCAG 2.2 Level AA Conformance Testing Test Bed';
      }

      // Update active navigation link styles
      this.updateActiveNav(path);

      // Focus management for WCAG 2.4.3: move focus to main container
      container.focus();

      // Dispatch route-changed event for widget re-initialization and Playwright automation
      window.dispatchEvent(new CustomEvent('a11y:route-changed', {
        detail: { path, title: document.title, timestamp: Date.now() }
      }));

      console.log(`[SPARouter] Navigated to ${path}. Title updated to "${document.title}".`);
    } catch (err) {
      console.error('[SPARouter] Navigation error:', err);
      container.innerHTML = `<div class="card" style="padding:2rem;"><p style="color:var(--danger-color)">Error loading route: ${err.message}</p></div>`;
    } finally {
      this.isNavigating = false;
      document.body.setAttribute('data-app-state', 'ready');
    }
  }

  updateActiveNav(path) {
    const navLinks = document.querySelectorAll(this.activeLinksSelector);
    navLinks.forEach(link => {
      const linkHref = link.getAttribute('href');
      if (linkHref === path || (path.startsWith('/test/') && linkHref === '/register')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }
}

export default SPARouter;
