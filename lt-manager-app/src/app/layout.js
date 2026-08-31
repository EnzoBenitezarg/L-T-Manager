import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import styles from './layout.module.css';

export const metadata = {
  title: 'L&T Manager',
  description: 'Sistema de gestión para tu negocio — clientes, turnos y pagos en un solo lugar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={styles.body}>
        <Sidebar />
        <main className={styles.main}>
          {children}
        </main>
      </body>
    </html>
  );
}
