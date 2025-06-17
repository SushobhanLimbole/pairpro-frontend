import { useNavigate } from 'react-router-dom';
import styles from './editor_navbar.module.css';
import { FaArrowLeft, FaUpload } from 'react-icons/fa';
import { useState } from 'react';

export default function EditorNavbar({ handleLanguage, language, runCode, code }) {

    console.log('editor navbar called');

    const navigate = useNavigate();

    const [showDialog, setShowDialog] = useState(false);
    const [fileName, setFileName] = useState('');

    const getExtension = (lang) => {
        switch (lang) {
            case 'python':
                return 'py';
            case 'java':
                return 'java';
            case 'javascript':
                return 'js';
            default:
                return 'txt';
        }
    };

    const handleExport = () => {
        if (!fileName) return;

        const extension = getExtension(language);
        const fullName = `${fileName}.${extension}`;

        const blob = new Blob([code], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fullName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setShowDialog(false);
        setFileName('');
    };

    return (
        <>
            <div className={styles.navbar}>
                <div className={styles.leftSection}>
                    <button className={styles.backButton} onClick={() => navigate(-1)}>
                        <FaArrowLeft />
                    </button>
                    <h2 className={styles.title}>Pairpro</h2>
                    <select
                        onChange={(e) => handleLanguage(e.target.value)}
                        value={language}
                        className={styles.select}
                    >
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="javascript">JavaScript</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className={styles.button} onClick={runCode}>
                        <i className="fas fa-play" style={{ marginRight: '6px' }}></i> Run Code
                    </button>
                    <button className={styles.button} onClick={() => setShowDialog(true)}>
                        <FaUpload style={{ marginRight: '6px' }} />
                        Export
                    </button>
                </div>
            </div>

            {showDialog && (
                <div className={styles.dialogOverlay}>
                    <div className={styles.dialogBox}>
                        <h3>Name your file</h3>
                        <input
                            type="text"
                            placeholder="Enter filename"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className={styles.input}
                        />
                        <div style={{ marginTop: '10px', textAlign: 'right' }}>
                            <button onClick={() => setShowDialog(false)} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button onClick={handleExport} className={styles.doneBtn}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
