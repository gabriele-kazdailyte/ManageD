import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div id="app">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className="main-content">
        <Outlet context={{ setCollapsed }} />
      </main>
    </div>
  )
}

export default Layout
