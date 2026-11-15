/**
 * Shared Accessibility Rule Catalogue
 * Aligned with WCAG 2.2 Level AA criteria
 */

export const RULE_CATALOGUE = [
  {
    ruleId: 'RULE-1.1.1',
    wcagCriterion: '1.1.1',
    wcagLevel: 'A',
    name: 'Non-text Content Alternatives',
    plainLanguage: 'All non-text content (images, graphic icons, SVG buttons) must expose a descriptive text alternative unless purely decorative.',
    expectedCondition: 'Images and graphic icons possess non-empty alt text or accessible name, or are marked decorative with alt="" or aria-hidden="true".',
    failureCondition: 'Informative image or actionable icon button has no alt text, empty alt on interactive control, or lacks accessible name.',
    applicableComponents: ['img', 'svg', 'button', 'input[type="image"]'],
    requiredEvidence: {
      dom: ['img[alt]', 'svg[aria-label]', 'svg[aria-hidden]', 'button textContent', 'aria-label', 'aria-labelledby'],
      tree: ['role="image"', 'role="button"', 'computed accessible name', 'properties.hidden', 'ignored state']
    },
    knownLimitations: 'Automated inspection can verify presence and non-emptiness of text alternatives, but human judgement is required to evaluate accuracy and semantic nuance.'
  },
  {
    ruleId: 'RULE-1.3.1',
    wcagCriterion: '1.3.1',
    wcagLevel: 'A',
    name: 'Info and Relationships Semantic Structure',
    plainLanguage: 'Visual structure, section headings, lists, and form label relationships must be programmatically determinable.',
    expectedCondition: 'Headings use h1-h6 or role="heading"; form inputs have associated labels (label[for] or aria-label/labelledby); data tables have th headers.',
    failureCondition: 'Visual headings rendered with non-semantic elements without heading role; inputs without label associations; lists formatted with line breaks.',
    applicableComponents: ['headings', 'form controls', 'lists', 'tables'],
    requiredEvidence: {
      dom: ['tagName (h1-h6, label, ul, ol, th)', 'for/id attributes', 'role="heading"', 'aria-level'],
      tree: ['role="heading"', 'role="textbox"', 'role="list"', 'role="columnheader"', 'computed name from label']
    },
    knownLimitations: 'Heuristics cannot detect all visually styled faux-headings without visual font-size comparison.'
  },
  {
    ruleId: 'RULE-2.1.1',
    wcagCriterion: '2.1.1',
    wcagLevel: 'A',
    name: 'Keyboard Operability',
    plainLanguage: 'All interactive functionality must be operable through a keyboard interface without requiring specific timings.',
    expectedCondition: 'Interactive elements are keyboard focusable (tabindex >= 0 or native focusable element) and respond to Enter and Space keys.',
    failureCondition: 'Custom clickable element (div/span) lacks tabindex, is unreachable via keyboard, or fails to handle keydown events.',
    applicableComponents: ['button', 'a[href]', 'input', 'custom controls [onclick]'],
    requiredEvidence: {
      dom: ['tabindex attribute', 'onclick/onkeydown event listeners', 'nodeName'],
      tree: ['focusable property', 'focused state', 'role="button"', 'actionable properties']
    },
    knownLimitations: 'DOM inspection checks attribute presence; full keyboard operability requires simulating keydown events.'
  },
  {
    ruleId: 'RULE-2.4.2',
    wcagCriterion: '2.4.2',
    wcagLevel: 'A',
    name: 'Page Titled',
    plainLanguage: 'Web pages and dynamic SPA views must have informative, non-empty titles describing their topic or purpose.',
    expectedCondition: 'document.title is non-empty, distinct, and updates dynamically upon client-side SPA route transitions.',
    failureCondition: 'document.title is empty, whitespace, generic ("Untitled"), or fails to update after view change.',
    applicableComponents: ['document', 'SPA router'],
    requiredEvidence: {
      dom: ['document.title property', '<title> element in DOM head'],
      tree: ['root WebArea / RootWebArea name property']
    },
    knownLimitations: 'Assessing whether a title is sufficiently descriptive of user purpose requires human judgement.'
  },
  {
    ruleId: 'RULE-2.4.3',
    wcagCriterion: '2.4.3',
    wcagLevel: 'A',
    name: 'Focus Order and Modal Containment',
    plainLanguage: 'Focusable elements must receive focus in an order preserving meaning, and modals must trap and restore focus.',
    expectedCondition: 'No positive tabindex disruption; modal dialogs move focus inside upon opening and restore focus to trigger upon closing.',
    failureCondition: 'Element has tabindex > 0; modal dialog opens without focusing content, allows focus escape, or fails to restore focus on exit.',
    applicableComponents: ['modal dialogs', 'form inputs', 'interactive controls'],
    requiredEvidence: {
      dom: ['tabindex > 0 check', 'document.activeElement tracking', 'modal visibility display/hidden'],
      tree: ['focused AXNode before, during, and after dialog lifecycle', 'role="dialog"', 'modal property']
    },
    knownLimitations: 'Focus trapping must be verified through sequential interaction steps.'
  },
  {
    ruleId: 'RULE-2.5.3',
    wcagCriterion: '2.5.3',
    wcagLevel: 'A',
    name: 'Label in Name Alignment',
    plainLanguage: 'For user interface components with labels that include text, the accessible name must contain the text presented visually.',
    expectedCondition: 'Computed accessible name includes the visible inner text of the control verbatim (case-insensitive substring match).',
    failureCondition: 'aria-label or aria-labelledby completely contradicts or omits the visible text.',
    applicableComponents: ['button', 'a', 'input[type="submit"]'],
    requiredEvidence: {
      dom: ['element.innerText', 'aria-label attribute', 'aria-labelledby text lookup'],
      tree: ['computed accessible name', 'child text node values']
    },
    knownLimitations: 'Text rendered via CSS generated content (::before/::after) may complicate raw DOM innerText computation.'
  },
  {
    ruleId: 'RULE-3.3.2',
    wcagCriterion: '3.3.2',
    wcagLevel: 'A',
    name: 'Labels or Instructions',
    plainLanguage: 'Labels or instructions are provided when content requires user input.',
    expectedCondition: 'Required inputs have persistent visible labels and indicate requirement via text or aria-required.',
    failureCondition: 'Input uses only disappearing placeholder as label, or required status is communicated only by color without text/ARIA cue.',
    applicableComponents: ['input', 'select', 'textarea'],
    requiredEvidence: {
      dom: ['placeholder-only presence', 'label element', 'required / aria-required attributes', 'aria-describedby'],
      tree: ['computed accessible name', 'required property', 'description property']
    },
    knownLimitations: 'Determining if complex instructional copy is clear to all users requires human cognitive assessment.'
  },
  {
    ruleId: 'RULE-4.1.2',
    wcagCriterion: '4.1.2',
    wcagLevel: 'A',
    name: 'Name, Role, Value',
    plainLanguage: 'For all user interface components, name and role must be programmatically determinable and states/values must be exposed.',
    expectedCondition: 'Interactive widgets (disclosure buttons, tabs, toggles) have valid ARIA roles and expose dynamic states (aria-expanded, aria-selected).',
    failureCondition: 'Collapsible control lacks aria-expanded; tab widget lacks role="tab" or aria-selected; invalid ARIA roles authored.',
    applicableComponents: ['disclosure widgets', 'tabs', 'custom checkboxes', 'buttons'],
    requiredEvidence: {
      dom: ['role attribute validity', 'aria-expanded', 'aria-selected', 'aria-checked attributes', 'state change on click'],
      tree: ['computed role', 'expanded property', 'selected property', 'checked property']
    },
    knownLimitations: 'Invalid roles in raw DOM might be dropped or mapped to generic roles in the computed Accessibility Tree.'
  },
  {
    ruleId: 'RULE-4.1.3',
    wcagCriterion: '4.1.3',
    wcagLevel: 'AA',
    name: 'Status Messages Exposure',
    plainLanguage: 'In dynamic web applications, status messages must be programmatically exposed through live regions without receiving focus.',
    expectedCondition: 'Asynchronous success/info feedback is injected into containers with role="status" or aria-live="polite"; errors into role="alert" or aria-live="assertive".',
    failureCondition: 'Dynamic status message is injected into a container lacking live region semantics, or has aria-live="off".',
    applicableComponents: ['status messages', 'alerts', 'notifications', 'dynamic feedback'],
    requiredEvidence: {
      dom: ['role="status"', 'role="alert"', 'aria-live attribute', 'content mutation inside region'],
      tree: ['live property ("polite" | "assertive")', 'role="status" / role="alert"', 'child node changes']
    },
    knownLimitations: 'Automated inspection detects presence of live region properties in DOM/AX Tree, but cannot verify real-time speech queue output on screen readers.'
  }
];

export default RULE_CATALOGUE;
