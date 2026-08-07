import { useEffect } from 'react'

export default function App() {
  useEffect(() => {
    window.location.replace('/index.html')
  }, [])
  return null
}
