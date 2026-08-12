import { defineEventHandler, readMultipartFormData, createError } from 'h3';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomBytes } from 'node:crypto';

export default defineEventHandler(async (event) => {
  if (event.node.req.method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' });
  }

  const formData = await readMultipartFormData(event);
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' });
  }

  const fileItem = formData.find((item) => item.name === 'image' || item.filename);
  if (!fileItem || !fileItem.data || !fileItem.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No image file found in upload' });
  }

  const mimeType = fileItem.type || 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    throw createError({ statusCode: 400, statusMessage: 'Only image files are allowed' });
  }

  // Generate unique filename
  const ext = extname(fileItem.filename) || '.jpg';
  const uniqueName = `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;

  // Save to public/uploads/
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, uniqueName), fileItem.data);

  return {
    success: true,
    url: `/uploads/${uniqueName}`,
    filename: uniqueName,
  };
});
