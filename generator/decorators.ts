import type { Node } from "typescript";
import ts from "typescript";

export type MultilineTriviaOptions = {
    trailingNewline?: boolean;
};

/**
 * @summary adds a leading multiline comment to a {@link Node}
 * @param node node to prepend comment to
 * @param comment text of the multiline comment
 * @param options multiline comment configuration
 */
export const prependMultilineComment = <T extends Node>(
    node: T,
    comment: string,
    { trailingNewline = true }: MultilineTriviaOptions = {}
) => {
    const multilineJSDocNormalizedText = comment
        .split(/\r?\n/)
        .map((line) => ` * ${line}`)
        .join("\n");

    return ts.addSyntheticLeadingComment<T>(
        node,
        ts.SyntaxKind.MultiLineCommentTrivia,
        `*\n${multilineJSDocNormalizedText}\n `,
        trailingNewline
    );
};