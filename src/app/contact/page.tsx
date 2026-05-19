"use client";

import Header from "@/components/Header/Header";
import { MessageCircle, Mail } from "lucide-react";
import styles from "./contact.module.scss";

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <h1 className={styles.title}>Связаться с нами</h1>
        <p className={styles.desc}>
          Баги, предложения, сотрудничество, авторские права — по любым вопросам.
        </p>

        <div className={styles.buttons}>
          <a
            href="https://t.me/puiiiok686"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
          >
            <MessageCircle size={18} />
            @puiiiok686
          </a>
          <a
            href="mailto:puiiiokiq@gmail.com"
            className={styles.btn}
          >
            <Mail size={18} />
            puiiiokiq@gmail.com
          </a>
        </div>

        <p className={styles.alt}>
          Также: Discord <span className={styles.tag}>@puiiiok686</span> · puiiiokiq@ro.ru
        </p>
      </main>
    </>
  );
}
