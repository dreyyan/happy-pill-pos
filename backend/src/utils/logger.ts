// ? [HELPER] Logs an error message
const error = async (message: string) => {
    console.error(`[ERROR] ${message}`)
}

// ? [HELPER] Logs a warning message
const warn = async (message: string) => {
    console.error(`[WARN] ${message}`)
}

// ? [HELPER] Logs an information message
const info = async (message: string) => {
    console.error(`[INFO] ${message}`)
}

export { error, warn, info };