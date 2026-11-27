import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// PART 1: Source Code Static Analysis
const modalSourcePath = path.resolve("src/components/Modal.tsx");
const modalSource = fs.readFileSync(modalSourcePath, "utf-8");

test("Source check: Stable focus lifecycle and callback separation", () => {
  assert.match(
    modalSource,
    /\},\s*\[isOpen,\s*uniqueId\]\);/,
    "useEffect must only depend on [isOpen, uniqueId] to prevent focus reset on callback updates"
  );
  assert.match(
    modalSource,
    /onCloseRef\s*=\s*useRef\(onClose\)/,
    "Modal must store onClose in a ref to avoid recreating the effect"
  );
  assert.match(
    modalSource,
    /onCloseRef\.current\s*=\s*onClose/,
    "Modal must synchronize onCloseRef with the latest prop in useLayoutEffect"
  );
});

test("Source check: Active modal stack management", () => {
  assert.match(modalSource, /modalStack:\s*ModalRegistration\[\]\s*=\s*\[\];/, "Modal must define a modalStack");
  assert.match(modalSource, /pushModal/, "Modal must implement pushModal");
  assert.match(modalSource, /removeModal/, "Modal must implement removeModal");
  assert.match(modalSource, /getTopModal/, "Modal must resolve getTopModal");
  assert.match(
    modalSource,
    /addEventListener\("keydown",\s*handleGlobalKeyDown,\s*true\)/,
    "Modal must use capture-phase event listener for keydown"
  );
  assert.match(
    modalSource,
    /addEventListener\("focusin",\s*handleGlobalFocusIn,\s*true\)/,
    "Modal must use capture-phase event listener for focusin"
  );
});

test("Source check: all disabled fieldset ancestors use direct-child legend exception", () => {
  assert.match(modalSource, /let current: HTMLElement \| null = el;/);
  assert.match(modalSource, /current\.tagName === "FIELDSET"[\s\S]*?\.disabled/);
  assert.match(
    modalSource,
    /Array\.from\(current\.children\)\.find\([\s\S]*?child\.tagName === "LEGEND"/
  );
  assert.match(modalSource, /firstLegend\?\.contains\(el\)/);
});

// PART 2: Simulated DOM-based Focusable Element Detection Tests
function isElementVisibleAndFocusable(el) {
  if (!el || typeof el.focus !== "function") return false;
  if (el.disabled) return false;
  if (el.tagName === "INPUT" && el.attributes.type === "hidden") return false;
  if (el.getAttribute("tabindex") === "-1") return false;

  let current = el;
  while (current) {
    if (current.tagName === "FIELDSET" && current.disabled) {
      const firstLegend = current.children.find((child) => child.tagName === "LEGEND");
      if (!firstLegend || !firstLegend.contains(el)) return false;
    }

    if (current.hasAttribute && (
      current.hasAttribute("hidden") ||
      current.getAttribute("aria-hidden") === "true" ||
      current.hasAttribute("inert")
    )) {
      return false;
    }

    if (current.matches && current.matches('[hidden], [aria-hidden="true"], [inert]')) {
      return false;
    }

    if (current.style) {
      if (current.style.display === "none" || current.style.visibility === "hidden" || current.style.visibility === "collapse") {
        return false;
      }
    }
    current = current.parentElement;
  }

  if (el.offsetWidth === 0 && el.offsetHeight === 0 && el.getClientRects().length === 0) {
    if (el.style.display === "none" || el.style.visibility === "hidden") {
      return false;
    }
  }

  return true;
}

function getFocusableElements(container) {
  const RAW_FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll(RAW_FOCUSABLE_SELECTOR));
  return elements.filter(isElementVisibleAndFocusable);
}

function createMockElement(tag, attrs = {}, style = {}) {
  const children = [];
  return {
    tagName: tag.toUpperCase(),
    attributes: { ...attrs },
    style: { ...style },
    parentElement: null,
    disabled: Object.hasOwn(attrs, "disabled") && attrs.disabled !== false,
    offsetWidth: style.display === "none" ? 0 : 100,
    offsetHeight: style.display === "none" ? 0 : 30,
    getClientRects: () => (style.display === "none" ? [] : [{ width: 100, height: 30 }]),
    getAttribute: (name) => attrs[name] ?? null,
    hasAttribute: (name) => name in attrs,
    focus: function () {
      mockDocument.activeElement = this;
    },
    closest: function (selector) {
      /* eslint-disable-next-line @typescript-eslint/no-this-alias */
      let cur = this;
      while (cur) {
        if (cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    },
    querySelector: function (selector) {
      const all = this.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    },
    querySelectorAll: function (selector) {
      const results = [];
      function recurse(el) {
        for (const child of el.children) {
          if (child.matches(selector)) {
            results.push(child);
          }
          recurse(child);
        }
      }
      recurse(this);
      return results;
    },
    matches: function (sel) {
      const normalizedSel = sel.toLowerCase();
      const tagLower = this.tagName.toLowerCase();

      if (normalizedSel === "legend") return tagLower === "legend";
      if (normalizedSel === "fieldset[disabled]") return tagLower === "fieldset" && this.hasAttribute("disabled");
      if (normalizedSel.includes('[hidden]') && this.hasAttribute("hidden")) return true;
      if (normalizedSel.includes('[aria-hidden="true"]') && this.getAttribute("aria-hidden") === "true") return true;
      if (normalizedSel.includes('[inert]') && this.hasAttribute("inert")) return true;

      if (sel.includes("button") && this.tagName === "BUTTON") {
        if (sel.includes(":not([disabled])") && this.disabled) return false;
        return true;
      }
      if (sel.includes("input") && this.tagName === "INPUT") {
        if (sel.includes(":not([disabled])") && this.disabled) return false;
        if (this.attributes.type === "hidden") return false;
        return true;
      }
      if (sel.includes("[href]") && this.hasAttribute("href")) return true;
      if (sel.includes('[tabindex]:not([tabindex="-1"])')) {
        return this.hasAttribute("tabindex") && this.getAttribute("tabindex") !== "-1";
      }
      return false;
    },
    children,
    appendChild: function (child) {
      children.push(child);
      child.parentElement = this;
    },
    contains: function (target) {
      if (this === target) return true;
      for (const child of this.children) {
        if (child.contains(target)) return true;
      }
      return false;
    },
  };
}

const mockDocument = { activeElement: null };

test("DOM logic: isElementVisibleAndFocusable excludes disabled, hidden, and tabindex=-1 controls", () => {
  const visibleBtn = createMockElement("button");
  assert.equal(isElementVisibleAndFocusable(visibleBtn), true, "Normal button is focusable");

  const disabledBtn = createMockElement("button", { disabled: true });
  assert.equal(isElementVisibleAndFocusable(disabledBtn), false, "Disabled button is NOT focusable");

  const hiddenInput = createMockElement("input", { type: "hidden" });
  assert.equal(isElementVisibleAndFocusable(hiddenInput), false, "Hidden input is NOT focusable");

  const displayNoneEl = createMockElement("button", {}, { display: "none" });
  assert.equal(isElementVisibleAndFocusable(displayNoneEl), false, "display:none element is NOT focusable");

  const tabIndexMinusOne = createMockElement("div", { tabindex: "-1" });
  assert.equal(isElementVisibleAndFocusable(tabIndexMinusOne), false, "tabindex=-1 is NOT focusable");

  const ariaHiddenEl = createMockElement("button", { "aria-hidden": "true" });
  assert.equal(isElementVisibleAndFocusable(ariaHiddenEl), false, "aria-hidden=true is NOT focusable");
});

test("DOM logic: excludes controls inside display:none, [hidden], [aria-hidden], and [inert] ancestors", () => {
  // 1. Ancestor with display: none
  const hiddenWrapper = createMockElement("div", {}, { display: "none" });
  const btnInHiddenWrapper = createMockElement("button");
  hiddenWrapper.appendChild(btnInHiddenWrapper);
  assert.equal(isElementVisibleAndFocusable(btnInHiddenWrapper), false, "Button in display:none ancestor is NOT focusable");

  // 2. Ancestor with [hidden]
  const hiddenAttrWrapper = createMockElement("div", { hidden: "" });
  const btnInHiddenAttrWrapper = createMockElement("button");
  hiddenAttrWrapper.appendChild(btnInHiddenAttrWrapper);
  assert.equal(isElementVisibleAndFocusable(btnInHiddenAttrWrapper), false, "Button in [hidden] ancestor is NOT focusable");

  // 3. Ancestor with [aria-hidden="true"]
  const ariaHiddenWrapper = createMockElement("div", { "aria-hidden": "true" });
  const btnInAriaHiddenWrapper = createMockElement("button");
  ariaHiddenWrapper.appendChild(btnInAriaHiddenWrapper);
  assert.equal(isElementVisibleAndFocusable(btnInAriaHiddenWrapper), false, "Button in [aria-hidden='true'] ancestor is NOT focusable");

  // 4. Ancestor with [inert]
  const inertWrapper = createMockElement("div", { inert: "" });
  const btnInInertWrapper = createMockElement("button");
  inertWrapper.appendChild(btnInInertWrapper);
  assert.equal(isElementVisibleAndFocusable(btnInInertWrapper), false, "Button in [inert] ancestor is NOT focusable");
});

test("DOM logic: first direct-child legend exception in disabled fieldsets", () => {
  const disabledFieldset = createMockElement("fieldset", { disabled: "" });

  // A nested descendant legend does not count as the exception.
  const wrapper = createMockElement("div");
  const nestedLegend = createMockElement("legend");
  const btnInNestedLegend = createMockElement("button");
  nestedLegend.appendChild(btnInNestedLegend);
  wrapper.appendChild(nestedLegend);
  disabledFieldset.appendChild(wrapper);

  // Only the first direct-child legend is exempt.
  const firstLegend = createMockElement("legend");
  const btnInFirstLegend = createMockElement("button");
  firstLegend.appendChild(btnInFirstLegend);
  disabledFieldset.appendChild(firstLegend);

  // Later direct-child legends and regular controls are not exempt.
  const secondLegend = createMockElement("legend");
  const btnInSecondLegend = createMockElement("button");
  secondLegend.appendChild(btnInSecondLegend);
  disabledFieldset.appendChild(secondLegend);

  const btnOutsideLegend = createMockElement("button");
  disabledFieldset.appendChild(btnOutsideLegend);

  assert.equal(
    isElementVisibleAndFocusable(btnInFirstLegend),
    true,
    "Control inside first <legend> of disabled <fieldset> remains focusable per HTML spec"
  );
  assert.equal(
    isElementVisibleAndFocusable(btnInNestedLegend),
    false,
    "A descendant legend that is not a direct child is not exempt"
  );
  assert.equal(
    isElementVisibleAndFocusable(btnOutsideLegend),
    false,
    "Control outside first legend of disabled <fieldset> is NOT focusable"
  );
  assert.equal(
    isElementVisibleAndFocusable(btnInSecondLegend),
    false,
    "Control inside second legend of disabled <fieldset> is NOT focusable"
  );
});

test("DOM logic: checks nested disabled fieldsets independently", () => {
  const outerFieldset = createMockElement("fieldset", { disabled: "" });
  const outerLegend = createMockElement("legend");
  outerFieldset.appendChild(outerLegend);

  const content = createMockElement("div");
  outerFieldset.appendChild(content);

  const innerFieldset = createMockElement("fieldset", { disabled: "" });
  content.appendChild(innerFieldset);
  const innerLegend = createMockElement("legend");
  const controlInInnerLegend = createMockElement("button");
  innerLegend.appendChild(controlInInnerLegend);
  innerFieldset.appendChild(innerLegend);

  const controlInInnerFieldset = createMockElement("button");
  innerFieldset.appendChild(controlInInnerFieldset);

  assert.equal(
    isElementVisibleAndFocusable(controlInInnerFieldset),
    false,
    "A control outside the inner first legend is disabled"
  );
  assert.equal(
    isElementVisibleAndFocusable(controlInInnerLegend),
    false,
    "The inner legend exception does not override the disabled outer fieldset"
  );
});

test("DOM logic: getFocusableElements returns only valid interactive elements in order", () => {
  const container = createMockElement("div");

  const btn1 = createMockElement("button");
  const disabledBtn = createMockElement("button", { disabled: true });
  const input1 = createMockElement("input", { type: "text" });
  const hiddenInput = createMockElement("input", { type: "hidden" });
  const link1 = createMockElement("a", { href: "#" });

  container.appendChild(btn1);
  container.appendChild(disabledBtn);
  container.appendChild(input1);
  container.appendChild(hiddenInput);
  container.appendChild(link1);

  const focusables = getFocusableElements(container);
  assert.equal(focusables.length, 3, "Only visible, enabled controls are returned");
  assert.equal(focusables[0], btn1);
  assert.equal(focusables[1], input1);
  assert.equal(focusables[2], link1);
});

// PART 3: Simulated Multi-Modal Stack Interactions
test("Simulation: Active-modal stack coordination across two modals", () => {
  const stack = [];
  let overflow = "auto";

  function simPush(id, onClose, trigger) {
    if (stack.length === 0) overflow = "hidden";
    stack.push({ id, onClose, trigger });
  }

  function simRemove(id) {
    const idx = stack.findIndex((m) => m.id === id);
    if (idx !== -1) {
      const [removed] = stack.splice(idx, 1);
      if (stack.length === 0) overflow = "auto";
      return removed;
    }
    return null;
  }

  function simGetTop() {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }

  let modal1Closed = false;
  let modal2Closed = false;

  // 1. Open Modal 1 from Button 1
  const trigger1 = createMockElement("button");
  simPush("modal-1", () => { modal1Closed = true; }, trigger1);

  assert.equal(stack.length, 1);
  assert.equal(simGetTop().id, "modal-1");
  assert.equal(overflow, "hidden", "Overflow is locked");

  // 2. Open Modal 2 (stacked on top of Modal 1) from inside Modal 1
  const trigger2 = createMockElement("button");
  simPush("modal-2", () => { modal2Closed = true; }, trigger2);

  assert.equal(stack.length, 2);
  assert.equal(simGetTop().id, "modal-2", "Modal 2 is top modal");
  assert.equal(overflow, "hidden", "Overflow remains locked");

  // 3. Escape key presses: ONLY top modal (Modal 2) should receive Escape
  const currentTop = simGetTop();
  currentTop.onClose();

  assert.equal(modal2Closed, true, "Top modal received Escape");
  assert.equal(modal1Closed, false, "Underlying modal was NOT closed");

  // 4. Modal 2 unmounts
  simRemove("modal-2");
  assert.equal(stack.length, 1);
  assert.equal(simGetTop().id, "modal-1", "Modal 1 is reactivated as top modal");
  assert.equal(overflow, "hidden", "Overflow remains locked for Modal 1");

  // 5. Close Modal 1
  const remainingTop = simGetTop();
  remainingTop.onClose();
  assert.equal(modal1Closed, true, "Modal 1 now closed");

  simRemove("modal-1");
  assert.equal(stack.length, 0);
  assert.equal(overflow, "auto", "Overflow restored after last modal closes");
});
