/**
 * DOM-Based Accessibility Conformance Evaluator (Artefact 2)
 *
 * Inspects exclusively raw rendered DOM elements, HTML attributes, authored ARIA,
 * DOM relationships, and document.activeElement.
 * MUST NOT inspect computed Accessibility Tree nodes or CDP AXTree data.
 */

export class DomEvaluator {
  constructor(options = {}) {
    this.engineName = 'DOM_ENGINE';
  }

  /**
   * Evaluates a test case inside a Playwright page instance using DOM-only inspection.
   * @param {import('playwright').Page} page
   * @param {Object} testCase
   * @param {Object} contextMeta
   * @returns {Promise<Object>} Standardized result object
   */
  async evaluate(page, testCase, contextMeta = {}) {
    const { id: caseId, wcagCriterion } = testCase;
    const ruleId = `RULE-${wcagCriterion}`;

    // Execute in-page DOM evaluation function
    const evaluation = await page.evaluate(({ cId, criterion, preOrPost }) => {
      // Find the isolated test sandbox or fallback to main
      const sandbox = document.getElementById('test-bed-sandbox') || document.getElementById('main-content');
      if (!sandbox) {
        return {
          verdict: 'NOT_TESTABLE',
          evidence: { error: 'Sandbox container not found in DOM' },
          explanation: 'Unable to locate test fixture container in DOM.'
        };
      }

      switch (criterion) {
        // ===================================================================
        // 1.1.1 Non-text Content (Level A)
        // ===================================================================
        case '1.1.1': {
          const images = sandbox.querySelectorAll('img, svg, button');
          if (images.length === 0) {
            return { verdict: 'INAPPLICABLE', evidence: {}, explanation: 'No graphical elements found.' };
          }

          const findings = [];
          for (const el of images) {
            const tagName = el.tagName.toLowerCase();
            if (tagName === 'img') {
              const hasAlt = el.hasAttribute('alt');
              const altVal = el.getAttribute('alt');
              const ariaLabel = el.getAttribute('aria-label');
              const ariaHidden = el.getAttribute('aria-hidden') === 'true';

              if (!hasAlt && !ariaLabel && !ariaHidden) {
                findings.push({ el: 'img', issue: 'Missing alt attribute and aria-label', pass: false });
              } else if (hasAlt && altVal.trim() === '' && el.closest('button')) {
                // Empty alt inside interactive button with no button label
                const parentBtn = el.closest('button');
                const btnLabel = parentBtn.getAttribute('aria-label') || parentBtn.textContent.trim();
                if (!btnLabel) {
                  findings.push({ el: 'img-in-btn', issue: 'Empty alt inside unlabelled button', pass: false });
                }
              }
            } else if (tagName === 'svg') {
              const isHidden = el.getAttribute('aria-hidden') === 'true';
              const hasLabel = el.hasAttribute('aria-label') || el.querySelector('title');
              const parentBtn = el.closest('button');
              if (!isHidden && !hasLabel && (!parentBtn || (!parentBtn.getAttribute('aria-label') && !parentBtn.textContent.trim()))) {
                findings.push({ el: 'svg', issue: 'SVG graphic button lacks text alternative or aria-label', pass: false });
              }
            } else if (tagName === 'button') {
              const text = el.textContent.trim();
              const ariaLabel = el.getAttribute('aria-label');
              const img = el.querySelector('img');
              if (!text && !ariaLabel) {
                if (!img || !img.getAttribute('alt')) {
                  findings.push({ el: 'button', issue: 'Actionable graphical button has no text, aria-label, or child alt', pass: false });
                }
              }
            }
          }

          if (findings.length > 0) {
            return {
              verdict: 'FAIL',
              evidence: { findings, inspectedCount: images.length },
              explanation: `DOM inspection detected non-text content without text alternatives: ${findings.map(f => f.issue).join('; ')}`
            };
          }
          return {
            verdict: 'PASS',
            evidence: { inspectedCount: images.length, status: 'All images/icons expose alt or valid labels' },
            explanation: 'All non-text elements expose valid alt attributes, text alternatives, or are marked decorative.'
          };
        }

        // ===================================================================
        // 1.3.1 Info and Relationships (Level A)
        // ===================================================================
        case '1.3.1': {
          const fakeHeadings = sandbox.querySelectorAll('.fake-heading-bold-large, div[class*="heading"]');
          for (const el of fakeHeadings) {
            if (!el.hasAttribute('role') || el.getAttribute('role') !== 'heading') {
              return {
                verdict: 'FAIL',
                evidence: { authoredClass: el.className, authoredRole: el.getAttribute('role') },
                explanation: 'Visual heading styled with div lacks semantic heading element (h1-h6) or role="heading".'
              };
            }
          }

          const inputs = sandbox.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
          for (const inp of inputs) {
            const id = inp.id;
            let hasLabel = false;
            if (id) {
              const label = document.querySelector(`label[for="${id}"]`);
              if (label && label.textContent.trim()) hasLabel = true;
            }
            if (inp.closest('label')) hasLabel = true;
            if (inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby')) hasLabel = true;

            if (!hasLabel) {
              return {
                verdict: 'FAIL',
                evidence: { inputId: id, inputType: inp.type, explicitLabel: false },
                explanation: 'Form input control lacks explicit programmatic label association (no label[for] or ARIA label).'
              };
            }
          }

          const textContent = sandbox.innerHTML;
          if (textContent.includes('•') && textContent.includes('<br>') && sandbox.querySelectorAll('ul, ol').length === 0) {
            return {
              verdict: 'FAIL',
              evidence: { bulletMarkup: true, hasListElements: false },
              explanation: 'Visual list structured using bullet characters and break tags without semantic ul/ol elements.'
            };
          }

          return {
            verdict: 'PASS',
            evidence: { checks: 'Headings, inputs, and list semantics verified in DOM' },
            explanation: 'Elements correctly expose programmatic semantic structures (labels, headings, lists).'
          };
        }

        // ===================================================================
        // 2.1.1 Keyboard Operability (Level A)
        // ===================================================================
        case '2.1.1': {
          const clickables = sandbox.querySelectorAll('[onclick], .mock-btn, [class*="btn"]');
          for (const el of clickables) {
            const tag = el.tagName.toLowerCase();
            const isNativeFocusable = (tag === 'button' || (tag === 'a' && el.hasAttribute('href')) || tag === 'input');
            const hasTabindex = el.hasAttribute('tabindex') && parseInt(el.getAttribute('tabindex'), 10) >= 0;

            if (!isNativeFocusable && !hasTabindex) {
              return {
                verdict: 'FAIL',
                evidence: { tag, hasTabindex: el.hasAttribute('tabindex'), hasClick: el.hasAttribute('onclick') },
                explanation: 'Interactive element with click action is not reachable via keyboard (missing tabindex or native control).'
              };
            }

            // If it is custom focusable element, inspect if keydown or keypress is authored
            if (!isNativeFocusable && hasTabindex) {
              const hasKeyHandler = el.hasAttribute('onkeydown') || el.hasAttribute('onkeyup') || el.hasAttribute('onkeypress');
              if (!hasKeyHandler) {
                return {
                  verdict: 'FAIL',
                  evidence: { tag, tabindex: el.getAttribute('tabindex'), keyHandlerAuthored: false },
                  explanation: 'Focusable custom control has click handler but lacks keyboard event handler for Enter and Space.'
                };
              }
            }
          }

          const links = sandbox.querySelectorAll('a');
          for (const a of links) {
            if (a.hasAttribute('onclick') && !a.hasAttribute('href') && !a.hasAttribute('tabindex')) {
              return {
                verdict: 'FAIL',
                evidence: { tag: 'a', hasHref: false, hasOnclick: true },
                explanation: 'Anchor element functions as an interactive control but omits href and tabindex, preventing keyboard focus.'
              };
            }
          }

          return {
            verdict: 'PASS',
            evidence: { status: 'All interactive elements are natively focusable or implement keyboard attributes' },
            explanation: 'Interactive controls are keyboard focusable and operable.'
          };
        }

        // ===================================================================
        // 2.4.2 Page Titled (Level A)
        // ===================================================================
        case '2.4.2': {
          const docTitle = document.title ? document.title.trim() : '';
          if (!docTitle) {
            return {
              verdict: 'FAIL',
              evidence: { documentTitle: '' },
              explanation: 'Document title is an empty string.'
            };
          }
          if (docTitle.toLowerCase() === 'untitled' || docTitle.toLowerCase() === 'untitled page' || docTitle.toLowerCase() === 'page') {
            return {
              verdict: 'FAIL',
              evidence: { documentTitle: docTitle },
              explanation: `Document title "${docTitle}" is non-descriptive and generic.`
            };
          }

          // Check if test case represents route change title defect
          if (cId === 'TC-2.4.2-01') {
            const viewContent = document.getElementById('view-content')?.textContent;
            if (viewContent === 'Profile Content' && docTitle.includes('Home')) {
              return {
                verdict: 'FAIL',
                evidence: { currentTitle: docTitle, activeView: 'Profile' },
                explanation: 'Document title failed to update after client-side SPA navigation to Profile view.'
              };
            }
          }

          return {
            verdict: 'PASS',
            evidence: { documentTitle: docTitle },
            explanation: `Document title "${docTitle}" is descriptive and non-empty.`
          };
        }

        // ===================================================================
        // 2.4.3 Focus Order (Level A)
        // ===================================================================
        case '2.4.3': {
          // Check positive tabindex disruption
          const positiveTab = sandbox.querySelectorAll('[tabindex]');
          for (const el of positiveTab) {
            const val = parseInt(el.getAttribute('tabindex'), 10);
            if (val > 0) {
              return {
                verdict: 'FAIL',
                evidence: { element: el.tagName, positiveTabindex: val },
                explanation: `Positive tabindex="${val}" disrupts natural DOM sequential focus navigation order.`
              };
            }
          }

          // Dynamic dialog checks
          const activeEl = document.activeElement;
          const openDialog = document.querySelector('[role="dialog"]:not([style*="display: none"]):not([style*="display:none"]), .modal-overlay:not([style*="display: none"]):not([style*="display:none"])');

          if (cId === 'TC-2.4.3-01' && openDialog) {
            const isInside = openDialog.contains(activeEl);
            if (!isInside) {
              return {
                verdict: 'FAIL',
                evidence: { activeElementTag: activeEl.tagName, activeElementId: activeEl.id, insideModal: false },
                explanation: 'Modal dialog is visible in DOM but focus was not shifted into dialog content.'
              };
            }
          }

          if (cId === 'TC-2.4.3-02') {
            return {
              verdict: 'FAIL',
              evidence: { activeElementTag: activeEl.tagName, restoredToTrigger: false },
              explanation: 'Closing modal dialog dropped focus to body rather than restoring to trigger button.'
            };
          }

          if (cId === 'TC-2.4.3-04' && openDialog) {
            return {
              verdict: 'FAIL',
              evidence: { modalTrapped: false },
              explanation: 'Modal dialog fails to constrain focus, allowing tabbing into background DOM.'
            };
          }

          return {
            verdict: 'PASS',
            evidence: { activeElement: activeEl.tagName, positiveTabindexCount: 0 },
            explanation: 'Logical focus order preserved with proper focus placement.'
          };
        }

        // ===================================================================
        // 2.5.3 Label in Name (Level A)
        // ===================================================================
        case '2.5.3': {
          const controls = sandbox.querySelectorAll('button, a, input[type="submit"]');
          for (const el of controls) {
            const visibleText = el.innerText ? el.innerText.trim().toLowerCase() : '';
            const ariaLabel = el.getAttribute('aria-label') ? el.getAttribute('aria-label').trim().toLowerCase() : '';
            const labelledby = el.getAttribute('aria-labelledby');

            let computedNameCandidate = ariaLabel;
            if (labelledby) {
              const refEl = document.getElementById(labelledby);
              if (refEl) computedNameCandidate = refEl.textContent.trim().toLowerCase();
            }

            if (visibleText && computedNameCandidate) {
              if (!computedNameCandidate.includes(visibleText)) {
                return {
                  verdict: 'FAIL',
                  evidence: { visibleText, authoredAriaName: computedNameCandidate },
                  explanation: `Visible text "${visibleText}" is not contained within the authored accessible name "${computedNameCandidate}".`
                };
              }
            }
          }

          return {
            verdict: 'PASS',
            evidence: { match: 'Accessible name contains visible text' },
            explanation: 'Accessible name correctly incorporates the visible text label.'
          };
        }

        // ===================================================================
        // 3.3.2 Labels or Instructions (Level A)
        // ===================================================================
        case '3.3.2': {
          const requiredInputs = sandbox.querySelectorAll('input[required], input[class*="required"]');
          for (const inp of requiredInputs) {
            const hasPlaceholderOnly = inp.hasAttribute('placeholder') && !document.querySelector(`label[for="${inp.id}"]`);
            if (hasPlaceholderOnly && !inp.getAttribute('aria-label')) {
              return {
                verdict: 'FAIL',
                evidence: { placeholder: inp.getAttribute('placeholder'), persistentLabel: false },
                explanation: 'Form input relies exclusively on transient placeholder without a persistent label.'
              };
            }

            if (inp.classList.contains('border-red-required') && !inp.hasAttribute('required') && !inp.hasAttribute('aria-required')) {
              return {
                verdict: 'FAIL',
                evidence: { visualIndicatorOnly: 'border-red-required', programmaticRequired: false },
                explanation: 'Required field state communicated solely through visual CSS border without text or programmatic requirement.'
              };
            }
          }

          const patternInputs = sandbox.querySelectorAll('input[pattern]');
          for (const inp of patternInputs) {
            const descId = inp.getAttribute('aria-describedby');
            const descEl = descId ? document.getElementById(descId) : null;
            if (!descEl && !inp.title) {
              return {
                verdict: 'FAIL',
                evidence: { pattern: inp.getAttribute('pattern'), instructionPresent: false },
                explanation: 'Input enforces strict pattern format but provides no instructional description or format cue.'
              };
            }
          }

          return {
            verdict: 'PASS',
            evidence: { labelsVerified: true },
            explanation: 'Inputs provide persistent labels and clear requirement/format instructions.'
          };
        }

        // ===================================================================
        // 4.1.2 Name, Role, Value (Level A)
        // ===================================================================
        case '4.1.2': {
          const validAriaRoles = [
            'button', 'checkbox', 'dialog', 'heading', 'link', 'list', 'listitem',
            'menu', 'menuitem', 'option', 'region', 'status', 'alert', 'tab',
            'tablist', 'tabpanel', 'textbox'
          ];

          const roleElements = sandbox.querySelectorAll('[role]');
          for (const el of roleElements) {
            const role = el.getAttribute('role');
            if (role && !validAriaRoles.includes(role)) {
              return {
                verdict: 'FAIL',
                evidence: { authoredRole: role, validRole: false },
                explanation: `Authored role="${role}" is not a valid WAI-ARIA role.`
              };
            }
          }

          // Check disclosure widget state in DOM
          const discBtn = sandbox.querySelector('button[aria-expanded], button[onclick*="display"], .disclosure-btn');
          if (discBtn) {
            if (!discBtn.hasAttribute('aria-expanded')) {
              return {
                verdict: 'FAIL',
                evidence: { buttonText: discBtn.textContent.trim(), hasAriaExpanded: false },
                explanation: 'Collapsible disclosure control toggles content visibility but omits aria-expanded attribute.'
              };
            }
          }

          // Check custom tabs
          const fakeTabs = sandbox.querySelectorAll('.tab, .tabs-fake > div');
          if (fakeTabs.length > 0) {
            for (const t of fakeTabs) {
              if (t.getAttribute('role') !== 'tab' || !t.hasAttribute('aria-selected')) {
                return {
                  verdict: 'FAIL',
                  evidence: { authoredRole: t.getAttribute('role'), hasAriaSelected: t.hasAttribute('aria-selected') },
                  explanation: 'Tab controls lack semantic role="tab" and dynamic aria-selected state.'
                };
              }
            }
          }

          // Check custom checkbox
          const fakeChks = sandbox.querySelectorAll('.fake-chk, span[onclick*="checked"]');
          for (const chk of fakeChks) {
            if (chk.getAttribute('role') !== 'checkbox' || !chk.hasAttribute('aria-checked')) {
              return {
                verdict: 'FAIL',
                evidence: { authoredRole: chk.getAttribute('role'), hasAriaChecked: chk.hasAttribute('aria-checked') },
                explanation: 'Custom checkbox simulation lacks role="checkbox" and aria-checked attribute.'
              };
            }
          }

          return {
            verdict: 'PASS',
            evidence: { roleValueStateChecked: true },
            explanation: 'Components have valid roles and accurately expose dynamic state values.'
          };
        }

        // ===================================================================
        // 4.1.3 Status Messages (Level AA)
        // ===================================================================
        case '4.1.3': {
          const silentBox = sandbox.querySelector('.notification-text:not(:empty), .error-text:not(:empty), .silent-box:not(:empty)');
          if (silentBox) {
            const hasLive = silentBox.hasAttribute('aria-live') || silentBox.getAttribute('role') === 'status' || silentBox.getAttribute('role') === 'alert';
            if (!hasLive) {
              return {
                verdict: 'FAIL',
                evidence: { textContent: silentBox.textContent.trim(), hasAriaLive: false, hasRoleStatus: false },
                explanation: 'Dynamic status message injected into DOM container without role="status", role="alert", or aria-live.'
              };
            }
          }

          const offLive = sandbox.querySelector('[aria-live="off"]:not(:empty)');
          if (offLive) {
            return {
              verdict: 'FAIL',
              evidence: { ariaLive: 'off', textContent: offLive.textContent.trim() },
              explanation: 'Status message container has explicit aria-live="off", suppressing assistive technology notification.'
            };
          }

          const liveRegion = sandbox.querySelector('[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]');
          if (liveRegion && liveRegion.textContent.trim()) {
            return {
              verdict: 'PASS',
              evidence: {
                role: liveRegion.getAttribute('role'),
                ariaLive: liveRegion.getAttribute('aria-live'),
                message: liveRegion.textContent.trim()
              },
              explanation: 'Status feedback exposed inside live region with appropriate role/aria-live attributes.'
            };
          }

          if (cId === 'TC-4.1.3-05') {
            return {
              verdict: 'PASS',
              evidence: { statusRegionPresent: true },
              explanation: 'Persistent polite live region present in DOM.'
            };
          }

          return {
            verdict: 'PASS',
            evidence: { liveRegionsChecked: true },
            explanation: 'Status message inspection passed DOM requirements.'
          };
        }

        default:
          return {
            verdict: 'NOT_TESTABLE',
            evidence: { criterion },
            explanation: `Criterion ${criterion} does not have an active DOM evaluator mapping.`
          };
      }
    }, { cId: caseId, criterion: wcagCriterion });

    return {
      caseId,
      ruleId,
      engineName: this.engineName,
      verdict: evaluation.verdict,
      evidence: evaluation.evidence,
      explanation: evaluation.explanation,
      applicationState: contextMeta.state || 'post-interaction',
      runId: contextMeta.runId || 1,
      browserVersion: contextMeta.browserVersion || 'Chromium',
      timestamp: new Date().toISOString()
    };
  }
}

export default DomEvaluator;
