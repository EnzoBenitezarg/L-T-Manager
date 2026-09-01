import './globals.css';

export const metadata = {
  title: 'L&T Manager',
  description: 'Sistema de gestión para tu negocio — clientes, turnos y pagos en un solo lugar.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
