/**
 * @summary extracts links from anchor tags matching a given selector
 * @param selector selector to match links on
 * @param context {@link Document} or {@link Element} to get descendants of
 */
export const extractLinks = (selector: string, context: Document | Element) => {
    return [...context.querySelectorAll<HTMLAnchorElement>(selector)].map(({ href }) => href);
};

/**
 * @summary extracts text content of an element matching a given selector
 * @param selector selector to match element on
 * @param context {@link Document} or {@link Element} to get a descendant of
 */
export const extractText = (selector: string, context: Document | Element) => {
    return (context.querySelector(selector)?.textContent || "").trim();
};