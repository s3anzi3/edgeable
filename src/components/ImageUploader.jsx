import { useEffect, useState } from 'react';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ImageUploader({ value, onChange, existingUrl }) {
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) {
      onChange(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('File must be an image.');
      onChange(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be smaller than 5 MB.');
      onChange(null);
      return;
    }
    onChange(file);
  };

  const showImage = previewUrl || existingUrl;

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
      />
      {error && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {showImage && (
        <div className="mt-3">
          <img
            src={showImage}
            alt="Proof preview"
            className="block max-h-80 max-w-full rounded-md border border-border"
          />
          {previewUrl && existingUrl && (
            <div className="mt-1.5 text-xs text-muted-foreground">
              New image will replace the existing one on save.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
