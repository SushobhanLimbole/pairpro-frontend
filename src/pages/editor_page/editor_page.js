import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import axios from "axios";
import * as monaco from "monaco-editor";
import EditorNavbar from "../../components/editor_navbar/editor_navbar";
import OutputPanel from "../../components/output_panel/output_panel";
import CodeEditor from "../../components/code_editor/code_editor";
import { useParams } from "react-router-dom";
import VideoPlayer from "../../components/video_player/video_player";
import { useWebRTCContext } from "../../utils/webRTC_context";

export default function EditorPage() {

    const { roomId } = useParams();
    const editorRef = useRef(null);
    const [remoteCursors, setRemoteCursors] = useState({});
    const [code, setCode] = useState("// Write code here...");
    const [outputPanel, setOutputPanel] = useState(false);
    const [language, setLanguage] = useState("javascript");
    const [output, setOutput] = useState("");
    const [panelHeight, setPanelHeight] = useState(30);
    console.log(roomId);

    const {
        localVideoRef,
        remoteVideoRef,
        screenVideoRef,
        toggleAudio,
        shareScreen,
        muted,
        isScreenSharing,
        isRemoteConnected,
        joinRoom
    } = useWebRTCContext();


    useEffect(() => {
        joinRoom(roomId); // Only call once
    }, [roomId]);

    const getVersion = (lang) => {
        const versions = {
            python: "3.10.0",
            java: "15.0.2",
            javascript: "18.15.0",
        };
        return versions[lang] || "3.10.0";
    };

    const handleLanguage = (lang) => {
        console.log('handle lang called ', lang);
        setLanguage(lang);
        socket.emit('language-change', { language: lang, roomId });
    };


    const handleOutputPanel = (op) => {
        console.log('handle output panel called ', op);
        setOutputPanel(op);
    }

    const handleCode = (updatedCode) => {
        console.log('handle code called');
        setCode(updatedCode);
    }

    const handlePanelHeight = (height) => {
        console.log('handle panelHeight called ', height);
        setPanelHeight(height);
    }

    const pageRef = useRef(null);
    const videoRef = useRef(null);

    const [pos, setPos] = useState({ x: 100, y: 100 });
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        dragging.current = true;
        offset.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        };
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!dragging.current || !pageRef.current || !videoRef.current) return;

        const pageRect = pageRef.current.getBoundingClientRect();
        const videoRect = videoRef.current.getBoundingClientRect();

        let newX = e.clientX - offset.current.x;
        let newY = e.clientY - offset.current.y;

        // Boundaries
        const maxX = pageRect.width - videoRect.width;
        const maxY = pageRect.height - videoRect.height;

        // Clamp values
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        dragging.current = false;
    };

    useEffect(() => {
        socket.on('get-language', (language) => {
            console.log('[Language] Language received:', language);
            setLanguage(language); // or handle accordingly
        });

        return () => {
            socket.off('get-language');
        };
    }, []);


    useEffect(() => {

        const handleCodeChange = (data) => {
            const code = data?.code || data;
            console.log("[RECEIVED] code-change:", code);

            if (!code || code.from === socket.id || !editorRef.current) {
                console.log("[SKIP] code-change from self or invalid");
                return;
            }

            const edits = code.changes.map(c => ({
                range: new monaco.Range(
                    c.range.startLineNumber,
                    c.range.startColumn,
                    c.range.endLineNumber,
                    c.range.endColumn
                ),
                text: c.text,
                forceMoveMarkers: true
            }));

            console.log("[APPLY] Executing remote edits:", edits);

            // Suppress triggering emitter on apply
            window.setEditorSuppressChange(true);
            editorRef.current.executeEdits(null, edits);

        };

        socket.off("code-change", handleCodeChange);
        socket.on("code-change", handleCodeChange);

        return () => {
            socket.off("code-change", handleCodeChange);
        };
    }, []);

    useEffect(() => {
        const handleCursor = (data) => {
            const { socketId, cursorData } = data;
            console.log("[RECEIVED] cursor-change from", socketId, ":", cursorData);

            if (socketId === socket.id || !editorRef.current) return;

            const deco = editorRef.current.deltaDecorations(
                remoteCursors[socketId]?.decorations || [],
                [{
                    range: new monaco.Range(
                        cursorData.lineNumber,
                        cursorData.column,
                        cursorData.lineNumber,
                        cursorData.column
                    ),
                    options: {
                        className: "remote-cursor",
                        after: { content: "\u00a0", inlineClassName: "remote-cursor-label" }
                    }
                }]
            );

            console.log(`[UPDATE] Cursor decorations for ${socketId}:`, deco);

            setRemoteCursors(prev => ({
                ...prev,
                [socketId]: { cursorData, decorations: deco }
            }));
        };

        socket.off("cursor-change", handleCursor);
        socket.on("cursor-change", handleCursor);

        return () => {
            socket.off("cursor-change", handleCursor);
        };
    }, [editorRef, remoteCursors]);


    const runCode = async () => {

        console.log('run code called');

        handleOutputPanel(true);

        if (!language || typeof language !== "string") {
            setOutput("Error: Language is not set or invalid.");
            return;
        }

        const version = getVersion(language);
        const requestData = {
            language: language.trim(),
            version: version,
            files: [{ content: code || "" }],
        };

        try {
            const response = await axios.post("https://emkc.org/api/v2/piston/execute", requestData);
            if (response.data.run.stderr) {
                setOutput("Error: " + response.data.run.stderr);
            } else {
                setOutput(response.data.run.output);
            }
        } catch (error) {
            if (error.response) {
                setOutput("API Error: " + JSON.stringify(error.response.data, null, 2));
            } else {
                setOutput("Error executing code. Check console for details.");
            }
        }
    };


    return (
        <section
            ref={pageRef}
            style={{
                position: "relative",
                width: "100%",
                height: "100vh",
                overflow: "hidden",
            }}>

            <EditorNavbar
                handleLanguage={handleLanguage}
                language={language}
                runCode={runCode}
                code={code}
            />

            <div
                ref={videoRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                    position: "fixed",
                    top: pos.y,
                    left: pos.x,
                    width: 320,
                    height: 180,
                    backgroundColor: "#000",
                    cursor: "grab",
                    zIndex: 1000,
                    userSelect: "none",
                    borderRadius: "8px",
                    overflow: "hidden",
                }}>
                <VideoPlayer
                    localVideoRef={localVideoRef}
                    remoteVideoRef={remoteVideoRef}
                    screenVideoRef={screenVideoRef}
                    isScreenFull={false}
                    toggleFullScreen={() => { }}
                    isScreenSharing={isScreenSharing}
                    isRemoteConnected={isRemoteConnected}
                />
            </div>


            <CodeEditor
                code={code}
                language={language}
                roomId={roomId}
                handleCode={handleCode}
                setRefEditor={(editor) => editorRef.current = editor} // ✅ Store editor in .current
                outputPanel={outputPanel}
                socket={socket}
            />

            {
                outputPanel ? <OutputPanel panelHeight={panelHeight} handlePanelHeight={handlePanelHeight} output={output} handleOutputPanel={handleOutputPanel} /> : <></>
            }

        </section>
    );
}
