import type {
    EnumMember,
    HeritageClause,
    Identifier,
    Modifier,
    NodeFactory,
    NodeFlags,
    Statement,
    TypeElement,
    TypeParameterDeclaration
} from "typescript";
import ts from "typescript";


export type CommonDeclarationOptions = {
    exported?: boolean;
    isAmbient?: boolean;
};

export type ModuleDeclarationOptions = CommonDeclarationOptions & {
    isNamespace?: boolean;
    isGlobal?: boolean;
};

export type NamespaceOptions = CommonDeclarationOptions & {};

export type InterfaceOptions = CommonDeclarationOptions & {
    inherits?: HeritageClause[];
    parameters?: TypeParameterDeclaration[];
};

export type EnumOptions = CommonDeclarationOptions & {};

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

/**
 * @summary creates an InterfaceDeclaration
 * @param factory compiler factory to use
 * @param name identifier to create the interface with
 * @param members list of interface members to add
 * @param options factory configuration
 */
export const createInterface = (
    factory: NodeFactory,
    name: string | Identifier,
    members: TypeElement[],
    {
        exported = false,
        isAmbient = false,
        inherits = [],
        parameters = [],
    }: InterfaceOptions = {}
) => {
    const modifiers: Modifier[] = [];
    if (exported)
        modifiers.push(factory.createModifier(ts.SyntaxKind.ExportKeyword));
    if (isAmbient)
        modifiers.push(factory.createModifier(ts.SyntaxKind.DeclareKeyword));

    return factory.createInterfaceDeclaration(
        undefined,
        modifiers,
        name,
        parameters,
        inherits,
        members
    );
};

/**
 * @summary creates a EnumDeclaration
 * @param factory compiler factory to use
 * @param name identifier to create the enum with
 * @param members list of enum members to add
 * @param options factory configuration
 */
export const createEnum = (
    factory: NodeFactory,
    name: string | Identifier,
    members: EnumMember[],
    {
        exported = false,
        isAmbient = false,
    }: EnumOptions = {}) => {
    const modifiers: Modifier[] = [];
    if (exported)
        modifiers.push(factory.createModifier(ts.SyntaxKind.ExportKeyword));
    if (isAmbient)
        modifiers.push(factory.createModifier(ts.SyntaxKind.DeclareKeyword));

    return factory.createEnumDeclaration(
        undefined,
        modifiers,
        name,
        members
    );
};