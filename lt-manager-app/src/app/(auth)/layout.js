import styles from './layout.module.css';

export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }) {
  return <div className={styles.shell}>{children}</div>;
}
