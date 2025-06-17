import { useState, useEffect, useRef } from "react";
import { socket } from "../../socket";
import axios from "axios";
import * as monaco from "monaco-editor";
import EditorNavbar from "../../components/editor_navbar/editor_navbar";
import OutputPanel from "../../components/output_panel/output_panel";
import CodeEditor from "../../components/code_editor/code_editor";
import { useParams } from "react-router-dom";
import useWebRTC from "../../hooks/useWebRTC";
import VideoPlayer from "../../components/video_player/video_player";

export default function EditorPage() {

    const { roomId } = useParams();
    const [editorRef, setEditorRef] = useState(null);
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
        isScreenSharing,
        isRemoteConnected,
    } = useWebRTC(roomId);


    const getVersion = (lang) => {
        const versions = {
            python: "3.10.0",
            java: "15.0.2",
            javascript: "18.15.0",
        };
        return versions[lang] || "3.10.0";
    };

    const setRefEditor = (editor) => {
        console.log('set editor called');
        setEditorRef(editor);
    }

    const handleLanguage = (lang) => {
        console.log('handle lang called ', lang);
        setLanguage(lang);
    }

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

        // socket.emit("join-room", roomId);

        socket.on("code-change", (newCode) => {
            console.log('code-change got');
            setCode(newCode);
        });

        socket.on("cursor-change", ({ socketId, cursorData }) => {
            console.log('code-change got');
            if (editorRef) {
                const decoration = editorRef.deltaDecorations(
                    remoteCursors[socketId]?.decorations || [],
                    [
                        {
                            range: new monaco.Range(
                                cursorData.position.lineNumber,
                                cursorData.position.column,
                                cursorData.position.lineNumber,
                                cursorData.position.column
                            ),
                            options: {
                                className: "remote-cursor",
                                after: {
                                    content: "\u00a0",
                                    inlineClassName: "remote-cursor-label",
                                },
                            },
                        },
                    ]
                );

                setRemoteCursors((prev) => ({
                    ...prev,
                    [socketId]: { ...cursorData, decorations: decoration },
                }));
            }
        });

        socket.on("user-left", (socketId) => {
            if (editorRef && remoteCursors[socketId]?.decorations) {
                editorRef.deltaDecorations(remoteCursors[socketId].decorations, []);
                setRemoteCursors((prev) => {
                    const updated = { ...prev };
                    delete updated[socketId];
                    return updated;
                });
            }
        });

        console.log(code);


        return () => {
            socket.off("code-change");
            socket.off("cursor-change");
            socket.off("user-left");
        };
    });

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
                { /* <video
                    src={vid}
                    width="320"
                    height="180"
                    autoPlay
                    muted
                    style={{ display: "block", width: "100%", height: "100%" }}
                /> */ }
            </div>


            <CodeEditor
                code={code}
                language={language}
                roomId={roomId}
                handleCode={handleCode}
                setRefEditor={setRefEditor}
                outputPanel={outputPanel}
                socket={socket}
            />

            {
                outputPanel ? <OutputPanel panelHeight={panelHeight} handlePanelHeight={handlePanelHeight} output={output} handleOutputPanel={handleOutputPanel} /> : <></>
            }

        </section>
    );
}
