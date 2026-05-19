import { authService } from './AuthService';

interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

class UploadService {
  async uploadImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files can be uploaded');
    }

    const session = await authService.getSession();
    const token = session.getIdToken().getJwtToken();
    const apiUrl = import.meta.env.VITE_API_URL || '';

    if (!apiUrl) {
      throw new Error('VITE_API_URL is not configured');
    }

    const urlResponse = await fetch(new URL('upload-url', apiUrl).toString(), {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!urlResponse.ok) {
      throw new Error(`Failed to prepare image upload (${urlResponse.status})`);
    }

    const { uploadUrl, publicUrl } = await urlResponse.json() as UploadUrlResponse;
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload image (${uploadResponse.status})`);
    }

    return publicUrl;
  }
}

export const uploadService = new UploadService();
