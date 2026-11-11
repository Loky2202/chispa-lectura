import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Backdrop, LoadingScreen } from './components/Chrome'
import { useStore } from './lib/store'
import { GaragePage } from './pages/Garage'
import { LessonPage } from './pages/Lesson'
import { MapPage } from './pages/Map'
import { ParentsPage } from './pages/Parents'
import { ProfilesPage } from './pages/Profiles'
import { WorldPage } from './pages/World'

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useStore((state) => state.profile)
  if (!profile) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const init = useStore((state) => state.init)
  const ready = useStore((state) => state.ready)

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return (
      <>
        <Backdrop />
        <LoadingScreen />
      </>
    )
  }

  return (
    <>
      <Backdrop />
      <Routes>
        <Route path="/" element={<ProfilesPage />} />
        <Route
          path="/mapa"
          element={
            <RequireProfile>
              <MapPage />
            </RequireProfile>
          }
        />
        <Route
          path="/mundo/:worldId"
          element={
            <RequireProfile>
              <WorldPage />
            </RequireProfile>
          }
        />
        <Route
          path="/leccion/:lessonId"
          element={
            <RequireProfile>
              <LessonPage />
            </RequireProfile>
          }
        />
        <Route
          path="/garaje"
          element={
            <RequireProfile>
              <GaragePage />
            </RequireProfile>
          }
        />
        <Route path="/padres" element={<ParentsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
