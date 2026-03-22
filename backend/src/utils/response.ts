// ? [HELPER] Standardizes a success response
const successResponse = <T = unknown>(message: string, data?: T) => ({
    success: true,
    message: `[SUCCESS] ${message}`,
    data
})

// ? [HELPER] Standardizes an error response
const errorResponse = <T = unknown>(message: string, data?: T) => ({
    success: false,
    message: `[ERROR] ${message}`,
    data
})

export { successResponse, errorResponse };