import { useState, useRef } from 'react';
import { uploadImage } from '../lib/api';

export default function ImageUpload({ currentUrl, onUpload, label = 'Logo', size = 'md' }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const resolveUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      const data = await uploadImage(file);
      onUpload(data.url);
    } catch (err) {
      setError('Upload failed. Try again.');
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const imgSize = size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';
  const resolved = resolveUrl(preview);

  return (
    <div className="flex items-center gap-4">
      {/* Preview circle */}
      <div className={`${imgSize} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0`}>
        {resolved ? (
          <img src={resolved} alt={label} className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-400 text-xs text-center px-1">{label[0]}</span>
        )}
      </div>

      {/* Upload button */}
      <div>
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded disabled:opacity-50">
          {uploading ? 'Uploading...' : `Upload ${label}`}
        </button>
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        {resolved && !uploading && (
          <button type="button" onClick={() => { setPreview(null); onUpload(''); }}
            className="block text-slate-500 hover:text-red-400 text-xs mt-1">
            Remove
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFile} className="hidden" />
    </div>
  );
}