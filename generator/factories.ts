import type {
    Identifier,
    Modifier,
    NodeFactory,
    NodeFlags,
    Statement
} from "typescript";
import ts from "typescript";


export type CommonDeclarationOptions = {
    exported?: boolean;
};

export type ModuleDeclarationOptions = CommonDeclarationOptions & {
    isAmbient?: boolean;
    isNamespace?: boolean;
    isGlobal?: boolean;
};

export type NamespaceOptions = CommonDeclarationOptions & {
    isAmbient?: boolean;
};

/**
 * @summary creates a module declaration
 * @param factory compiler factory to use
 * @param name identifier to create the module with
 * @param statements statements to make up the body
 * @param options factory configuration
 */
export const createModuleDeclaration = (
    factory: NodeFactory,
    name: string | Identifier,
    statements: Statement[],
    {
        exported = false,
        isGlobal = false,
        isNamespace = false,
        isAmbient = false,
    }: ModuleDeclarationOptions = {}
) => {
    const modifiers: Modifier[] = [];
    if (exported) modifiers.push(factory.createModifier(ts.SyntaxKind.ExportKeyword));
    if (isAmbient)
        modifiers.push(factory.createModifier(ts.SyntaxKind.DeclareKeyword));

    const flagMap: Map<boolean, NodeFlags> = new Map();
    flagMap.set(isNamespace, ts.NodeFlags.Namespace);
    flagMap.set(isGlobal, ts.NodeFlags.GlobalAugmentation);

    return factory.createModuleDeclaration(
        undefined,
        modifiers,
        typeof name === "string" ? factory.createIdentifier(name) : name,
        factory.createModuleBlock(statements),
        flagMap.get(true)
    );
};

/**
 * @see https://github.com/microsoft/TypeScript/issues/19030#issuecomment-335247446
 * @summary creates a namespace declaration
 * @param factory compiler factory to use
 * @param name identifier to create the namespace with
 * @param statements statements to make up the body
 * @param options factory configuration
 */
export const createNamespace = (
    factory: NodeFactory,
    name: string | Identifier,
    statements: Statement[],
    {
        exported = false,
        isAmbient = false
    }: NamespaceOptions = {}
): ts.ModuleDeclaration => {
    const modifiers: Modifier[] = [];
    if (exported) modifiers.push(factory.createModifier(ts.SyntaxKind.ExportKeyword));

    return createModuleDeclaration(factory, name, statements, {
        exported,
        isAmbient,
        isNamespace: true,
    });
};