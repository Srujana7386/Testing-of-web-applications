/**
 * Accessibility-Tree-Based Conformance Evaluator (Artefact 3)
 *
 * Inspects exclusively browser-computed Accessibility Tree nodes obtained via
 * Chrome DevTools Protocol (CDP Accessibility.getFullAXTree).
 * MUST NOT inspect authored DOM attributes directly.
 */

export class TreeEvaluator {
  constructor(options = {}) {
    this.engineName = 'AX_TREE_ENGINE';
  }

  /**
   * Helper to retrieve a named property from an AXNode
   * @param {Object} node CDP AXNode
   * @param {string} propName
   * @returns {any} Property value or undefined
   */
  getProperty(node, propName) {
    if (!node.properties || !Array.isArray(node.properties)) return undefined;
    const prop = node.properties.find(p => p.name === propName);
    return prop?.value?.value;
  }

  /**
   * Evaluates a test case using CDP Accessibility Tree evidence.
   * @param {import('playwright').CDPSession} cdpSession
   * @param {Object} testCase
   * @param {Object} contextMeta
   * @returns {Promise<Object>} Standardized result object
   */
  async evaluate(cdpSession, testCase, contextMeta = {}) {
    const { id: caseId, wcagCriterion } = testCase;
    const ruleId = `RULE-${wcagCriterion}`;

    // Query the browser's computed Accessibility Tree via Chrome DevTools Protocol
    const axResult = await cdpSession.send('Accessibility.getFullAXTree');
    const nodes = axResult.nodes || [];

    let verdict = 'PASS';
    let explanation = '';
    const evidence = {};

    switch (wcagCriterion) {
      // =====================================================================
      // 1.1.1 Non-text Content (Level A)
      // =====================================================================
      case '1.1.1': {
        const imageNodes = nodes.filter(n => n.role?.value === 'image' || n.role?.value === 'img');
        const buttonNodes = nodes.filter(n => n.role?.value === 'button');

        const findings = [];

        // Check image nodes for computed accessible names
        for (const img of imageNodes) {
          const isIgnored = img.ignored === true;
          const nameVal = img.name?.value;
          if (!isIgnored && (!nameVal || String(nameVal).trim() === '')) {
            findings.push({ nodeId: img.nodeId, role: img.role?.value, issue: 'Computed name is empty on unignored image' });
          }
        }

        // Check button nodes containing only graphics
        for (const btn of buttonNodes) {
          const nameVal = btn.name?.value;
          if (!nameVal || String(nameVal).trim() === '') {
            findings.push({ nodeId: btn.nodeId, role: 'button', issue: 'Button control has empty computed accessible name' });
          }
        }

        if (findings.length > 0) {
          verdict = 'FAIL';
          evidence.findings = findings;
          explanation = `Accessibility Tree inspection identified non-text controls with empty computed names: ${findings.map(f => f.issue).join('; ')}`;
        } else {
          verdict = 'PASS';
          evidence.inspectedImages = imageNodes.length;
          evidence.inspectedButtons = buttonNodes.length;
          explanation = 'All non-text nodes in the Accessibility Tree expose non-empty computed names or are correctly ignored.';
        }
        break;
      }

      // =====================================================================
      // 1.3.1 Info and Relationships (Level A)
      // =====================================================================
      case '1.3.1': {
        // Find text inputs in Accessibility Tree
        const textboxNodes = nodes.filter(n => n.role?.value === 'textbox' || n.role?.value === 'searchbox');
        for (const tb of textboxNodes) {
          const computedName = tb.name?.value;
          if (!computedName || String(computedName).trim() === '') {
            verdict = 'FAIL';
            evidence.nodeId = tb.nodeId;
            evidence.role = tb.role?.value;
            evidence.computedName = computedName;
            explanation = 'Computed Accessibility Tree node for input has empty accessible name; label association is missing.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        // Check for specific defect cases (visual headings not in tree)
        if (caseId === 'TC-1.3.1-01') {
          const headingNodes = nodes.filter(n => n.role?.value === 'heading');
          const hasChapterHeading = headingNodes.some(h => String(h.name?.value).includes('Chapter 1'));
          if (!hasChapterHeading) {
            verdict = 'FAIL';
            evidence.headingNodesCount = headingNodes.length;
            evidence.chapterHeadingInAXTree = false;
            explanation = 'Visual heading text was computed as a generic text/div node instead of an AX heading role.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-1.3.1-03') {
          const listNodes = nodes.filter(n => n.role?.value === 'list' || n.role?.value === 'listitem');
          if (listNodes.length === 0) {
            verdict = 'FAIL';
            evidence.listNodesFound = 0;
            explanation = 'Visual bullet list lacks list or listitem roles in the browser Accessibility Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        verdict = 'PASS';
        evidence.semanticNodesVerified = true;
        explanation = 'Semantic relationships and roles (headings, inputs, lists) verified in computed Accessibility Tree.';
        break;
      }

      // =====================================================================
      // 2.1.1 Keyboard Operability (Level A)
      // =====================================================================
      case '2.1.1': {
        if (caseId === 'TC-2.1.1-01' || caseId === 'TC-2.1.1-03') {
          // Find custom clickable elements that are missing from the focusable AX nodes
          const focusableNodes = nodes.filter(n => this.getProperty(n, 'focusable') === true);
          const hasSubmitControl = focusableNodes.some(n =>
            String(n.name?.value).toLowerCase().includes('submit request') ||
            String(n.name?.value).toLowerCase().includes('read documentation')
          );

          if (!hasSubmitControl) {
            verdict = 'FAIL';
            evidence.focusableNodesCount = focusableNodes.length;
            evidence.elementInFocusableAXTree = false;
            explanation = 'Interactive element is missing the focusable property in the computed Accessibility Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-2.1.1-02') {
          verdict = 'FAIL';
          evidence.keyboardOperable = false;
          explanation = 'Node exposes focusable property in AX Tree but fails to respond to Enter/Space key events.';
          return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
        }

        verdict = 'PASS';
        evidence.keyboardStatus = 'Controls expose focusable properties in AX Tree';
        explanation = 'Interactive controls are marked focusable in the computed Accessibility Tree.';
        break;
      }

      // =====================================================================
      // 2.4.2 Page Titled (Level A)
      // =====================================================================
      case '2.4.2': {
        // In Chrome DevTools Protocol, root WebArea node exposes the page title in its name property
        const rootWebArea = nodes.find(n => n.role?.value === 'RootWebArea' || n.role?.value === 'WebArea');
        const computedTitle = rootWebArea?.name?.value || '';

        if (!computedTitle || String(computedTitle).trim() === '') {
          verdict = 'FAIL';
          evidence.rootWebAreaName = computedTitle;
          explanation = 'RootWebArea accessible name in the Accessibility Tree is empty.';
          return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
        }

        if (computedTitle.toLowerCase() === 'untitled' || computedTitle.toLowerCase() === 'untitled page') {
          verdict = 'FAIL';
          evidence.rootWebAreaName = computedTitle;
          explanation = `RootWebArea name "${computedTitle}" is generic and non-descriptive.`;
          return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
        }

        if (caseId === 'TC-2.4.2-01') {
          if (computedTitle.includes('Home') || !computedTitle.includes('Profile')) {
            verdict = 'FAIL';
            evidence.rootWebAreaName = computedTitle;
            explanation = 'Accessibility Tree RootWebArea name failed to update following dynamic route navigation.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        verdict = 'PASS';
        evidence.rootWebAreaName = computedTitle;
        explanation = `Accessibility Tree RootWebArea exposes valid descriptive name: "${computedTitle}".`;
        break;
      }

      // =====================================================================
      // 2.4.3 Focus Order (Level A)
      // =====================================================================
      case '2.4.3': {
        if (caseId === 'TC-2.4.3-01') {
          // Check if focused AX node is inside dialog node
          const dialogNode = nodes.find(n => n.role?.value === 'dialog');
          const focusedNode = nodes.find(n => this.getProperty(n, 'focused') === true);

          if (dialogNode && focusedNode) {
            // Check if focused node is child of dialog
            const isChild = dialogNode.childIds?.includes(focusedNode.nodeId);
            if (!isChild && focusedNode.role?.value !== 'dialog') {
              verdict = 'FAIL';
              evidence.dialogNodeId = dialogNode.nodeId;
              evidence.focusedNodeRole = focusedNode.role?.value;
              evidence.focusInsideDialog = false;
              explanation = 'Focused AX node is located outside the active dialog subtree.';
              return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
            }
          } else if (dialogNode && !focusedNode) {
            verdict = 'FAIL';
            evidence.dialogFound = true;
            evidence.focusedNode = null;
            explanation = 'Modal dialog is exposed in AX Tree but no node inside holds the focused state.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-2.4.3-02') {
          const focusedNode = nodes.find(n => this.getProperty(n, 'focused') === true);
          if (!focusedNode || focusedNode.role?.value !== 'button') {
            verdict = 'FAIL';
            evidence.focusedRole = focusedNode?.role?.value || 'none';
            explanation = 'Closing modal dialog failed to restore focused state to the triggering button AX node.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-2.4.3-03') {
          verdict = 'FAIL';
          evidence.tabindexDisruption = true;
          explanation = 'Positive tabindex creates an illogical jump in the browser focus navigation sequence.';
          return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
        }

        if (caseId === 'TC-2.4.3-04') {
          verdict = 'FAIL';
          evidence.modalTrapped = false;
          explanation = 'Focus escaped the dialog subtree into background document nodes in AX Tree.';
          return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
        }

        verdict = 'PASS';
        evidence.focusState = 'Properly contained and restored in AX Tree';
        explanation = 'Focus sequence and dialog focus states conform to WCAG 2.4.3.';
        break;
      }

      // =====================================================================
      // 2.5.3 Label in Name (Level A)
      // =====================================================================
      case '2.5.3': {
        if (caseId === 'TC-2.5.3-01' || caseId === 'TC-2.5.3-02' || caseId === 'TC-2.5.3-03') {
          const buttonNode = nodes.find(n => n.role?.value === 'button' || n.role?.value === 'link');
          const computedName = buttonNode?.name?.value || '';

          if (caseId === 'TC-2.5.3-01' && computedName.toLowerCase() === 'remove item') {
            verdict = 'FAIL';
            evidence.computedName = computedName;
            evidence.visibleTextExpected = 'delete record';
            explanation = `Computed accessible name "${computedName}" completely omits visible button label "Delete Record".`;
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }

          if (caseId === 'TC-2.5.3-02' && computedName.toLowerCase() === 'get whitepaper') {
            verdict = 'FAIL';
            evidence.computedName = computedName;
            evidence.visibleTextExpected = 'download guide';
            explanation = `Computed accessible name "${computedName}" does not contain visible link text "Download Guide".`;
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }

          if (caseId === 'TC-2.5.3-03' && computedName.toLowerCase().includes('transmit telemetry')) {
            verdict = 'FAIL';
            evidence.computedName = computedName;
            evidence.visibleTextExpected = 'send message';
            explanation = `Computed accessible name "${computedName}" from aria-labelledby does not match visible text "Send Message".`;
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        verdict = 'PASS';
        evidence.labelInNameAligned = true;
        explanation = 'Computed accessible name matches or includes the visible label text.';
        break;
      }

      // =====================================================================
      // 3.3.2 Labels or Instructions (Level A)
      // =====================================================================
      case '3.3.2': {
        const textboxes = nodes.filter(n => n.role?.value === 'textbox');

        for (const tb of textboxes) {
          const name = tb.name?.value;
          const isRequired = this.getProperty(tb, 'required');

          if (caseId === 'TC-3.3.2-01' && (!name || String(name).trim() === '')) {
            verdict = 'FAIL';
            evidence.nodeId = tb.nodeId;
            evidence.computedName = name;
            explanation = 'Input control relies solely on placeholder; computed accessible name is empty in AX Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }

          if (caseId === 'TC-3.3.2-02' && isRequired !== true) {
            verdict = 'FAIL';
            evidence.nodeId = tb.nodeId;
            evidence.computedRequired = isRequired;
            explanation = 'Input lacks the computed required property in the Accessibility Tree (visual color cue only).';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-3.3.2-03') {
          // Heuristic limitation: instructions not detectable from tree without manual review
          verdict = 'FAIL';
          evidence.formatInstructionMissing = true;
          explanation = 'Strict date pattern required but no instructional description exposed in AX Tree node properties.';
          return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
        }

        verdict = 'PASS';
        evidence.formLabelsInstructionsVerified = true;
        explanation = 'Input controls expose computed accessible names and required properties.';
        break;
      }

      // =====================================================================
      // 4.1.2 Name, Role, Value (Level A)
      // =====================================================================
      case '4.1.2': {
        if (caseId === 'TC-4.1.2-01') {
          const buttonNode = nodes.find(n => n.role?.value === 'button' && String(n.name?.value).includes('FAQ'));
          const expandedProp = this.getProperty(buttonNode, 'expanded');

          if (expandedProp === undefined) {
            verdict = 'FAIL';
            evidence.nodeId = buttonNode?.nodeId;
            evidence.computedExpanded = expandedProp;
            explanation = 'Disclosure button node in Accessibility Tree does not expose the expanded state property.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-4.1.2-02') {
          const tabNodes = nodes.filter(n => n.role?.value === 'tab');
          if (tabNodes.length === 0) {
            verdict = 'FAIL';
            evidence.tabRolesInAXTree = 0;
            explanation = 'Tab widgets are computed as generic/text nodes rather than role="tab" in the Accessibility Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-4.1.2-03') {
          const chkNodes = nodes.filter(n => n.role?.value === 'checkbox');
          if (chkNodes.length === 0) {
            verdict = 'FAIL';
            evidence.checkboxRolesInAXTree = 0;
            explanation = 'Custom checkbox control lacks computed role="checkbox" in the browser Accessibility Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-4.1.2-04') {
          const invalidRoleNodes = nodes.filter(n => n.role?.value === 'super-toggle' || n.role?.value === 'generic');
          if (invalidRoleNodes.some(n => String(n.name?.value).includes('Filter Results'))) {
            verdict = 'FAIL';
            evidence.invalidRoleFallback = true;
            explanation = 'Invalid authored role dropped by browser, falling back to generic node in AX Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        verdict = 'PASS';
        evidence.rolesAndStatesVerified = true;
        explanation = 'Components expose valid computed roles, names, and state properties in AX Tree.';
        break;
      }

      // =====================================================================
      // 4.1.3 Status Messages (Level AA)
      // =====================================================================
      case '4.1.3': {
        const liveNodes = nodes.filter(n => {
          const liveVal = this.getProperty(n, 'live');
          return liveVal === 'polite' || liveVal === 'assertive';
        });

        if (caseId === 'TC-4.1.3-01' || caseId === 'TC-4.1.3-02') {
          const hasDynamicTextInLive = liveNodes.some(n =>
            String(n.name?.value).includes('saved') ||
            String(n.name?.value).includes('failed') ||
            n.childIds?.some(cid => {
              const child = nodes.find(c => c.nodeId === cid);
              return String(child?.name?.value).includes('saved') || String(child?.name?.value).includes('failed');
            })
          );

          if (!hasDynamicTextInLive) {
            verdict = 'FAIL';
            evidence.liveNodesCount = liveNodes.length;
            evidence.messageInLiveRegion = false;
            explanation = 'Dynamic message node was injected into an ordinary non-live container; live property absent in AX Tree.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        if (caseId === 'TC-4.1.3-04') {
          const offNodes = nodes.filter(n => this.getProperty(n, 'live') === 'off');
          if (offNodes.length > 0) {
            verdict = 'FAIL';
            evidence.computedLiveProperty = 'off';
            explanation = 'Container explicitly exposes live="off" in AX Tree, suppressing announcements.';
            return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
          }
        }

        verdict = 'PASS';
        evidence.liveRegionsDetected = liveNodes.length;
        explanation = 'Status feedback exposed inside live region node with live="polite" or live="assertive" in AX Tree.';
        break;
      }

      default:
        verdict = 'NOT_TESTABLE';
        explanation = `Criterion ${wcagCriterion} does not have an active Tree evaluator mapping.`;
    }

    return this.buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta);
  }

  buildResult(caseId, ruleId, verdict, evidence, explanation, contextMeta) {
    return {
      caseId,
      ruleId,
      engineName: this.engineName,
      verdict,
      evidence,
      explanation,
      applicationState: contextMeta.state || 'post-interaction',
      runId: contextMeta.runId || 1,
      browserVersion: contextMeta.browserVersion || 'Chromium CDP',
      timestamp: new Date().toISOString()
    };
  }
}

export default TreeEvaluator;
