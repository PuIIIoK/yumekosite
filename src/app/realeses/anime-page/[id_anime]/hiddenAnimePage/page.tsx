"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import styles from "./hiddenAnimePage.module.scss";

export default function HiddenAnimePage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.content}>
          <Lock className={styles.icon} />
          <h1 className={styles.title}>Релиз недоступен</h1>
          <p className={styles.description}>
            Релиз на данный момент недоступен на сайте.
          </p>
          <Link href="/realeses" className={styles.backLink}>
            ← Вернуться к каталогу
          </Link>
        </div>
      </div>
    </main>
  );
}