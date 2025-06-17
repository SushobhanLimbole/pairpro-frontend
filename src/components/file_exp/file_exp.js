import styles from './file_exp.module.css';

export default function FileExp({ sidebarWidth, files, selectedFile }) {

    console.log('file explorer called ', sidebarWidth);

    return (
        <div style={{
            width: `${sidebarWidth}%`
        }} className={styles.files}>
            <h2>File Explorer</h2>
            <div className={styles.divider}></div>
            {/* {
                files.map((ele,index) => index === selectedFile ? <div className={styles.selectedFile}>index.js</div> : <div className={styles.file}>server.js</div>)
            } */}
            <div className={styles.selectedFile}>index.js</div>
            <div className={styles.file}>server.js</div>
        </div>
    )
}
