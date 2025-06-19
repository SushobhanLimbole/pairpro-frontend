import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";

export default function CodeEditor({ handleCode, setRefEditor, language, code, socket, roomId }) {

    console.log('editor called');

    const [fontSize, setFontSize] = useState(14);

    const mountLanguages = (editor, monaco) => {

        setRefEditor(editor);

        let suppressChange = false;

        editor.onDidChangeModelContent((e) => {
            if (suppressChange) {
                console.log("[SKIP] Suppressing change from remote edit");
                suppressChange = false;
                return;
            }

            const changes = e.changes.map(change => ({
                range: {
                    startLineNumber: change.range.startLineNumber,
                    startColumn: change.range.startColumn,
                    endLineNumber: change.range.endLineNumber,
                    endColumn: change.range.endColumn
                },
                text: change.text
            }));

            const payload = {
                roomId,
                code: {
                    from: socket.id,
                    changes
                }
            };

            console.log("[EMIT] code-change:", payload);
            socket.emit("code-change", payload);
        });

        // Allow EditorPage to access suppressChange
        window.setEditorSuppressChange = (value) => {
            suppressChange = value;
        };

        editor.onDidChangeCursorPosition((e) => {
            const cursorData = {
                lineNumber: e.position.lineNumber,
                column: e.position.column
            };

            const payload = {
                roomId,
                cursorData
            };

            console.log("[EMIT] cursor-change:", payload);

            socket.emit("cursor-change", payload);
        });

        editor.onDidChangeCursorPosition((e) => {
            const position = e.position;

            socket.emit("cursor-change", {
                roomId,
                socketId: socket.id,
                cursorData: position
            });
        });

        // Python completion
        monaco.languages.register({ id: "python" });
        monaco.languages.setMonarchTokensProvider("python", {
            keywords: ["def", "return", "if", "else", "elif", "while", "for", "import", "from"],
            tokenizer: {
                root: [
                    [/\b(def|return|if|else|elif|while|for|import|from)\b/, "keyword"],
                    [/[A-Za-z_]\w*/, "identifier"],
                    [/\d+/, "number"],
                    [/".*?"/, "string"],
                    [/#.*/, "comment"],
                ],
            },
        });
        monaco.languages.registerCompletionItemProvider("python", {
            provideCompletionItems: () => ({
                suggestions: [
                    {
                        label: "print",
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: 'print("$1")',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Print to console",
                    },
                    {
                        label: "def",
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: "def ${1:func}():\n\t$0",
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Function definition",
                    },
                ],
            }),
        });

        // Java completion
        monaco.languages.register({ id: "java" });
        monaco.languages.setMonarchTokensProvider("java", {
            keywords: ["public", "class", "static", "void", "main", "String", "int", "double", "if", "else"],
            tokenizer: {
                root: [
                    [/\b(public|class|static|void|main|String|int|double|if|else)\b/, "keyword"],
                    [/[A-Za-z_]\w*/, "identifier"],
                    [/\d+/, "number"],
                    [/".*?"/, "string"],
                    [/\/\/.*$/, "comment"],
                ],
            },
        });
        monaco.languages.registerCompletionItemProvider("java", {
            provideCompletionItems: () => ({
                suggestions: [
                    {
                        label: "System.out.println",
                        kind: monaco.languages.CompletionItemKind.Method,
                        insertText: 'System.out.println("$1");',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Print to console",
                    },
                    {
                        label: "main",
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            "public static void main(String[] args) {",
                            "\t$0",
                            "}"
                        ].join("\n"),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: "Main method",
                    },
                ],
            }),
        });
    }

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                setFontSize(prev => Math.min(prev + 1, 40)); // Limit to max 40
            } else if (e.ctrlKey && e.key === '-') {
                e.preventDefault();
                setFontSize(prev => Math.max(prev - 1, 10)); // Limit to min 10
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <Editor
            height="95vh"
            width="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={(value) => {
                handleCode(value || "");
            }}
            onMount={(edit, mon) => mountLanguages(edit, mon)}
            options={{
                quickSuggestions: true,
                wordBasedSuggestions: true,
                autoClosingBrackets: "always",
                autoIndent: "full",
                fontSize: fontSize
            }}
        />
    )
}
