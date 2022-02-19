import type { InterfaceDeclaration, Statement } from "typescript";
import { prependMultilineComment } from "./decorators.js";
import { $void, createArray, createEnum, createEnumMember, createIndexSignature, createInterface, createMethod, createMethodSignatureJSDoc, createNamespace, createParameter, createProperty, createTypeQuery, string, unknown, updateEnumMembers, updateInterfaceMembers } from "./factories.js";
import { isArrayParamDoc, isObjectParamDoc } from "./utils/guard.js";
import { printNodesToFile } from "./utils/printer.js";
import { getDocument } from "./utils/request.js";
import { extractLinks, extractText } from "./utils/selector.js";
import { sleep } from "./utils/timing.js";
import { capitalize, unbox } from "./utils/types.js";

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
const memberTypeSelector = "td:nth-child(2)";
const memberDescSelector = "td:nth-child(3)";
const serviceClassDescSelector = "td:nth-child(2)";
const propertyRowsSelector = ".members.property tr:not(:first-child)";
const methodDetailsWrapperSelector = ".function.doc";
const methodNameSelector = "h3";
const methodParamRowsSelector = ".function.param tr:not(:first-child)";
const methodAdvParamRowsSelector = ".function.advancedparam tr:not(:first-child)";
const methodReturnTypeSelector = "[id*='return'] + p";
const methodSummarySelector = "div > p";
const methodExampleSelector = "div > pre";

const servicePaths = extractLinks(servicePathSelector, entryDoc);

console.log(`
Found the following service paths to scrape:
${servicePaths.map((p) => ` - ${p}`).join("\n")}
`);

servicePaths.length = 1; // TODO: remove

const { default: ts } = await import("typescript");

const { factory, createPrinter, createSourceFile } = ts;

const printer = createPrinter({ newLine: ts.NewLineKind.LineFeed });

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

    console.log(`Generating types for the ${serviceName} Service`);

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

    const serviceAdvParamInterfaces: InterfaceDeclaration[] = [];

    const typeNormalizationMap: Map<string, string> = new Map();
    typeNormalizationMap.set("Integer", "number");
    typeNormalizationMap.set("String", "string");
    typeNormalizationMap.set("Boolean", "boolean");
    typeNormalizationMap.set("Object", "object");

    for (const [path, node] of serviceMemberDeclarations) {
        const serviceMemberDoc = await getDocument(DOCS_BASE, path);
        if (!serviceMemberDoc) {
            continue;
        }

        if (ts.isEnumDeclaration(node)) {
            const enumMemberRows = serviceMemberDoc.querySelectorAll<HTMLTableRowElement>(propertyRowsSelector);

            const enumMembers = [...enumMemberRows].map((row) => {
                const name = extractText(memberNameSelector, row);
                const desc = extractText(memberDescSelector, row);

                const member = createEnumMember(factory, name);

                return prependMultilineComment(member, desc);
            });

            const updated = updateEnumMembers(factory, node, enumMembers);

            serviceMemberDeclarations.set(path, updated);
        }

        if (ts.isInterfaceDeclaration(node)) {
            const interfacePropertyRows = serviceMemberDoc.querySelectorAll<HTMLTableRowElement>(propertyRowsSelector);

            const interfaceProperties = [...interfacePropertyRows].map((row) => {
                const name = extractText(memberNameSelector, row);
                const type = extractText(memberTypeSelector, row);
                const desc = extractText(memberDescSelector, row);
                const isEnum = /^An?\s+enum/i.test(desc);

                const member = createProperty(factory, name,
                    isEnum ?
                        createTypeQuery(factory, type) :
                        factory.createTypeReferenceNode(type)
                );

                return prependMultilineComment(member, desc);
            });

            const interfaceMethodDetails = serviceMemberDoc.querySelectorAll<HTMLTableRowElement>(methodDetailsWrapperSelector);

            const interfaceMethods = [...interfaceMethodDetails].map((detail) => {
                const [intefaceName] = extractText(methodNameSelector, detail).split("(");
                const [returnType, returnComment] = extractText(methodReturnTypeSelector, detail).split(/\s+[—-]\s+/);
                const summary = extractText(methodSummarySelector, detail);
                const example = extractText(methodExampleSelector, detail);

                const methodParamRows = detail.querySelectorAll<HTMLTableRowElement>(methodParamRowsSelector);
                const methodAdvParamRows = detail.querySelectorAll<HTMLTableRowElement>(methodAdvParamRowsSelector);

                const paramComments: string[] = [];

                const parameters = [...methodParamRows].map((row) => {
                    const paramName = extractText(memberNameSelector, row);
                    const paramType = extractText(memberTypeSelector, row);
                    const paramDesc = extractText(memberDescSelector, row);

                    paramComments.push(paramDesc);

                    const unboxedType = unbox(paramType);
                    const normalizedType = typeNormalizationMap.get(unboxedType) || unboxedType;

                    if (isObjectParamDoc(paramType) && paramDesc.includes("advanced parameters")) {
                        const advProperties = [...methodAdvParamRows].map((row) => {
                            const advName = extractText(memberNameSelector, row);
                            const advType = extractText(memberTypeSelector, row);
                            const advDesc = extractText(memberDescSelector, row);
                            const isEnum = /^An?\s+enum/i.test(advDesc);
                            const isArr = isArrayParamDoc(advName);

                            const unboxedType = unbox(advType);
                            const normalizedType = typeNormalizationMap.get(unboxedType) || unboxedType;

                            const member = createProperty(
                                factory,
                                isArr ? unbox(advName) : advName,
                                isArrayParamDoc(paramType) ?
                                    createArray(factory, factory.createTypeReferenceNode(normalizedType))
                                    : isEnum ?
                                        createTypeQuery(factory, normalizedType) :
                                        factory.createTypeReferenceNode(normalizedType)
                            );

                            return prependMultilineComment(member, advDesc);
                        });

                        const advParamName = `${capitalize(intefaceName)}Options`;

                        const advInterface = createInterface(
                            factory,
                            advParamName,
                            advProperties
                        );

                        serviceAdvParamInterfaces.push(advInterface);

                        return createParameter(
                            factory,
                            paramName,
                            factory.createTypeReferenceNode(advParamName)
                        );
                    }

                    return createParameter(
                        factory,
                        paramName,
                        isArrayParamDoc(paramType) ?
                            createArray(factory, factory.createTypeReferenceNode(normalizedType))
                            : isObjectParamDoc(paramType) ?
                                createIndexSignature(factory, "key", string(factory), unknown(factory)) :
                                factory.createTypeReferenceNode(normalizedType),
                        {} // TODO: optional, default, and rest
                    );
                });

                const unboxedReturnType = returnType.replace("[]", "");
                const normalizedReturnType = typeNormalizationMap.get(unboxedReturnType) || unboxedReturnType;
                const returnTypeTypeNode = normalizedReturnType ?
                    factory.createTypeReferenceNode(normalizedReturnType) :
                    $void(factory);

                const member = createMethod(
                    factory,
                    intefaceName,
                    isArrayParamDoc(returnType) ? createArray(factory, returnTypeTypeNode) : returnTypeTypeNode,
                    { parameters }
                );

                const { tags } = createMethodSignatureJSDoc(factory, member, {
                    summary,
                    example,
                    paramComments,
                    returnComment,
                });

                const jsDocCommentText = tags && printer.printList(ts.ListFormat.MultiLine, tags, sourceFile);

                if (!jsDocCommentText) {
                    return member;
                }

                return prependMultilineComment(member, jsDocCommentText);
            });

            const updated = updateInterfaceMembers(factory, node, [
                ...interfaceProperties,
                ...interfaceMethods
            ]);

            serviceMemberDeclarations.set(path, updated);
        }
    }

    // create service namespace declaration
    // and populate it with interfaces and enums
    const serviceNSdeclaration = createNamespace(
        factory,
        serviceName,
        [
            ...serviceMemberDeclarations.values(),
            ...serviceAdvParamInterfaces
        ]
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

    await printNodesToFile(ts, [appsScriptNSdeclaration], "./index.d.ts");

    // apply slight throttle to avoid hammering the pages
    await sleep(1);
}
