let counter = 0;

/** Short, collision-resistant id for pages and text blocks. */
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
