import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    window.location.replace('/portfolio.html')
  }, [])
  return null
}
