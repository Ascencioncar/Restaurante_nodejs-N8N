const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET - Obtener todo el menú
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM menu ORDER BY nombre_plato');
        res.json({
            success: true,
            data: result.rows,
            total: result.rows.length
        });
    } catch (err) {
        console.error('Error obteniendo menú:', err);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el menú',
            error: err.message
        });
    }
});

// POST - Agregar nuevo plato al menú
router.post('/', async (req, res) => {
    try {
        const { nombre_plato, descripcion, precio } = req.body;

        // Validaciones
        if (!nombre_plato || !precio) {
            return res.status(400).json({
                success: false,
                message: 'Nombre del plato y precio son obligatorios'
            });
        }

        if (precio <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio debe ser mayor a 0'
            });
        }

        const query = `
            INSERT INTO menu (nombre_plato, descripcion, precio) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const values = [nombre_plato, descripcion || null, precio];

        const result = await pool.query(query, values);
        
        res.status(201).json({
            success: true,
            message: 'Plato agregado al menú exitosamente',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error agregando plato:', err);
        
        if (err.code === '23505') { // Código de error para duplicados
            res.status(409).json({
                success: false,
                message: 'Ya existe un plato con ese nombre'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al agregar plato al menú',
                error: err.message
            });
        }
    }
});

// PUT - Actualizar plato del menú
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_plato, descripcion, precio } = req.body;

        // Validaciones
        if (!nombre_plato || !precio) {
            return res.status(400).json({
                success: false,
                message: 'Nombre del plato y precio son obligatorios'
            });
        }

        const query = `
            UPDATE menu 
            SET nombre_plato = $1, descripcion = $2, precio = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4 
            RETURNING *
        `;
        const values = [nombre_plato, descripcion, precio, id];

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plato no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Plato actualizado exitosamente',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error actualizando plato:', err);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar plato',
            error: err.message
        });
    }
});

// DELETE - Eliminar plato del menú
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM menu WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Plato no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Plato eliminado exitosamente',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error eliminando plato:', err);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar plato',
            error: err.message
        });
    }
});

module.exports = router;