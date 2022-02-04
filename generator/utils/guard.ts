/**
 * @summary checks if a doc text represents an array
 * @param doc documentation text
 */
export const isArrayParamDoc = (doc: string): doc is `${string}[]` => doc.endsWith("[]");

/**
 * @summary checks if a doc text represents an object
 * @param doc documentation text
 */
export const isObjectParamDoc = (doc: string): doc is "Object" => doc === "Object";