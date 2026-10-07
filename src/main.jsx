import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import 'antd/dist/reset.css'
import App from './App.jsx'
import { ThemeProvider, savedTheme, useTheme } from './lib/ThemeContext'
import './index.css'
import './nrg.css'

document.documentElement.dataset.theme = savedTheme()

function ThemedApp() {
  const { mode } = useTheme()
  const dark = mode === 'dark'
  return (
    <ConfigProvider
      theme={{
        algorithm: [dark ? theme.darkAlgorithm : theme.defaultAlgorithm, theme.compactAlgorithm],
        token: {
          colorPrimary: '#ce460c',
          colorInfo: '#78a7d3',
          colorSuccess: '#277552',
          colorWarning: '#8c6416',
          colorError: '#b34443',
          colorText: '#a63a0d',
          colorTextSecondary: '#85614a',
          colorTextPlaceholder: '#85614a',
          colorBgBase: '#ffffff',
          colorBgLayout: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#fff5ec',
          colorFill: 'rgba(166,58,13,0.12)',
          colorFillSecondary: 'rgba(166,58,13,0.08)',
          colorFillTertiary: 'rgba(166,58,13,0.05)',
          colorFillQuaternary: 'rgba(166,58,13,0.03)',
          colorFillAlter: '#fff5ec',
          colorBorder: '#e6ceba',
          colorBorderSecondary: '#efded0',
          borderRadius: 4,
          borderRadiusLG: 4,
          fontFamily: 'DM Sans, ui-sans-serif, system-ui, sans-serif',
          fontSize: 13,
          controlHeight: 34,
          wireframe: false,
          ...(dark ? {
            colorText: '#f2eee5', colorTextSecondary: '#bcb7ae', colorTextPlaceholder: '#a49f96',
            colorPrimary: '#ff9b63', colorBgBase: '#17181b', colorBgLayout: '#17181b',
            colorBgContainer: '#232429', colorBgElevated: '#2d2e34',
            colorBorder: '#515159', colorBorderSecondary: '#3e3f46',
            colorFill: '#ffffff1f', colorFillSecondary: '#ffffff14',
            colorFillTertiary: '#ffffff0d', colorFillQuaternary: '#ffffff08', colorFillAlter: '#2d2e34',
          } : {}),
        },
        components: {
          Button: { fontWeight: 600 },
          Card: { bodyPadding: 0, headerHeight: 48, headerFontSize: 14 },
          Input: { activeShadow: '0 0 0 2px rgba(206,70,12,0.18)' },
          Select: { activeOutlineColor: 'rgba(206,70,12,0.18)' },
          Table: {
            headerBg: dark ? '#2d2e34' : '#fff5ec',
            headerColor: dark ? '#bcb7ae' : '#85614a',
            headerSplitColor: 'transparent',
            borderColor: dark ? '#515159' : '#e6ceba',
            rowHoverBg: dark ? '#32333a' : '#fff5ec',
            bodySortBg: dark ? '#292a30' : '#fffaf5',
            cellPaddingBlockSM: 11,
            cellPaddingInlineSM: 12,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><ThemeProvider><ThemedApp /></ThemeProvider></React.StrictMode>,
)
