import got from "got";
import { JSDOM } from "jsdom";

const { version, name, description } = await import("../../package.json");

got.extend({
    responseType: "text",
    headers: {
        "User-Agent": `name ${name}; version ${version}; about ${description};`,
    },
});

export type GetDocumentOptions = {
    hash?: string;
    parameters?: Record<string, string>;
};

/**
 * @summary fetches a JSDOM document from a URL
 * @param base base of the URL
 * @param path path to the resource
 * @param options request configuration
 */
export const getDocument = async (
    base: string,
    path: string,
    { hash, parameters = {} }: GetDocumentOptions = {}
) => {
    const url = new URL(path, base);
    url.search = new URLSearchParams(parameters).toString();
    if (hash) url.hash = hash;

    const res = await got(url);
    if (res.statusCode !== 200) return;

    const { body } = res;

    const {
        window: { document },
    } = new JSDOM(body);

    return document;
};