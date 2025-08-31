const { Pool } = require('pg');
require('dotenv').config();

// Configuración para Vercel + Neon PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Configuración adicional para Neon
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Función para probar la conexión
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión a Neon PostgreSQL exitosa');
        console.log('🌐 Base de datos:', client.database);
        client.release();
    } catch (err) {
        console.error('❌ Error conectando a Neon PostgreSQL:', err.message);
        // No terminar el proceso en producción
        if (process.env.NODE_ENV !== 'production') {
            console.error('Stack trace:', err.stack);
        }
    }
};

// Manejo de errores del pool
pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de conexiones:', err);
});

module.exports = {
    pool,
    testConnection
};