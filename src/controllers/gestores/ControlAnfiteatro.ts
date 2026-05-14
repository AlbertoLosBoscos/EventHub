import { Request, Response } from 'express';
import {supabase} from '../../supabase'


const tablaAnfiteatro = 'BDAnfiteatro';

export const verAnfiteatros = async (req: Request, res: Response) => {
    try {
        const { data } = await supabase
            .from(tablaAnfiteatro)
            .select('*')


        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const crearAnfiteatro = async (req: Request, res: Response) => {
    const { piso, precio, precioVips, filas, columnas, coordenadasVacias, coordenadasVips, sitioID } = req.body;

    if ( !piso || !precio || !filas || !columnas ) {
        res.status(400).json({ error: 'Faltan campos' });
        return;
    }

    try {
        const objetoInsert = {
            piso,
            precio,
            precioVips, 
            filas,
            columnas,
            coordenadasVacias, 
            coordenadasVips,
            sitioID
        };

        const { data, error } = await supabase
            .from(tablaAnfiteatro)
            .insert(objetoInsert)
            .select() 
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'Anfiteatro creado con éxito', data });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al insertar en la base de datos' });
    }
};