import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'INCOME' | 'EXPENSE';
}

interface CategoryMultiSelectProps {
  categories: Category[];
  selectedCategories: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
}

const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
  categories,
  selectedCategories,
  onSelectionChange,
  placeholder = "Seleccionar categorías..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar categorías por búsqueda
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Categorías seleccionadas para mostrar
  const selectedCategoryObjects = categories.filter(cat => 
    selectedCategories.includes(cat.id)
  );

  const toggleCategory = (categoryId: string) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    onSelectionChange(newSelection);
  };

  const removeCategory = (categoryId: string) => {
    onSelectionChange(selectedCategories.filter(id => id !== categoryId));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input principal */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="min-h-[42px] border border-gray-300 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-gray-400 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 flex flex-wrap gap-1 min-h-[26px]">
            {selectedCategoryObjects.length === 0 ? (
              <span className="text-gray-500 text-sm py-1">{placeholder}</span>
            ) : (
              selectedCategoryObjects.map(category => (
                <span
                  key={category.id}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    category.type === 'EXPENSE' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  <span className="text-sm">{category.icon}</span>
                  <span>{category.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCategory(category.id);
                    }}
                    className="hover:bg-black/10 rounded-full p-0.5 ml-1"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            {selectedCategories.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium px-2 py-1 rounded hover:bg-gray-100"
                title="Limpiar todo"
              >
                Limpiar
              </button>
            )}
            <ChevronDown 
              size={20} 
              className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Campo de búsqueda */}
          <div className="p-3 border-b border-gray-100">
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          {/* Lista de opciones */}
          <div className="max-h-60 overflow-y-auto">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No se encontraron categorías
              </div>
            ) : (
              <>
                {/* Opción "Todas las categorías" */}
                <div
                  onClick={() => {
                    if (selectedCategories.length === categories.length) {
                      clearAll();
                    } else {
                      onSelectionChange(categories.map(cat => cat.id));
                    }
                  }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏷️</span>
                    <span className="font-medium text-gray-900">
                      {selectedCategories.length === categories.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                    </span>
                  </div>
                  {selectedCategories.length === categories.length && (
                    <Check size={16} className="text-primary" />
                  )}
                </div>

                {/* Categorías individuales */}
                {filteredCategories.map(category => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category.icon}</span>
                        <div>
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                            category.type === 'EXPENSE' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {category.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-primary" />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer con contador */}
          {selectedCategories.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <span className="text-xs text-gray-600">
                {selectedCategories.length} de {categories.length} categorías seleccionadas
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryMultiSelect;