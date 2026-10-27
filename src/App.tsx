import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { HomePage } from '@/pages/HomePage'
import { GalleryPage } from '@/pages/GalleryPage'
import { ShipPage } from '@/pages/ShipPage'
import { LaunchPage } from '@/pages/LaunchPage'
import { BuilderProfilePage } from '@/pages/BuilderProfilePage'
import { DocsPage } from '@/pages/DocsPage'
import { AdminPage } from '@/pages/AdminPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/ship" element={<ShipPage />} />
          <Route path="/p/:id" element={<LaunchPage />} />
          <Route path="/builder/:address" element={<BuilderProfilePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
