import { prependMultilineComment } from "./decorators.js";
import { createInterface, createNamespace } from "./factories.js";
import { getDocument } from "./utils/request.js";
import { extractLinks, extractText } from "./utils/selector.js";
import { sleep } from "./utils/timing.js";

const DOCS_BASE = "https://developers.google.com";
const DOCS_PATH = "/apps-script/reference";

const entryDoc = await getDocument(DOCS_BASE, DOCS_PATH);

if (!entryDoc) {
    throw new Error(`Failed to GET ${DOCS_BASE}${DOCS_PATH}`);
}

const servicePathSelector = ".devsite-nav-expandable ul.devsite-nav-section > li.devsite-nav-item:first-child > a[href*='/apps-script/reference/']";
const serviceNameSelector = "h1.devsite-page-title";
const serviceDescSelector = ".devsite-article-body p:first-of-type";
const serviceClassRowsSelector = "#classes + .toc .member tr:not(:first-child)";
const serviceClassNameSelector = "td:first-child";
const serviceClassDescSelector = "td:nth-child(2)";

const servicePaths = extractLinks(servicePathSelector, entryDoc);

console.log(`
Found the following service paths to scrape:
${servicePaths.map((p) => ` - ${p}`).join("\n")}
`);

servicePaths.length = 1; // TODO: remove

const { default: ts } = await import("typescript");

const { factory, createPrinter, createSourceFile } = ts;

const nodePrinter = createPrinter({ newLine: ts.NewLineKind.LineFeed });

const sourceFile = createSourceFile(
    "types",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
);

for (const servicePath of servicePaths) {
    const serviceDoc = await getDocument(DOCS_BASE, servicePath);

    if (!serviceDoc) {
        throw new Error(`Failed to GET ${DOCS_BASE}${servicePath}`);
    }

    const serviceNameText = extractText(serviceNameSelector, serviceDoc);
    const serviceDescText = extractText(serviceDescSelector, serviceDoc);

    const serviceName = serviceNameText.replace(/\s+Service$/i, "");

    const serviceClassRows = serviceDoc.querySelectorAll<HTMLTableRowElement>(serviceClassRowsSelector);

    const serviceClassSchemas: Array<{ desc: string, path: string, name: string; }> = [];
    serviceClassRows.forEach((row) => {
        const name = extractText(serviceClassNameSelector, row);
        const desc = extractText(serviceClassDescSelector, row);
        const [path] = extractLinks(`${serviceClassNameSelector} a`, row);
        serviceClassSchemas.push({ desc, name, path });
    });

    const serviceClassDeclarations = serviceClassSchemas.map(({ name, desc }) => {
        const serviceClassDeclaration = createInterface(factory, name, []);
        return prependMultilineComment(serviceClassDeclaration, desc);
    });

    const serviceNSdeclaration = createNamespace(
        factory,
        serviceName,
        serviceClassDeclarations
    );

    // add service description as a leading multiline JSDoc comment
    prependMultilineComment(serviceNSdeclaration, serviceDescText);

    // create ambient wrapper GoogleAppsScript namespace
    // and populate it with the service namespace
    const appsScriptNSdeclaration = createNamespace(
        factory,
        "GoogleAppsScript",
        [serviceNSdeclaration],
        { isAmbient: true }
    );

    const node = nodePrinter.printNode(ts.EmitHint.Unspecified, appsScriptNSdeclaration, sourceFile);

    console.log(node);

    // apply slight throttle to avoid hammering the pages
    await sleep(1);
}
