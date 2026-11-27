import 'dotenv/config';

const secret = process.env.JWT_SECRET;
if (!secret?.trim()) {
  throw new Error('JWT_SECRET es obligatorio. Configura un secreto local antes de arrancar la API.');
}

export const JWT_SECRET = secret;
