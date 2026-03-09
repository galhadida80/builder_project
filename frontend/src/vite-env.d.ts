/// <reference types="vite/client" />

interface Window {
  google?: {
    accounts?: {
      id?: {
        disableAutoSelect: () => void
        cancel: () => void
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oauth2?: any
    }
  }
}

// SVG imports
declare module '*.svg' {
  const content: string
  export default content
}

// Image imports
declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}
