// ? [HELPER] Standardizes a success response
const successResponse = async (message: string, data=null) => ({
    success: true,
    message: `[SUCCESS] ${message}`,
    data
})

// ? [HELPER] Standardizes an error response
const errorResponse = async (message: string, data=null) => ({
    success: false,
    message: `[ERROR] ${message}`,
    data
})

export { successResponse, errorResponse };