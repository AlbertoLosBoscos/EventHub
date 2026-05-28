import { Request, Response } from 'express';
import { supabaseAdmin } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

export const subirImagenEvento = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No se envió ninguna imagen' });
      return;
    }

    const ext = file.originalname.split('.').pop() || 'png';
    const fileName = `eventos/${uuidv4()}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('eventos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('eventos')
      .getPublicUrl(fileName);

    res.json({ url: urlData.publicUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
