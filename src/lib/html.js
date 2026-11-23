const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape text for element content and quoted attribute values. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

/**
 * JSON embedded in a <script> tag. `</script>` inside a string would end the
 * tag early, so `<` is escaped; JSON.parse still accepts the result.
 */
export function serializeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028|\u2029/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));
}

/** Join class names, dropping falsy entries. */
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}
