"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ZombieCheck() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Every time the user navigates to a new page, ping the server to check if their account was deleted
    let isMounted = true;
    
    fetch('/api/auth/check-zombie')
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.isZombie) {
          // If deleted, force browser to redirect to the logout API
          // This destroys the cookies and breaks the infinite loop gracefully
          window.location.href = '/api/logout'
        }
      })
      .catch(err => console.error("Zombie check failed:", err))
      
    return () => {
      isMounted = false;
    }
  }, [pathname])
  
  return null // This is an invisible watcher component
}
