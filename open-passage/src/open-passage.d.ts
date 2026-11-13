export {}

declare global {
  interface Window {
    openPassage?: {
      importProfile: (
        clientName: 'Tunnelblick' | 'OpenVPN Connect',
        profilePath: string,
      ) => Promise<{ success: true }>
      isNative: true
    }
  }
}
