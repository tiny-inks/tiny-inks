import '../globals.css';
import './staff.css';
import RegisterSW from '@/components/staff/RegisterSW';

export const metadata = {
  title: 'Tiny Inks · Print desk',
  robots: { index: false, follow: false },
  manifest: '/staff/manifest.webmanifest',
  icons: { icon: '/staff/icon-192.png', apple: '/staff/icon-192.png' },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Print desk' },
};
export const viewport = { themeColor: '#26272B', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

/* Own root layout: the staff PWA is not part of the /en /ar storefront. */
export default function StaffLayout({ children }) {
  return (
    <html lang="en">
      <body className="staff-body">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
