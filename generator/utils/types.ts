/**
 * @summary unboxes a given scraped type
 * @param type type to unbox
 */
export const unbox = (type: string) => type.replace("[]", "");

/**
 * @summary properly capitalizes a type
 * @param type type to unbox
 */
export const capitalize = (type: string) => type.slice(0, 1).toUpperCase() + type.slice(1);