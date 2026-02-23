import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import UserMenu from '../UserMenu';
import { databases, storage, ID, Query } from '@/lib/appwrite';
import { useNavigate } from 'react-router-dom';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_INVENTORY_ID;
const BUCKET_ID = import.meta.env.VITE_APPWRITE_BUCKET_IMAGES_ID || 'products';

const initialProducts: any[] = [];

const categoryKeys = ['Apparel', 'Grocery', 'Electronics', 'Home', 'Fitness', 'General'];

export default function Inventory() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(categoryKeys);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('All'); // All, In Stock, Low Stock, Out of Stock
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('LastUpdated');

  // helper to get category display name
  const getCategoryDisplay = (cat: string) => {
    const key = `data.categories.${cat}`;
    const translation = t(key);
    // If translation returns the key itself, it means it's a custom category or missing translation
    return translation === key ? cat : translation;
  };

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    if (!DATABASE_ID || !COLLECTION_ID) {
      console.warn('Appwrite IDs missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]);
      const mappedProducts = response.documents.map(doc => ({
        ...doc,
        id: doc.$id
      }));
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sub: '',
    sku: '',
    barcode: '',
    category: 'General',
    subCategory: '',
    stock: 0,
    cost: 0,
    price: 0,
    icon: 'inventory_2',
    image: ''
  });

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Derived Data
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by Status
    if (filterStatus === 'InStock') result = result.filter(p => (p.stock || 0) > 20);
    if (filterStatus === 'LowStock') result = result.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 20);
    if (filterStatus === 'OutOfStock') result = result.filter(p => (p.stock || 0) === 0);

    // Filter by Category
    if (filterCategory !== 'All') result = result.filter(p => p.category === filterCategory);

    // Sort
    if (sortBy === 'Name') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'Stock') result.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    if (sortBy === 'Price') result.sort((a, b) => (b.price || 0) - (a.price || 0));

    return result;
  }, [products, filterStatus, filterCategory, sortBy]);

  const totalValue = useMemo(() => products.reduce((acc, curr) => acc + ((curr.stock || 0) * (curr.cost || 0)), 0), [products]);
  const lowStockItems = useMemo(() => products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 20), [products]);

  // Generators
  const generateRandomSKU = (category: string) => {
    const prefix = (category || 'GEN').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${randomNum}`;
  };

  const generateRandomBarcode = () => {
    let result = '';
    for (let i = 0; i < 13; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  };

  // Handlers
  const handleOpenModal = (product: any = null) => {
    setImageFile(null);
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name || '',
        sub: product.sub || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        category: product.category || 'General',
        subCategory: product.subCategory || '',
        stock: product.stock || 0,
        cost: product.cost || 0,
        price: product.price || 0,
        icon: product.icon || 'inventory_2',
        image: product.image || ''
      });
    } else {
      setEditingProduct(null);
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
        price: 0,
        icon: 'inventory_2',
        image: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!DATABASE_ID || !COLLECTION_ID) return;

    setLoading(true);
    setUploading(true);
    try {
      let imageUrl = formData.image;

      // Handle Image Upload
      if (imageFile) {
        try {
          const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), imageFile);
          imageUrl = storage.getFileView(BUCKET_ID, uploadedFile.$id).toString();
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          // Continue saving without image if upload fails
        }
      }

      const submissionData = { ...formData, image: imageUrl };

      // Clean data types for Appwrite
      submissionData.stock = parseInt(submissionData.stock as any) || 0;
      submissionData.cost = parseFloat(submissionData.cost as any) || 0;
      submissionData.price = parseFloat(submissionData.price as any) || 0;

      if (editingProduct) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, editingProduct.id, submissionData);
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), submissionData);
      }

      await fetchProducts(); // Refresh list
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      let errorMsg = error.message || 'Check console / credentials.';
      if (errorMsg.includes('Attribute not found')) {
        errorMsg = 'Error: Schema mismatch. Please ensure attributes (stock, cost, price, etc) exist in Appwrite.';
      }
      alert(`Failed to save product: ${errorMsg}`);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!DATABASE_ID || !COLLECTION_ID) return;
    if (confirm('Are you sure you want to delete this product?')) {
      setLoading(true);
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, id);
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      } finally {
        setLoading(false);
      }
    }
  };

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
    if (stock === 0) return 'bg-red-500';
    if (stock <= 20) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex flex-1 flex-row h-full overflow-hidden relative bg-slate-50/50">
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
                {filterCategory === 'All' ? t('inventory.allCategories') : getCategoryDisplay(filterCategory)}
                <span className="material-symbols-outlined text-lg">expand_more</span>
              </button>
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
                      {getCategoryDisplay(cat)}
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
                {loading && !uploading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <span className="size-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block mb-2"></span>
                      <p>Loading products...</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredProducts.map(product => (
                      <InventoryRow
                        key={product.id}
                        {...product}
                        displayCategory={getCategoryDisplay(product.category)}
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
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <aside className="w-80 border-l border-slate-200 bg-white px-6 py-8 hidden xl:block overflow-y-auto">
        <div className="sticky top-0 space-y-8">
          <div>
            <div className="mb-6 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
              </div>
              <h3 className="font-bold text-slate-900">{t('inventory.quickInsights')}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase text-primary">AquaAI</span>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
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
                  </div>
                </div>
              ))}
              {products.filter(p => p.stock === 0).length === 0 && <p className="text-xs text-slate-500">No urgent reorders needed.</p>}
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 p-4 text-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-medium text-slate-400">{t('inventory.totalValue')}</p>
                <p className="text-lg font-black">${totalValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400">{t('inventory.activeSkus')}</p>
                <p className="text-lg font-black">{products.length}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h3 className="text-2xl font-black text-slate-900">{editingProduct ? t('inventory.editProduct') : t('inventory.addNewProduct')}</h3>
              <button
                onClick={() => !uploading && setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={uploading}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Image Upload Column */}
                <div className="md:col-span-1 space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Image</label>
                  <div
                    className="relative group aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => document.getElementById('imageInput')?.click()}
                  >
                    {imageFile || formData.image ? (
                      <img
                        src={imageFile ? URL.createObjectURL(imageFile) : formData.image}
                        className="w-full h-full object-cover"
                        alt="Preview"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-primary transition-colors">add_photo_alternate</span>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">Click to upload</p>
                      </div>
                    )}
                    {(imageFile || formData.image) && (
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <span className="text-white text-xs font-bold px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">Change Photo</span>
                      </div>
                    )}
                  </div>
                  <input
                    id="imageInput"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tight">JPG, PNG, WebP (Max 2MB)</p>
                </div>

                {/* Form Fields Column */}
                <div className="md:col-span-2 space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Name</label>
                        <input
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Premium Filtered Water 20L"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">SKU</label>
                          <button onClick={() => setFormData(prev => ({ ...prev, sku: generateRandomSKU(prev.category) }))} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">refresh</span> Auto
                          </button>
                        </div>
                        <input
                          className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm font-mono font-bold focus:ring-2 focus:ring-primary outline-none"
                          value={formData.sku}
                          onChange={e => setFormData({ ...formData, sku: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Barcode</label>
                          <button onClick={() => setFormData(prev => ({ ...prev, barcode: generateRandomBarcode() }))} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">refresh</span> Auto
                          </button>
                        </div>
                        <input
                          className="w-full bg-slate-100 border-none rounded-xl p-3 text-sm font-mono font-bold focus:ring-2 focus:ring-primary outline-none"
                          value={formData.barcode}
                          onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Category</label>
                        <select
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-primary outline-none"
                          value={formData.category}
                          onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{getCategoryDisplay(cat)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Stock Level</label>
                        <input
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-primary outline-none"
                          value={formData.stock}
                          onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Unit Cost ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-7 pr-3 text-sm font-bold focus:border-primary outline-none"
                            value={formData.cost}
                            onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Selling Price ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-black">$</span>
                          <input
                            type="number"
                            step="0.01"
                            className="w-full bg-primary/5 border border-primary/20 rounded-xl py-3 pl-7 pr-3 text-sm font-black text-primary outline-none"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end items-center sticky bottom-0">
              {uploading && (
                <div className="flex items-center gap-2 mr-auto text-xs font-bold text-slate-500">
                  <span className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                  Saving product...
                </div>
              )}
              <button
                disabled={uploading}
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                {t('inventory.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="px-8 py-2.5 bg-primary text-slate-900 font-black rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
                disabled={uploading}
              >
                {uploading ? 'Processing...' : t('inventory.saveProduct')}
                {!uploading && <span className="material-symbols-outlined">save</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{t('inventory.manageCategories')}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Premium Accessories"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary transition-all"
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 bg-primary text-slate-900 font-bold rounded-xl disabled:opacity-50 hover:brightness-105 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">add</span>
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-primary/20 hover:shadow-sm transition-all group">
                    <span className="text-sm font-black text-slate-700">{getCategoryDisplay(cat)}</span>
                    <button onClick={() => handleDeleteCategory(cat)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined">delete</span>
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
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-black ring-1 ring-inset transition-all uppercase tracking-tighter ${active
        ? colorMap[color] + ' shadow-sm'
        : 'text-slate-500 ring-slate-200 bg-white hover:bg-slate-50'
        }`}
    >
      {label}
    </button>
  );
};

const InventoryRow = ({ image, name, sub, sku, barcode, displayCategory, subCategory, stock, stockColor, cost, price, onEdit, onDelete }: any) => (
  <tr className="group hover:bg-slate-50/80 transition-all border-b border-transparent hover:border-slate-100">
    <td className="px-6 py-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
          {image ? (
            <img src={image} className="h-full w-full object-cover" alt={name} />
          ) : (
            <span className="material-symbols-outlined text-slate-300 text-2xl">image</span>
          )}
        </div>
        <div>
          <div className="font-black text-slate-900 leading-tight">{name}</div>
          <div className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{sub || 'No description'}</div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="font-mono text-[11px] text-slate-700 font-black bg-slate-100 w-fit px-2 py-0.5 rounded uppercase">{sku}</div>
      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-bold">
        <span className="material-symbols-outlined text-[12px]">barcode_scanner</span>
        {barcode || '---'}
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="text-xs font-black text-slate-600 bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-100">
        {displayCategory}
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${stockColor} transition-all duration-1000`} style={{ width: stock === 0 ? '0%' : stock < 20 ? '20%' : '80%' }}></div>
        </div>
        <span className={`text-sm font-black ${stock === 0 ? 'text-red-600' : stock <= 20 ? 'text-amber-600' : 'text-emerald-600'}`}>{stock}</span>
      </div>
    </td>
    <td className="px-6 py-4 text-sm font-bold text-slate-900 tabular-nums">${price?.toFixed(2) || '0.00'}</td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg transition-all shadow-sm">
          <span className="material-symbols-outlined text-xl">edit</span>
        </button>
        <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all shadow-sm">
          <span className="material-symbols-outlined text-xl">delete</span>
        </button>
      </div>
    </td>
  </tr>
);

const StockoutBar = ({ name, days, percent, color, textColor }: any) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex justify-between text-[11px] font-black uppercase tracking-tight">
      <span className="truncate max-w-[120px] text-slate-700">{name}</span>
      <span className={textColor}>{days}</span>
    </div>
    <div className="h-2 w-full rounded-full bg-slate-200/50 overflow-hidden border border-slate-200/20">
      <div className={`h-full rounded-full ${color} transition-all duration-1000`} style={{ width: percent }}></div>
    </div>
  </div>
);