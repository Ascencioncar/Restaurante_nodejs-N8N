const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const menuRoutes = require('./routes/menu');
const pedidosRoutes = require('./routes/pedidos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/menu', menuRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API de Restaurante funcionando correctamente',
        endpoints: {
            menu: {
                'GET /api/menu': 'Obtener todo el menú',
                'POST /api/menu': 'Agregar plato al menú',
                'PUT /api/menu/:id': 'Actualizar plato',
                'DELETE /api/menu/:id': 'Eliminar plato'
            },
            pedidos: {
                'GET /api/pedidos': 'Obtener todos los pedidos',
                'GET /api/pedidos/:id': 'Obtener pedido por ID',
                'POST /api/pedidos': 'Crear nuevo pedido',
                'PUT /api/pedidos/:id/estado': 'Actualizar estado del pedido',
                'DELETE /api/pedidos/:id': 'Eliminar pedido (solo pendientes)'
            }
        }
    });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Iniciar servidor
const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        await testConnection();
        
        app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`📖 Documentación: http://localhost:${PORT}/`);
        });
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
};

startServer();