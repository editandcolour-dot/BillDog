import { Page, Frame } from 'playwright-core';

export interface DOMNode {
  tag: string;
  id?: string;
  class?: string;
  name?: string;
  type?: string;
  title?: string;
  value?: string;
  text?: string;
  children?: DOMNode[];
  href?: string;
}

export async function getSimplifiedDOM(target: Page | Frame, credentials: { username?: string, password?: string }): Promise<DOMNode> {
  const result = await target.evaluate(`(function(creds) {
    function isVisible(el) {
      if (!(el instanceof HTMLElement)) return true;
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (!text) return null;
        let redacted = text;
        if (creds.username) redacted = redacted.split(creds.username).join('[REDACTED_USERNAME]');
        if (creds.password) redacted = redacted.split(creds.password).join('[REDACTED_PASSWORD]');
        return { tag: '#text', text: redacted };
      }

      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      const el = node;
      
      const tag = el.tagName.toLowerCase();
      if (['script', 'style', 'svg', 'noscript', 'meta', 'head', 'link'].includes(tag)) return null;
      if (!isVisible(el)) return null;

      const obj = { tag };
      if (el.id) obj.id = el.id;
      if (el.className && typeof el.className === 'string') obj.class = el.className;
      
      const name = el.getAttribute('name');
      if (name) obj.name = name;
      
      const type = el.getAttribute('type');
      if (type) obj.type = type;

      const title = el.getAttribute('title');
      if (title) obj.title = title;

      if (tag === 'a') {
        const href = el.getAttribute('href');
        if (href) obj.href = href;
      }

      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        let value = el.value;
        if (value) {
          if (creds.username && value === creds.username) value = '[REDACTED_USERNAME]';
          if (creds.password && value === creds.password) value = '[REDACTED_PASSWORD]';
          obj.value = value;
        }
      }

      if (tag === 'iframe') {
         obj.text = '[IFRAME CONTENT: Use switchFrame action to enter]';
         return obj;
      }

      const children = Array.from(el.childNodes)
        .map(processNode)
        .filter(Boolean);
      
      if (children.length === 1 && children[0].tag === '#text' && !obj.id && !obj.class && !obj.name) {
        obj.text = children[0].text;
        return obj;
      }

      if (children.length > 0) {
        obj.children = children;
      }

      return obj;
    }

    return processNode(document.body);
  })(${JSON.stringify(credentials)})`);

  return result || { tag: 'body' };
}
