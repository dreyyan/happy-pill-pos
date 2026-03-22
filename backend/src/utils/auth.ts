import bcrypt from 'bcrypt';

// ? [HELPER] Hash password
const hashPassword = async (password: string, saltRounds: number) => {
    return await bcrypt.hash(password, saltRounds);
}

export { hashPassword };