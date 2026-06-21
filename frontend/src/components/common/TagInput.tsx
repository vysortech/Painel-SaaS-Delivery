import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (!raw) return '';
    if (raw.length <= 2) return `(${raw}`;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
};

interface TagInputProps {
    label: string;
    placeholder: string;
    tags: string[];
    setTags: (t: string[]) => void;
    isPhone?: boolean;
    isNumericOnly?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({ label, placeholder, tags, setTags, isPhone = false, isNumericOnly = false }) => {
  const [inputValue, setInputValue] = useState(isPhone ? '55' : '');

  const handleAdd = () => {
    if (inputValue.trim() !== '' && inputValue.trim() !== '55') {
      setTags([...tags, inputValue.trim()]);
      setInputValue(isPhone ? '55' : '');
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (isNumericOnly || isPhone) {
          val = val.replace(/\D/g, ''); // Remove tudo que não for número
      }
      if (isPhone) {
          if (!val.startsWith('55') && val.length > 0) {
              val = '55' + val;
          }
      }
      setInputValue(val);
  };

  const displayValue = isPhone ? formatPhone(inputValue.replace(/^55/, '')) : inputValue;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input 
          type="text" 
          className="flex-1 bg-[#18181b] border border-gray-700/50 rounded-lg p-2.5 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <button type="button" onClick={handleAdd} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, index) => (
            <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm">
              {isPhone ? `+55 ${formatPhone(tag.replace(/^55/, ''))}` : tag}
              <button type="button" onClick={() => handleRemove(index)} className="hover:text-emerald-300 ml-1">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
