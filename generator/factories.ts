import type {
    EnumDeclaration,
    EnumMember,
    Expression,
    HeritageClause,
    Identifier,
    InterfaceDeclaration,
    Modifier,
    NodeFactory,
    NodeFlags,
    ParameterDeclaration,
    Statement,
    TypeElement,
    TypeNode,
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
    typeParameters?: TypeParameterDeclaration[];
};

export type InterfaceMemberOptions = {
    optional?: boolean;
};

export type ParameterOptions = {
    default?: Expression;
    optional?: boolean;
    rest?: boolean;
};

export type InterfaceMethodOptions = InterfaceMemberOptions & {
    typeParameters?: TypeParameterDeclaration[];
    parameters?: ParameterDeclaration[];
};

export type EnumOptions = CommonDeclarationOptions & {};

/**
 * @summary creates an {@link ts.ArrayTypeNode}
 * @param factory {@link ts.NodeFactory} to use
 * @param type type of elements
 */
export const createArray = (
    factory: NodeFactory,
    type: TypeNode
) => {
    return factory.createArrayTypeNode(type);
};

/**
 * @summary creates an {@link ts.UnknownKeyword} type node
 * @param factory {@link ts.NodeFactory} to use
 */
export const unknown = (factory: NodeFactory) => {
    return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
};

/**
 * @summary creates a {@link ts.StringKeyword} type node
 * @param factory {@link ts.NodeFactory} to use
 */
export const string = (factory: NodeFactory) => {
    return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
};

/**
 * @summary creates a {@link ts.ModuleDeclaration}
 * @param factory {@link ts.NodeFactory} to use
 * @param name {@link ts.Identifier} of the module
 * @param statements {@link ts.Statement}s to include
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
        typeParameters = [],
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
        typeParameters,
        inherits,
        members
    );
};

/**
 * @summary updates members of an {@link ts.InterfaceDeclaration}
 * @param factory compiler factory to use
 * @param iface interface declaration to update
 * @param members new members of the interface
 */
export const updateInterfaceMembers = (
    factory: NodeFactory,
    iface: InterfaceDeclaration,
    members: TypeElement[]
) => {
    return factory.updateInterfaceDeclaration(
        iface,
        iface.decorators,
        iface.modifiers,
        iface.name,
        iface.typeParameters,
        iface.heritageClauses,
        members
    );
};

/**
 * @summary creates a {@link ts.PropertySignature}
 * @param factory {@link ts.NodeFactory} to use
 * @param name {@link ts.Identifier} of the member
 * @param type member type
 * @param options factory configuration
 */
export const createProperty = (
    factory: NodeFactory,
    name: string | Identifier,
    type: TypeNode,
    {
        optional = false
    }: InterfaceMemberOptions = {}
) => {
    return factory.createPropertySignature(
        undefined,
        name,
        optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
        type
    );
};

/**
 * @summary creates a {@link ts.ParameterDeclaration}
 * @param factory {@link ts.NodeFactory} to use
 * @param name {@link ts.Identifier} of the parameter
 * @param type parameter type
 * @param options factory configuration
 */
export const createParameter = (
    factory: NodeFactory,
    name: string | Identifier,
    type: TypeNode | TypeElement,
    {
        default: initializer,
        optional = false,
        rest = false
    }: ParameterOptions = {}
) => {
    return factory.createParameterDeclaration(
        undefined,
        undefined,
        rest ? factory.createToken(ts.SyntaxKind.DotDotDotToken) : undefined,
        name,
        optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
        ts.isTypeElement(type) ? factory.createTypeLiteralNode([type]) : type,
        initializer
    );
};

/**
 * @summary creates a {@link ts.MethodSignature}
 * @param factory {@link ts.NodeFactory} to use
 * @param name {@link ts.Identifier} of the method
 * @param returnType return type of the method
 * @param options factory configuration
 */
export const createMethod = (
    factory: NodeFactory,
    name: string | Identifier,
    returnType: TypeNode,
    {
        optional = false,
        parameters = [],
        typeParameters = []
    }: InterfaceMethodOptions = {}
) => {
    return factory.createMethodSignature(
        undefined,
        name,
        optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
        typeParameters,
        parameters,
        returnType
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

/**
 * @summary updates members of an {@link ts.EnumDeclaration}
 * @param factory compiler {@link ts.NodeFactory} to use
 * @param node {@link ts.EnumDeclaration} to update
 * @param members list of new {@link ts.EnumMembers}
 */
export const updateEnumMembers = (
    factory: NodeFactory,
    node: EnumDeclaration,
    members: EnumMember[]
) => {
    return factory.updateEnumDeclaration(
        node,
        node.decorators,
        node.modifiers,
        node.name,
        members
    );
};

/**
 * @summary creates a {@link ts.EnumMember}
 * @param factory {@link ts.NodeFactory} to use
 * @param name {@link ts.Identifier} of the member
 * @param initializer optional member initializer
 */
export const createEnumMember = (
    factory: NodeFactory,
    name: string | Identifier,
    initializer?: string | number
) => {
    if (initializer === void 0) {
        return factory.createEnumMember(name);
    }

    const literal = typeof initializer === "string" ?
        factory.createStringLiteral(initializer) :
        factory.createNumericLiteral(initializer);

    return factory.createEnumMember(name, literal);
};

/**
 * @summary creates a {@link ts.TypeQueryNode}
 * @param factory compiler factory to use
 * @param name {@link ts.Identifier} of the type query
 */
export const createTypeQuery = (
    factory: NodeFactory,
    name: string | Identifier,
) => {
    return factory.createTypeQueryNode(
        typeof name !== "string" ? name :
            factory.createIdentifier(name)
    );
};

/**
 * @summary creates an {@link ts.IndexSignatureDeclaration}
 * @param factory {@link ts.NodeFactory} to use
 * @param parameterName {@link ts.Identifier} of the signature
 * @param signatureType signature type
 */
export const createIndexSignature = (
    factory: NodeFactory,
    parameterName: string | Identifier,
    parameterType: TypeNode,
    signatureType: TypeNode,
) => {
    const parameter = factory.createParameterDeclaration(
        undefined,
        undefined,
        undefined,
        parameterName,
        undefined,
        parameterType
    );

    return factory.createIndexSignature(
        undefined,
        undefined,
        [parameter],
        signatureType
    );
};
