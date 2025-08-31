const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET - Obtener todos los pedidos
router.get('/', async (req, res) => {
    try {
        const { estado, fecha_desde, fecha_hasta, cliente } = req.query;
        
        let query = 'SELECT * FROM pedidos WHERE 1=1';
        const values = [];
        let paramCount = 0;

        // Filtros opcionales
        if (estado) {
            paramCount++;
            query += ` AND estado = $${paramCount}`;
            values.push(estado);
        }

        if (cliente) {
            paramCount++;
            query += ` AND cliente ILIKE $${paramCount}`;
            values.push(`%${cliente}%`);
        }

        if (fecha_desde) {
            paramCount++;
            query += ` AND fecha >= $${paramCount}`;
            values.push(fecha_desde);
        }

        if (fecha_hasta) {
            paramCount++;
            query += ` AND fecha <= $${paramCount}`;
            values.push(fecha_hasta);
        }

        query += ' ORDER BY fecha DESC';

        const result = await pool.query(query, values);
        
        // Parsear los JSON strings de pedidos y bebidas
        const pedidosFormatted = result.rows.map(pedido => ({
            ...pedido,
            pedidos: pedido.pedidos ? JSON.parse(pedido.pedidos) : [],
            bebidas: pedido.bebidas ? JSON.parse(pedido.bebidas) : []
        }));

        res.json({
            success: true,
            data: pedidosFormatted,
            total: result.rows.length
        });
    } catch (err) {
        console.error('Error obteniendo pedidos:', err);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los pedidos',
            error: err.message
        });
    }
});

// GET - Obtener un pedido por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        const pedido = {
            ...result.rows[0],
            pedidos: result.rows[0].pedidos ? JSON.parse(result.rows[0].pedidos) : [],
            bebidas: result.rows[0].bebidas ? JSON.parse(result.rows[0].bebidas) : []
        };

        res.json({
            success: true,
            data: pedido
        });
    } catch (err) {
        console.error('Error obteniendo pedido:', err);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el pedido',
            error: err.message
        });
    }
});

// POST - Crear nuevo pedido
router.post('/', async (req, res) => {
    try {
        const { cliente, pedidos, bebidas, direccion, total } = req.body;

        // Validaciones
        if (!cliente || !pedidos || !direccion) {
            return res.status(400).json({
                success: false,
                message: 'Cliente, pedidos y dirección son obligatorios'
            });
        }

        if (!Array.isArray(pedidos) || pedidos.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Debe incluir al menos un plato en el pedido'
            });
        }

        // Calcular total automáticamente si no se proporciona
        let calculatedTotal = total;
        if (!calculatedTotal) {
            const platosIds = pedidos.map(p => p.id);
            const bebidasIds = bebidas && Array.isArray(bebidas) ? bebidas.map(b => b.id) : [];
            const allIds = [...platosIds, ...bebidasIds];

            if (allIds.length > 0) {
                const menuResult = await pool.query(
                    'SELECT id, precio FROM menu WHERE id = ANY($1)',
                    [allIds]
                );

                calculatedTotal = 0;
                menuResult.rows.forEach(item => {
                    const pedidoItem = pedidos.find(p => p.id === item.id);
                    const bebidaItem = bebidas && bebidas.find(b => b.id === item.id);
                    
                    if (pedidoItem) {
                        calculatedTotal += item.precio * (pedidoItem.cantidad || 1);
                    }
                    if (bebidaItem) {
                        calculatedTotal += item.precio * (bebidaItem.cantidad || 1);
                    }
                });
            }
        }

        const query = `
            INSERT INTO pedidos (cliente, pedidos, bebidas, direccion, total, fecha, estado) 
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'pendiente') 
            RETURNING *
        `;
        const values = [
            cliente,
            JSON.stringify(pedidos),
            bebidas ? JSON.stringify(bebidas) : null,
            direccion,
            calculatedTotal || 0
        ];

        const result = await pool.query(query, values);
        
        // Formatear respuesta
        const pedidoCreado = {
            ...result.rows[0],
            pedidos: JSON.parse(result.rows[0].pedidos),
            bebidas: result.rows[0].bebidas ? JSON.parse(result.rows[0].bebidas) : []
        };

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: pedidoCreado
        });
    } catch (err) {
        console.error('Error creando pedido:', err);
        res.status(500).json({
            success: false,
            message: 'Error al crear el pedido',
            error: err.message
        });
    }
});

// PUT - Actualizar estado del pedido
router.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['pendiente', 'preparando', 'en_camino', 'entregado', 'cancelado'];
        
        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                message: `Estado debe ser uno de: ${estadosValidos.join(', ')}`
            });
        }

        const query = 'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *';
        const result = await pool.query(query, [estado, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        const pedidoActualizado = {
            ...result.rows[0],
            pedidos: JSON.parse(result.rows[0].pedidos),
            bebidas: result.rows[0].bebidas ? JSON.parse(result.rows[0].bebidas) : []
        };

        res.json({
            success: true,
            message: 'Estado del pedido actualizado exitosamente',
            data: pedidoActualizado
        });
    } catch (err) {
        console.error('Error actualizando pedido:', err);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar el pedido',
            error: err.message
        });
    }
});

// DELETE - Eliminar pedido (solo si está en estado 'pendiente')
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el pedido existe y su estado
        const checkResult = await pool.query('SELECT estado FROM pedidos WHERE id = $1', [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Pedido no encontrado'
            });
        }

        if (checkResult.rows[0].estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden eliminar pedidos en estado pendiente'
            });
        }

        const result = await pool.query('DELETE FROM pedidos WHERE id = $1 RETURNING *', [id]);

        res.json({
            success: true,
            message: 'Pedido eliminado exitosamente',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error eliminando pedido:', err);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar el pedido',
            error: err.message
        });
    }
});

module.exports = router;