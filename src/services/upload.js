const CLOUD_NAME = 'dcp1toegj';
const UPLOAD_PRESET = 'dareverse_uploads';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const Cloudinary = {
    /**
     * Compress an image file using canvas before upload
     * Returns a Blob
     */
    compressImage(file, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Scale down if wider than maxWidth
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        resolve(blob || file);
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    },

    /**
     * Upload a file to Cloudinary
     */
    async upload(file, folder = 'proofs', onProgress = null) {
        if (file.size > MAX_SIZE) {
            throw new Error(`File too large! Max ${Math.round(MAX_SIZE / 1024 / 1024)}MB.`);
        }

        let uploadFile = file;
        if (file.type.startsWith('image/')) {
            uploadFile = await this.compressImage(file);
        }

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', `dareverse/${folder}`);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', UPLOAD_URL);

            if (onProgress) {
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round((e.loaded / e.total) * 100);
                        onProgress(pct);
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    resolve({
                        url: data.secure_url,
                        publicId: data.public_id,
                        width: data.width,
                        height: data.height
                    });
                } else {
                    reject(new Error('Upload failed: ' + xhr.statusText));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    },

    /**
     * Upload a profile image (auto-crops to square, smaller size)
     */
    async uploadAvatar(file) {
        const compressed = await this.compressImage(file, 400, 0.8);
        
        const formData = new FormData();
        formData.append('file', compressed);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'dareverse/avatars');

        const response = await fetch(UPLOAD_URL, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Avatar upload failed');
        const data = await response.json();
        return data.secure_url;
    }
};
export default Cloudinary;
