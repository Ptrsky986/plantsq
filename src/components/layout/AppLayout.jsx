import { Box, Flex, IconButton } from '@chakra-ui/react'
import { NavLink, useLocation } from 'react-router-dom'
import { FiTrendingUp, FiActivity, FiList, FiSettings } from 'react-icons/fi'
import { useEffect } from 'react'

const tabs = [
  { to: '/signals2', label: 'Señales', icon: FiTrendingUp },
  { to: '/chart', label: 'Gráfica', icon: FiActivity },
  { to: '/operations', label: 'Operaciones', icon: FiList },
  { to: '/settings', label: 'Ajustes', icon: FiSettings },
]

export default function AppLayout({ children }) {
  const location = useLocation()
  const isChart = location.pathname.startsWith('/chart')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <Flex direction="row" className="app-shell" style={{ minHeight: '100dvh' }}>
      {/* Sidebar solo escritorio (>= xl) */}
      <Box as="aside" className="sidebar-modern" px={3} py={4} display={[ 'none', 'none', 'none', 'none', 'flex' ]}>
        <Box className="vertical-nav" pt={1}>
          {tabs.map(t => {
            const Icon = t.icon
            const isActive = location.pathname.startsWith(t.to)
            return (
              <NavLink key={t.to} to={t.to} style={{ textDecoration: 'none' }}>
                <Flex align="center" className={`vnav-item ${isActive ? 'is-active' : ''}`}>
                  <IconButton aria-label={t.label} title={t.label} icon={<Icon />} variant="ghost" className="vnav-icon" />
                </Flex>
              </NavLink>
            )
          })}
        </Box>
      </Box>

      <Box as="main" flex="1 1 auto" px={isChart ? 0 : [3, 4, 6]} pt={[3, 4, 6]} pb={[6, 8, 6]} className={`main-modern ${isChart ? 'main-wide' : ''}`}>
        {/* Top navigation (móvil y tablet), sticky encima de cabeceras */}
        <Flex as="nav" className="nav-modern nav-top" display={[ 'flex', 'flex', 'flex', 'flex', 'none' ]} px={2} py={2} gap={2} justify="space-between" align="stretch" mb={3} w="100%">
          {tabs.map(t => {
            const Icon = t.icon
            const isActive = location.pathname.startsWith(t.to)
            return (
              <NavLink key={`top-${t.to}`} to={t.to} style={{ textDecoration: 'none', display: 'flex', flex: '1 1 0', minWidth: 0 }}>
                <Flex direction="column" align="center" className={`nav-item ${isActive ? 'is-active' : ''}`} flex="1 1 0" minW={0}>
                  <IconButton aria-label={t.label} title={t.label} icon={<Icon />} variant="ghost" className="nav-icon" />
                  <Box as="span" className="nav-label">{t.label}</Box>
                </Flex>
              </NavLink>
            )
          })}
        </Flex>
        {children}
      </Box>
    </Flex>
  )
}
