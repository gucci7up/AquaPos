import React, { useState, useMemo } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';

// Mock Data
const initialProducts = [
  { id: 1, name: 'Premium Cotton Tee', sub: 'Latin America Edition', sku: 'APP-TSH-001', barcode: '8901234567890', category: 'Apparel', subCategory: 'Shirts', variations: ['XL', 'Navy'], stock: 142, cost: 4.50, price: 12.4550, icon: 'checkroom' },
  { id: 2, name: 'Organic Coffee Beans', sub: 'Antigua Guatemala', sku: 'GRO-BEV-882', barcode: '8909876543210', category: 'Grocery', subCategory: 'Beverages', variations: ['500g', 'Whole'], stock: 18, cost: 3.20, price: 8.2000, icon: 'coffee' },
  { id: 3, name: 'Wireless Studio Headphones', sub: 'AquaAudio Pro', sku: 'ELE-AUD-204', barcode: '4501239874561', category: 'Electronics', subCategory: 'Audio', variations: ['Matte Black'], stock: 0, cost: 22.00, price: 45.9900, icon: 'headphones' },
  { id: 4, name: 'Eco Glass Water Bottle', sub: 'Sustainable Living', sku: 'HOM-KIT-441', barcode: '7804561230123', category: 'Home', subCategory: 'Kitchen', variations: ['750ml', 'Amber'], stock: 4, cost: 1.50, price: 4.1555, icon: 'water_bottle' },
  { id: 5, name: 'Yoga Mat', sub: 'Non-slip', sku: 'FIT-GEA-001', barcode: '6001234567895', category: 'Fitness', subCategory: 'Gear', variations: ['Purple'], stock: 25, cost: 6.00, price: 15.00, icon: 'fitness_center' },
  { id: 6, name: 'Ceramic Mug', sub: 'Handcrafted', sku: 'HOM-KIT-002', barcode: '3204569871230', category: 'Home', subCategory: 'Kitchen', variations: ['Blue'], stock: 8, cost: 2.10, price: 5.50, icon: 'coffee_maker' },
];

const categoryKeys = ['Apparel', 'Grocery', 'Electronics', 'Home', 'Fitness', 'General'];

export default function Inventory() {
  const { t } = useLanguage();
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(categoryKeys);
  
  const [filterStatus, setFilterStatus] = useState('All'); // All, In Stock, Low Stock, Out of Stock
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('LastUpdated');
  
  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', sub: '', sku: '', barcode: '', category: 'General', subCategory: '', stock: 0, cost: 0, price: 0
  });

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Derived Data
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Status
    if (filterStatus === 'InStock') result = result.filter(p => p.stock > 20);
    if (filterStatus === 'LowStock') result = result.filter(p => p.stock > 0 && p.stock <= 20);
    if (filterStatus === 'OutOfStock') result = result.filter(p => p.stock === 0);

    // Filter by Category
    if (filterCategory !== 'All') result = result.filter(p => p.category === filterCategory);

    // Sort
    if (sortBy === 'Name') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Stock') result.sort((a, b) => a.stock - b.stock);
    if (sortBy === 'Price') result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, filterStatus, filterCategory, sortBy]);

  const totalValue = useMemo(() => products.reduce((acc, curr) => acc + (curr.stock * curr.cost), 0), [products]);
  const lowStockItems = useMemo(() => products.filter(p => p.stock > 0 && p.stock <= 20), [products]);

  // Generators
  const generateRandomSKU = (category: string) => {
    const prefix = category.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  };

  const generateRandomBarcode = () => {
    // Simple 13 digit EAN-13 style generator
    let result = '';
    for (let i = 0; i < 13; i++) {
        result += Math.floor(Math.random() * 10);
    }
    return result;
  };

  // Handlers
  const handleOpenModal = (product: any = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      // Auto-generate SKU and Barcode for new products
      const defaultCategory = categories[0] || 'General';
      setFormData({ 
        name: '', 
        sub: '', 
        sku: generateRandomSKU(defaultCategory), 
        barcode: generateRandomBarcode(),
        category: defaultCategory, 
        subCategory: '', 
        stock: 0, 
        cost: 0,
        price: 0 
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...formData } : p));
    } else {
      const newProduct = {
        ...formData,
        id: Date.now(),
        variations: ['Default'], // Simplified for demo
        icon: 'inventory_2'
      };
      setProducts([newProduct, ...products]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const regenerateIdentifiers = () => {
    setFormData(prev => ({
        ...prev,
        sku: generateRandomSKU(prev.category),
        barcode: generateRandomBarcode()
    }));
  };

  // Category Handlers
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
        setCategories([...categories, newCategoryName.trim()]);
        setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(`Delete category "${cat}"? Products in this category will not be deleted but may need updating.`)) {
        setCategories(categories.filter(c => c !== cat));
        if (filterCategory === cat) setFilterCategory('All');
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return 'red-500';
    if (stock <= 20) return 'amber-500';
    return 'emerald-500';
  };

  return (
    <div className="flex flex-1 flex-row h-full overflow-hidden relative">
      {/* Main Table Area */}
      <div className="flex flex-1 flex-col p-8 overflow-y-auto">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">{t('inventory.title')}</h1>
            <p className="text-slate-500">{t('inventory.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-primary"
            >
              <span className="material-symbols-outlined text-xl">category</span>
              {t('inventory.manageCategories')}
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-slate-900 shadow-sm transition-all hover:brightness-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              {t('inventory.addProduct')}
            </button>
            <div className="flex items-center gap-4 border-l border-slate-200 pl-4 ml-2">
                <UserMenu />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium hover:bg-slate-100 min-w-[160px] justify-between">
                {filterCategory === 'All' ? t('inventory.allCategories') : t(`data.categories.${filterCategory}`) || filterCategory}
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>
              {/* Simple Dropdown for Demo */}
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block z-20">
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                  <button 
                    onClick={() => setFilterCategory('All')}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50 text-slate-700 font-bold"
                  >
                    {t('inventory.allCategories')}
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-50 text-slate-700"
                    >
                      {t(`data.categories.${cat}`) || cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <FilterButton active={filterStatus === 'All'} onClick={() => setFilterStatus('All')} label={t('data.filters.All')} color="primary" />
              <FilterButton active={filterStatus === 'InStock'} onClick={() => setFilterStatus('InStock')} label={t('data.filters.InStock')} color="emerald" />
              <FilterButton active={filterStatus === 'LowStock'} onClick={() => setFilterStatus('LowStock')} label={t('data.filters.LowStock')} color="amber" />
              <FilterButton active={filterStatus === 'OutOfStock'} onClick={() => setFilterStatus('OutOfStock')} label={t('data.filters.OutOfStock')} color="red" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium">{t('inventory.sortedBy')}</span>
            <button 
              onClick={() => {
                const options = ['LastUpdated', 'Name', 'Stock', 'Price'];
                const nextIndex = (options.indexOf(sortBy) + 1) % options.length;
                setSortBy(options[nextIndex]);
              }}
              className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:text-primary transition-colors"
            >
              {t(`data.sort.${sortBy}`)}
              <span className="material-symbols-outlined text-lg">swap_vert</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.table.name')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.table.sku')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.table.category')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.table.stock')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.table.cost')}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map(product => (
                  <InventoryRow 
                    key={product.id}
                    {...product}
                    displayCategory={t(`data.categories.${product.category}`) || product.category}
                    stockColor={getStockColor(product.stock)}
                    onEdit={() => handleOpenModal(product)}
                    onDelete={() => handleDelete(product.id)}
                  />
                ))}
                {filteredProducts.length === 0 && (
                   <tr>
                     <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                       <span className="material-symbols-outlined text-4xl mb-2">inventory_2</span>
                       <p>No products found matching filters.</p>
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shrink-0">
            <div className="text-sm text-slate-500">
              Showing <span className="font-bold text-slate-900">{filteredProducts.length}</span> products
            </div>
            {/* Pagination Placeholder */}
            <div className="flex gap-2">
              <button className="flex size-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
              <button className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-slate-900">1</button>
              <button className="flex size-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 border-l border-slate-200 bg-white/50 px-6 py-8 hidden xl:block overflow-y-auto">
        <div className="sticky top-0">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </div>
            <h3 className="font-bold text-slate-900">{t('inventory.quickInsights')}</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">AquaAI</span>
          </div>
          
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.projectedStockout')}</h4>
              <span className="material-symbols-outlined text-primary text-sm">trending_down</span>
            </div>
            <div className="space-y-4">
              {lowStockItems.slice(0, 3).map(item => (
                <StockoutBar 
                  key={item.id}
                  name={item.name} 
                  days="Critical" 
                  percent={`${(item.stock / 20) * 100}%`} 
                  color={item.stock === 0 ? "bg-red-500" : "bg-amber-500"} 
                  textColor={item.stock === 0 ? "text-red-600" : "text-amber-600"} 
                />
              ))}
              {lowStockItems.length === 0 && <p className="text-xs text-slate-500">Inventory levels are healthy.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('inventory.reorderSuggestions')}</h4>
            </div>
            <div className="space-y-4">
              {products.filter(p => p.stock === 0).slice(0, 2).map(p => (
                 <div key={p.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                    <span className="material-symbols-outlined text-sm">priority_high</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{p.name}</p>
                    <p className="text-[10px] text-slate-500">Out of stock. Recommended reorder: 50 units.</p>
                    <button className="mt-2 text-[10px] font-bold text-primary underline">Express Reorder</button>
                  </div>
                </div>
              ))}
              {products.filter(p => p.stock === 0).length === 0 && <p className="text-xs text-slate-500">No urgent reorders needed.</p>}
            </div>
          </div>

          <div className="mt-8 rounded-xl bg-slate-100 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium text-slate-500">{t('inventory.totalValue')}</p>
                <p className="text-sm font-bold">${totalValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-500">{t('inventory.activeSkus')}</p>
                <p className="text-sm font-bold">{products.length}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingProduct ? t('inventory.editProduct') : t('inventory.addNewProduct')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Product Name</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                {/* SKU and Barcode Row */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">SKU</label>
                    <button onClick={() => setFormData(prev => ({...prev, sku: generateRandomSKU(prev.category)}))} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">refresh</span> Auto
                    </button>
                  </div>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none font-mono" 
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase">Barcode</label>
                    <button onClick={() => setFormData(prev => ({...prev, barcode: generateRandomBarcode()}))} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">refresh</span> Auto
                    </button>
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">barcode_scanner</span>
                    <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-8 pr-2.5 text-sm focus:border-primary outline-none font-mono" 
                        value={formData.barcode}
                        onChange={e => setFormData({...formData, barcode: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{t(`data.categories.${cat}`) || cat}</option>
                    ))}
                  </select>
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Stock</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  />
                </div>
                {/* Cost and Price Row */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit Cost ($)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                    value={formData.cost}
                    onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                  />
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Unit Price ($)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Subtext / Description</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:border-primary outline-none" 
                    value={formData.sub}
                    onChange={e => setFormData({...formData, sub: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50">{t('inventory.cancel')}</button>
              <button onClick={handleSave} className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:brightness-105 shadow-lg shadow-primary/20">{t('inventory.saveProduct')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900">{t('inventory.manageCategories')}</h3>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex gap-2 mb-6">
                        <input 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New category name..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-primary"
                        />
                        <button 
                            onClick={handleAddCategory}
                            disabled={!newCategoryName.trim()}
                            className="px-4 bg-primary text-white rounded-lg disabled:opacity-50 hover:brightness-105"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {categories.map(cat => (
                            <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-sm font-bold text-slate-700">{t(`data.categories.${cat}`) || cat}</span>
                                <button onClick={() => handleDeleteCategory(cat)} className="text-slate-400 hover:text-red-500">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

const FilterButton = ({ active, onClick, label, color }: any) => {
  const colorMap: any = {
    primary: 'text-primary ring-primary/30 bg-primary/10',
    emerald: 'text-emerald-600 ring-emerald-600/20 bg-green-50',
    amber: 'text-amber-600 ring-amber-600/20 bg-amber-50',
    red: 'text-red-600 ring-red-600/20 bg-red-50'
  };

  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ring-1 ring-inset transition-all ${
        active 
          ? colorMap[color] + ' shadow-sm' 
          : 'text-slate-500 ring-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
};

const InventoryRow = ({ icon, name, sub, sku, barcode, displayCategory, subCategory, variations, stock, stockColor, cost, price, onEdit, onDelete }: any) => (
  <tr className="group hover:bg-slate-50 transition-colors">
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center border border-gray-200 text-slate-400">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div>
          <div className="font-bold text-slate-900">{name}</div>
          <div className="text-xs text-slate-500">{sub}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="font-mono text-xs text-slate-700 font-bold">{sku}</div>
      <div className="flex items-center gap-1 text-[10px] text-slate-400">
        <span className="material-symbols-outlined text-[10px]">barcode_scanner</span>
        {barcode || '---'}
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-1 text-xs font-medium text-slate-900">
        {displayCategory} {subCategory && <><span className="material-symbols-outlined text-sm">chevron_right</span> {subCategory}</>}
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-2 w-24 rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full bg-${stockColor}`} style={{width: stock === 0 ? '0%' : stock < 20 ? '20%' : '80%'}}></div>
        </div>
        <span className={`text-sm font-bold ${stock === 0 ? 'text-red-600' : stock <= 20 ? 'text-amber-600' : 'text-emerald-600'}`}>{stock}</span>
      </div>
    </td>
    <td className="px-6 py-4 text-sm font-semibold text-slate-500 tabular-nums">${cost?.toFixed(2) || '0.00'}</td>
    <td className="px-6 py-4 text-right flex justify-end gap-2">
      <button onClick={onEdit} className="p-1 text-slate-400 hover:text-primary transition-colors">
        <span className="material-symbols-outlined">edit</span>
      </button>
      <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
        <span className="material-symbols-outlined">delete</span>
      </button>
    </td>
  </tr>
);

const StockoutBar = ({ name, days, percent, color, textColor }: any) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between text-xs font-bold">
      <span className="truncate max-w-[120px]">{name}</span>
      <span className={textColor}>{days}</span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: percent }}></div>
    </div>
  </div>
);