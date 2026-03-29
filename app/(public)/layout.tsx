import { Footer } from '@/components/layout/Footer';
import { Nav } from '@/components/layout/Nav';
import { SkipLink } from '@/components/layout/SkipLink';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <Nav />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
