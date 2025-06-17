import { useRef } from 'react';
import styles from './output_panel.module.css';

export default function OutputPanel({ panelHeight, handlePanelHeight, output, handleOutputPanel }) {

    console.log('output panel called ',panelHeight);
    
    const panelRef = useRef(null);
    const isDragging = useRef(false);

    const startDrag = (e) => {
        isDragging.current = true;
        document.body.style.cursor = 'row-resize';
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', stopDrag);
    };

    const handleDrag = (e) => {
        if (isDragging.current) {
            const newHeight = window.innerHeight - e.clientY;
            handlePanelHeight(newHeight > 200 ? newHeight : 200); // minimum height = 100px
        }
    };

    const stopDrag = () => {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', stopDrag);
    };

    return (
        <div
            ref={panelRef}
            className={styles.outputPanel}
            style={{ height: `${panelHeight}px` }}
        >
            <div className={styles.resizeHandle} onMouseDown={startDrag}></div>
            <div className={styles.outputHeader}>
                <strong className={styles.outputTitle}>Output:</strong>
                <span
                    className={styles.outputClose}
                    onClick={() => handleOutputPanel(false)}
                >
                    &times;
                </span>
            </div>
            <pre className={styles.outputContent}>{output}</pre>
        </div>
    );
}