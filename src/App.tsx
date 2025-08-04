import { BrowserRouter, Route, Routes } from 'react-router'

import { Toaster } from './components/ui/sonner'
import { AuthenticatedLayout } from './layouts/authenticated'
import { ROUTES } from './lib/constants'
import { LoginPage } from './pages/login'
import { RoomPage } from './pages/room'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route element={<AuthenticatedLayout />}>
          <Route path={ROUTES.room} element={<RoomPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  )
}
