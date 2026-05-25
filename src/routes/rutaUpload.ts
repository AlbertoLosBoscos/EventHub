import { Router } from 'express';
import multer from 'multer';
import { supabaseAdmin } from '../supabase';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/imagen-evento', upload.single('imagen'), async (req, res) => {
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
});

export default router;
