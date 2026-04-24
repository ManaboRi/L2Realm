import styles from './ServerCardSkeleton.module.css';

export function ServerCardSkeleton() {
  const b = `${styles.bone} `;
  return (
    <div className={styles.row}>
      <div className={`${styles.icon} ${styles.bone}`} />
      <div className={styles.main}>
        <div className={styles.nameRow}>
          <div className={b + styles.name} />
          <div className={b + styles.tag1} />
          <div className={b + styles.tag2} />
        </div>
        <div className={b + styles.desc} />
      </div>
      <div className={styles.right}>
        <div className={b + styles.date} />
        <div className={b + styles.meta} />
        <div className={styles.btns}>
          <div className={b + styles.btn1} />
          <div className={b + styles.btn2} />
        </div>
      </div>
    </div>
  );
}
