import { redirect } from 'next/navigation';
import { getUsuario, getNegocioActivo, getMiembroActivo } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import styles from './layout.module.css';

export const dynamic = 'force-dynamic';

export default async function NegocioLayout({ children }) {
  const usuario = await getUsuario();
  if (!usuario) redirect('/login');

  const negocio = await getNegocioActivo();
  // Si no hay negocio (ni activo ni ninguno), ir al menú para elegir/crear
  if (!negocio) redirect('/home');

  const miembro = await getMiembroActivo(negocio.id);

  return (
    <div className={styles.body}>
      <Sidebar negocio={negocio} usuario={usuario} miembro={miembro} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
