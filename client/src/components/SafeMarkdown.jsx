import React from "react";

/**
 * Safe, zero-dependency Markdown renderer for financial AI responses.
 * Safely parses bold, bullet lists, numbered lists, subheadings, and line breaks without dangerouslySetInnerHTML.
 */
export default function SafeMarkdown({ content }) {
    if (!content) return null;

    const lines = content.split("\n");
    const elements = [];
    let currentList = null;
    let listType = null; // 'ul' or 'ol'

    function formatInline(text) {
        // Parse **bold** and `code`
        const parts = [];
        // Regex to match **bold** or `code`
        const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
        let lastIdx = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIdx) {
                parts.push(text.substring(lastIdx, match.index));
            }

            const token = match[0];
            if (token.startsWith("**") && token.endsWith("**")) {
                parts.push(
                    <strong key={match.index} className="ai-markdown-bold">
                        {token.slice(2, -2)}
                    </strong>
                );
            } else if (token.startsWith("`") && token.endsWith("`")) {
                parts.push(
                    <code key={match.index} className="ai-markdown-code">
                        {token.slice(1, -1)}
                    </code>
                );
            }
            lastIdx = regex.lastIndex;
        }

        if (lastIdx < text.length) {
            parts.push(text.substring(lastIdx));
        }

        return parts.length > 0 ? parts : text;
    }

    function flushList() {
        if (!currentList) return;
        if (listType === "ul") {
            elements.push(
                <ul key={`ul-${elements.length}`} className="ai-markdown-list">
                    {currentList.map((item, idx) => (
                        <li key={idx}>{formatInline(item)}</li>
                    ))}
                </ul>
            );
        } else if (listType === "ol") {
            elements.push(
                <ol key={`ol-${elements.length}`} className="ai-markdown-list-ordered">
                    {currentList.map((item, idx) => (
                        <li key={idx}>{formatInline(item)}</li>
                    ))}
                </ol>
            );
        }
        currentList = null;
        listType = null;
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();
        const trimmed = line.trim();

        if (!trimmed) {
            flushList();
            continue;
        }

        // Heading 3 / 4 (### or ####)
        if (trimmed.startsWith("### ")) {
            flushList();
            elements.push(
                <h4 key={`h3-${i}`} className="ai-markdown-h4">
                    {formatInline(trimmed.replace(/^###\s+/, ""))}
                </h4>
            );
            continue;
        }
        if (trimmed.startsWith("## ")) {
            flushList();
            elements.push(
                <h3 key={`h2-${i}`} className="ai-markdown-h3">
                    {formatInline(trimmed.replace(/^##\s+/, ""))}
                </h3>
            );
            continue;
        }

        // Bullet list item
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
            if (listType !== "ul") {
                flushList();
                listType = "ul";
                currentList = [];
            }
            currentList.push(bulletMatch[1]);
            continue;
        }

        // Numbered list item
        const numMatch = trimmed.match(/^\d+[.)]\s+(.*)$/);
        if (numMatch) {
            if (listType !== "ol") {
                flushList();
                listType = "ol";
                currentList = [];
            }
            currentList.push(numMatch[1]);
            continue;
        }

        // Regular paragraph text
        flushList();
        elements.push(
            <p key={`p-${i}`} className="ai-markdown-p">
                {formatInline(trimmed)}
            </p>
        );
    }

    flushList();

    return <div className="ai-markdown-container">{elements}</div>;
}
