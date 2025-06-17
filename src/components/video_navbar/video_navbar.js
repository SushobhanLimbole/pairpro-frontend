import styles from './video_navbar.module.css'

export default function VideoNavbar({ roomId }) {
  return (
    <div className={styles.navbar}>
        <div className={styles.leftSection}>
          <h2 className={styles.title}>Pairpro</h2>
        </div>
        <h2 className={styles.roomTitle} >Room Id: {roomId}</h2>
      </div>
  )
}
