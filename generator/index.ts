import type { Statement } from "typescript";
import { prependMultilineComment } from "./decorators.js";
import { createEnum, createEnumMember, createInterface, createNamespace } from "./factories.js";
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
const memberNameSelector = "td:first-child";
const serviceClassDescSelector = "td:nth-child(2)";
const enumMemberRowsSelector = ".members.property tr:not(:first-child)";
const enumMemberDescSelector = "td:nth-child(3)";

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

    const serviceMemberDeclarations: Map<string, Statement> = new Map();
    serviceClassRows.forEach((row) => {
        const name = extractText(memberNameSelector, row);
        const desc = extractText(serviceClassDescSelector, row);
        const [path] = extractLinks(`${memberNameSelector} a`, row);
        const isEnum = /^An?\s+enum/i.test(desc);

        const memberFactory = isEnum ? createEnum : createInterface;

        const declaration = memberFactory(factory, name, []);

        prependMultilineComment(declaration, desc);

        serviceMemberDeclarations.set(path, declaration);
    });

    for (const [path, node] of serviceMemberDeclarations) {
        if (ts.isEnumDeclaration(node)) {

            const serviceMemberDoc = await getDocument(DOCS_BASE, path);

            if (!serviceMemberDoc) continue;

            const enumMemberRows = serviceMemberDoc.querySelectorAll<HTMLTableRowElement>(enumMemberRowsSelector);

            const enumMembers = [...enumMemberRows].map((row) => {
                const name = extractText(memberNameSelector, row);
                const desc = extractText(enumMemberDescSelector, row);

                const member = createEnumMember(factory, name);

                return prependMultilineComment(member, desc);
            });

            const updated = factory.updateEnumDeclaration(
                node,
                node.decorators,
                node.modifiers,
                node.name,
                enumMembers
            );

            serviceMemberDeclarations.set(path, updated);
        }
    }

    // create service namespace declaration
    // and populate it with interfaces and enums
    const serviceNSdeclaration = createNamespace(
        factory,
        serviceName,
        [...serviceMemberDeclarations.values()]
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
