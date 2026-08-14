"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService';
import { StyleCodeSelectModal } from '@/app/catalog/style-codes/components/StyleCodeSelectModal';
import { StyleCodeDetailFields } from '@/app/catalog/items/components/StyleCodeDetailFields';
import { mapStyleCodeToItemRow } from '@/shared/utils/styleCodeFields';
import { ProcessSequenceEditor } from '@/app/catalog/items/components/ProcessSequenceEditor';
import { ProductBomTab } from '@/app/catalog/items/components/ProductBomTab';
import ProductImageUploadField from '@/app/catalog/items/components/ProductImageUploadField';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';

const normalizeProductionType = (value?: string): 'normal' | 'embroidery' =>
  value === 'embroidery' ? 'embroidery' : 'normal';

interface StyleCodeItem {
  styleCodeId?: string;
  styleCode: string;
  eanCode: string;
  mrp: number;
  brand?: string;
  pack?: string;
}

interface Product {
  id: string;
  name: string;
  softwareCode: string;
  internalCode: string;
  articleName?: string;
  knittingCode?: string;
  vendorCode: string;
  factoryCode: string;
  hsnCode?: string;
  gst?: string;
  productionType?: string;
  styleCodes?: StyleCodeItem[];
  styleCode?: string; // Keep for backward compatibility
  eanCode?: string; // Keep for backward compatibility
  description: string;
  category?: {
    id: string;
    name: string;
  };
  attributes: Record<string, string>;
  bom: Array<{
    fabricCatalogId: string;
    fabricName: string;
    quantity: number;
    unitCost?: number;
  }>;
  rawMaterials?: Array<{ rawMaterialId: string; rawMaterialName?: string; quantity: number; unitCost?: number }>;
  processes: Array<{
    processId: string;
  }>;
  image?: string;
  unitCost?: number;
}

interface Category {
  id: string;
  name: string;
}

interface AttributeOption {
  id: string;
  name: string;
}

interface AttributeOptionValue {
  _id: string;
  name: string;
  image?: string;
  sortOrder?: number;
}

interface AttributeCategory {
  id: string;
  name: string;
  type?: string;
  attributeType?: string; // 'Manufacturing' | 'Warehouse', default 'Manufacturing'
  sortOrder?: number;
  options?: AttributeOption[];
  optionValues: AttributeOptionValue[];
}

interface ProcessType {
  id: string;
  name: string;
  type?: string;
  description?: string;
  sortOrder?: number;
}

const API_ENDPOINTS = {
  products: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories?page=1&limit=200`,
  attributes: `${API_BASE_URL}/product-attributes?page=1&limit=200`,
  processes: `${API_BASE_URL}/processes?page=1&limit=200`
};

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = (params as any)?.id as string;
  const { user } = useSelector((state: any) => state.auth);
  const isDesign = isDesignUser(user);
  const isProduction = isProductionUser(user);
  const isFinal = isFinalUser(user);

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributeCategories, setAttributeCategories] = useState<AttributeCategory[]>([]);
  const [processes, setProcesses] = useState<ProcessType[]>([]);
  const [activeTab, setActiveTab] = useState('general');

  // Style code select modal
  const [styleCodeModalOpen, setStyleCodeModalOpen] = useState(false);
  const [styleCodeModalIndex, setStyleCodeModalIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    softwareCode: '',
    internalCode: '',
    articleName: '',
    knittingCode: '',
    vendorCode: '',
    factoryCode: '',
    hsnCode: '',
    gst: '',
    productionType: 'normal',
    styleCodes: [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }],
    description: '',
    category: { id: '', name: '' },
    attributes: {},
    bom: [],
    rawMaterials: [],
    processes: [],
    unitCost: 0,
  });

  const [styleCodeOptions, setStyleCodeOptions] = useState<StyleCodeItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          productResponse,
          categoriesResponse,
          attributesResponse,
          processesResponse,
          styleCodesRes
        ] = await Promise.all([
          axios.get(`${API_ENDPOINTS.products}/${productId}`),
          axios.get(API_ENDPOINTS.categories),
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.processes),
          styleCodeService.list({ limit: 500, sortBy: 'styleCode:asc' })
        ]);

        // Normalize categories
        const categories = categoriesResponse.data.results || [];
        setCategories(categories);

        let attrCats = attributesResponse.data.results || [];
        attrCats = attrCats.map((cat: any) => {
          const hasOptionValues = Array.isArray(cat.optionValues) && cat.optionValues.length > 0;
          const hasOptions = Array.isArray(cat.options) && cat.options.length > 0;
          let optionValues = hasOptionValues
            ? (cat.optionValues || []).map((opt: any) => ({
                _id: opt._id || opt.id,
                name: opt.name,
                sortOrder: opt.sortOrder ?? 0,
              }))
            : [];
          if (!hasOptionValues && hasOptions) {
            optionValues = cat.options.map((opt: any) => ({
              _id: opt.id || opt._id,
              name: opt.name,
              sortOrder: opt.sortOrder || 0,
            }));
          }
          return {
            ...cat,
            optionValues,
            options: cat.options || [],
            attributeType: (cat.attributeType === 'Warehouse' ? 'Warehouse' : 'Manufacturing') as string,
          };
        });
        setAttributeCategories(attrCats);
        const brandOptions =
          attrCats.find((c: any) => c.name.toLowerCase() === 'brand')?.optionValues ?? [];
        const packOptions =
          attrCats.find((c: any) => c.name.toLowerCase() === 'pack')?.optionValues ?? [];

        const styleCodesResponse = (styleCodesRes as any)?.results || [];
        const styleOptions = styleCodesResponse.map((sc: any) => ({
          styleCodeId: sc.id,
          styleCode: sc.styleCode,
          eanCode: sc.eanCode,
          mrp: sc.mrp,
          brand: sc.brand,
          pack: sc.pack,
        }));
        // Set initial options; may be extended below if product contains IDs not in this page.
        setStyleCodeOptions(styleOptions);

        // Normalize product data
        let product = productResponse.data;
        // Debug: log backend BOM
        console.log('Backend BOM:', productResponse.data);
        
        // Ensure category is properly initialized
        if (!product.category) {
          product.category = { id: '', name: '' };
        } else if (typeof product.category === 'string') {
          const catObj = categories.find((c: Category) => c.id === product.category);
          if (catObj) {
            product.category = catObj;
          } else {
            product.category = { id: product.category, name: 'Unknown Category' };
          }
        }

        // Normalize styleCodes - backend may send array of IDs only, or array of objects.
        // Fix: styleCode master list here is limited; resolve missing IDs on-demand so edit page never shows blanks.
        if (product.styleCodes && Array.isArray(product.styleCodes)) {
          type StyleOption = {
            styleCodeId: string;
            styleCode: string;
            eanCode: string;
            mrp: number;
            brand?: string;
            pack?: string;
          };

          const rawIds: string[] = product.styleCodes
            .map((sc: any) => (typeof sc === 'string' ? sc : (sc?.styleCodeId ?? sc?._id ?? sc?.id ?? '')))
            .map((id: any) => String(id || '').trim())
            .filter((id: string): id is string => !!id);

          const optionsById = new Map<string, StyleOption>(
            styleOptions
              .filter((o: any) => !!o?.styleCodeId)
              .map((o: any) => [String(o.styleCodeId), o as StyleOption])
          );

          const missingIds: string[] = Array.from(new Set(rawIds.filter((id: string) => !optionsById.has(id))));
          if (missingIds.length > 0) {
            const fetched = await Promise.all(
              missingIds.map((id: string) =>
                styleCodeService
                  .get(id)
                  .then((sc): StyleOption => ({
                    styleCodeId: sc.id,
                    styleCode: sc.styleCode ?? '',
                    eanCode: sc.eanCode ?? '',
                    mrp: sc.mrp ?? 0,
                    brand: sc.brand ?? '',
                    pack: sc.pack ?? '',
                  }))
                  .catch(() => null)
              )
            );
            fetched
              .filter((x): x is StyleOption => x != null && !!x.styleCodeId)
              .forEach((opt: StyleOption) => optionsById.set(String(opt.styleCodeId), opt));
          }

          // Ensure dropdown options also contain fetched entries (so modal/search sees them)
          const mergedOptions = Array.from(optionsById.values());
          setStyleCodeOptions(mergedOptions);

          product.styleCodes = product.styleCodes.map((sc: any) => {
            const id = typeof sc === 'string' ? sc : (sc?.styleCodeId ?? sc?._id ?? sc?.id ?? '');
            const sid = String(id || '').trim();
            const match = sid ? optionsById.get(sid) : undefined;
            const source = match
              ? { ...match, styleCodeId: sid }
              : {
                  styleCodeId: sid,
                  styleCode: typeof sc === 'object' ? sc.styleCode : '',
                  eanCode: typeof sc === 'object' ? sc.eanCode : '',
                  mrp: typeof sc === 'object' && sc.mrp != null ? sc.mrp : 0,
                  brand: typeof sc === 'object' ? sc.brand : '',
                  pack: typeof sc === 'object' ? sc.pack : '',
                };
            return mapStyleCodeToItemRow(source, brandOptions, packOptions);
          });
        } else if (product.styleCode || product.eanCode) {
          product.styleCodes = [{
            styleCodeId: '',
            styleCode: product.styleCode || '',
            eanCode: product.eanCode || '',
            mrp: 0,
            brand: '',
            pack: ''
          }];
        } else {
          product.styleCodes = [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }];
        }

        // (styleCodeOptions already set above)
        
        product.productionType = normalizeProductionType(product.productionType);

        // Defensive: ensure attributes, bom, processes are arrays/objects
        product.attributes = product.attributes || {};
        
        // Normalize attribute data
        const normalizedAttributes = { ...product.attributes };
        
        // Log the original attributes
        console.log('Original product attributes:', product.attributes);
        
        // Helper function to get process ID
        const getProcessId = (proc: any): string => {
          if (typeof proc === 'object') {
            if (proc.id) return proc.id;
            if (proc.process?.id) return proc.process.id;
            if (proc.processId?.id) return proc.processId.id;
            if (typeof proc.process === 'string') return proc.process;
            if (typeof proc.processId === 'string') return proc.processId;
          }
          return proc || '';
        };

        // Process the bom and processes arrays
        product.bom = Array.isArray(product.bom)
          ? product.bom.map((item: any) => {
              const fabricRef = item.fabricCatalogId ?? item.yarnCatalogId ?? item.materialId;
              const fabricCatalogId =
                typeof fabricRef === 'object' && fabricRef !== null
                  ? fabricRef.id || fabricRef._id
                  : fabricRef || '';
              return {
                fabricCatalogId: String(fabricCatalogId || ''),
                fabricName: item.fabricName || item.yarnName || item.materialName || (typeof fabricRef === 'object' ? fabricRef.name : '') || '',
                quantity: item.quantity || 0,
                unitCost: Number(item.unitCost) || 0,
              };
            })
          : [];
        console.log('Normalized BOM:', product.bom);

        const normalizeRawMaterials = Array.isArray(product.rawMaterials)
          ? product.rawMaterials.map((item: any) => {
              const rmRef = item.rawMaterialId ?? item.rawMaterial;
              const rawMaterialId =
                typeof rmRef === 'object' && rmRef !== null
                  ? rmRef.id || rmRef._id
                  : rmRef || '';
              return {
                rawMaterialId: String(rawMaterialId || ''),
                rawMaterialName: item.rawMaterialName || (typeof rmRef === 'object' ? rmRef.name : '') || '',
                quantity: Number(item.quantity) || 0,
                unitCost: Number(item.unitCost) || 0,
              };
            })
          : [];
        
        // Normalize processes to always have processId as string
        product.processes = Array.isArray(product.processes)
          ? product.processes.map((proc: any) => ({
              processId: getProcessId(proc)
            }))
          : [];

        console.log('Normalized processes:', product.processes);
        
        setFormData({
          ...product,
          articleName: product.articleName || '',
          hsnCode: product.hsnCode || '',
          gst: product.gst || '',
          productionType: normalizeProductionType(product.productionType),
          attributes: normalizedAttributes,
          processes: product.processes,
          rawMaterials: normalizeRawMaterials,
          unitCost: Number(product.unitCost) || 0,
        });
        console.log('Product data loaded:', product);
        console.log('Product attributes:', product.attributes);

        setProcesses((processesResponse.data.results || []) as ProcessType[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading product data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  // Normalize product attributes from value-ID to value-name once when categories are loaded (API expects name → value string)
  const attributesNormalizedRef = useRef(false);
  useEffect(() => {
    if (attributeCategories.length === 0 || attributesNormalizedRef.current) return;
    if (Object.keys(formData.attributes).length === 0) {
      attributesNormalizedRef.current = true;
      return;
    }
    attributesNormalizedRef.current = true;
    setFormData(prev => {
      const next: Record<string, string> = {};
      for (const cat of attributeCategories) {
        const raw = prev.attributes[cat.name] ?? prev.attributes[cat.id];
        if (raw == null || raw === '') continue;
        const option = cat.optionValues?.find((o: any) =>
          String(o._id || o.id) === String(raw) || o.name === raw
        );
        next[cat.name] = option ? option.name : String(raw);
      }
      return { ...prev, attributes: next };
    });
  }, [attributeCategories, formData.attributes]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: { id: value, name: categories.find(c => c.id === value)?.name || '' }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  /** Persist uploaded S3 URL on the product form. */
  const handleProductImageChange = (url: string) => {
    setFormData((prev) => ({ ...prev, image: url }));
  };

  const handleAttributeChange = (categoryName: string, value: string) => {
    console.log('Changing attribute:', categoryName, 'to value:', value);
    
    // Find the category ID that corresponds to this name if available
    const category = attributeCategories.find(cat => cat.name === categoryName);
    const categoryId = category?.id || '';
    
    console.log('Category found:', category ? 'yes' : 'no', 'ID:', categoryId);
    
    setFormData(prev => {
      const updatedAttributes = {
        ...prev.attributes,
        [categoryName]: value // Use the category name as the key
      };
      
      console.log('Updated attributes:', updatedAttributes);
      return {
        ...prev,
        attributes: updatedAttributes
      };
    });
  };

  const getBrandPackOptions = () => {
    const brandOptions =
      attributeCategories.find((c) => c.name.toLowerCase() === 'brand')?.optionValues ?? [];
    const packOptions =
      attributeCategories.find((c) => c.name.toLowerCase() === 'pack')?.optionValues ?? [];
    return { brandOptions, packOptions };
  };

  useEffect(() => {
    if (!attributeCategories.length) return;
    const { brandOptions, packOptions } = getBrandPackOptions();
    setFormData((prev) => {
      if (!prev.styleCodes?.length) return prev;
      const nextStyleCodes = prev.styleCodes.map((sc) =>
        mapStyleCodeToItemRow(sc, brandOptions, packOptions)
      );
      const unchanged = nextStyleCodes.every(
        (sc, i) =>
          sc.brand === (prev.styleCodes?.[i]?.brand ?? '') &&
          sc.pack === (prev.styleCodes?.[i]?.pack ?? '')
      );
      if (unchanged) return prev;
      return { ...prev, styleCodes: nextStyleCodes };
    });
  }, [attributeCategories]);

  const handleStyleCodeChange = (index: number, field: 'styleCode' | 'eanCode' | 'mrp' | 'brand' | 'pack', value: string | number) => {
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        [field]: field === 'mrp' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const handleStyleCodeSelect = (index: number, styleCodeId: string) => {
    const option = styleCodeOptions.find((sc) => sc.styleCodeId === styleCodeId);
    if (!option) return;
    const { brandOptions, packOptions } = getBrandPackOptions();
    setFormData((prev) => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[index] = mapStyleCodeToItemRow(option, brandOptions, packOptions);
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const handleStyleCodeInput = (index: number, value: string) => {
    const match = styleCodeOptions.find(
      (sc) => sc.styleCode.toLowerCase() === value.trim().toLowerCase()
    );
    if (match) {
      handleStyleCodeSelect(index, match.styleCodeId || '');
      return;
    }
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[index] = {
        styleCodeId: '',
        styleCode: value,
        eanCode: '',
        mrp: 0,
        brand: '',
        pack: '',
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const addStyleCode = () => {
    setFormData(prev => ({
      ...prev,
      styleCodes: [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]), { styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]
    }));
  };

  const removeStyleCode = (index: number) => {
    setFormData(prev => {
      const currentStyleCodes = prev.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }];
      if (currentStyleCodes.length > 1) {
        return { ...prev, styleCodes: currentStyleCodes.filter((_, i) => i !== index) };
      }
      return prev;
    });
  };

  const handleStyleCodeSelectFromModal = async (sc: StyleCode) => {
    if (styleCodeModalIndex === null) return;
    let source = sc;
    try {
      if (sc.id) {
        source = await styleCodeService.get(sc.id);
      }
    } catch {
      // Fall back to list row if detail fetch fails
    }
    const { brandOptions, packOptions } = getBrandPackOptions();
    setFormData((prev) => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }])];
      newStyleCodes[styleCodeModalIndex] = mapStyleCodeToItemRow(source, brandOptions, packOptions);
      return { ...prev, styleCodes: newStyleCodes };
    });
    setStyleCodeModalOpen(false);
    setStyleCodeModalIndex(null);
  };

  const applyProcessTemplate = (mode: 'normal' | 'embroidery') => {
    const sorted = [...processes].sort((a: any, b: any) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    const filtered = sorted.filter((p: any) => {
      const isEmbroidery = (p.name || '').toLowerCase().includes('embroidery');
      return mode === 'embroidery' ? true : !isEmbroidery;
    });
    setFormData(prev => ({
      ...prev,
      processes: filtered.length > 0
        ? filtered.map((p: any) => ({ processId: p.id }))
        : [{ processId: '' }],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Console log all form data before validation
    console.log('=== FORM DATA BEFORE VALIDATION ===');
    console.log('Form Data:', formData);
    console.log('User Type - isDesign:', isDesign, 'isProduction:', isProduction, 'isFinal:', isFinal);

    // Validate required fields based on user type
    if (isProduction) {
      if (!formData.factoryCode || formData.factoryCode.trim() === '') {
        alert('Please fill in all required fields');
        return;
      }
    } else if (isFinal) {
      // Final user: no required-field validation on frontend
    } else if (isDesign) {
      if (!formData.name || formData.name.trim() === '' || !formData.category) {
        alert('Please fill in all required fields');
        return;
      }
      if (
          !formData.internalCode || formData.internalCode.trim() === '' ||
          !formData.vendorCode || formData.vendorCode.trim() === '') {
        alert('Please fill in all required fields');
        return;
      }
    } else {
      if (!formData.name || formData.name.trim() === '' || !formData.category ||
          (!formData.factoryCode || formData.factoryCode.trim() === '')) {
        alert('Please fill in all required fields.');
        return;
      }
      if (
          !formData.internalCode || formData.internalCode.trim() === '' ||
          !formData.vendorCode || formData.vendorCode.trim() === '') {
        alert('Please fill in all required fields.');
        return;
      }
    }

    // Needles attribute is required when it is shown on the form
    const needlesCategory = attributeCategories.find(c => c.name.toLowerCase() === 'needles');
    if (needlesCategory) {
      const showNeedles = isProduction
        || (isFinal && shouldShowAttributeForFinal(needlesCategory.name, isFinal))
        || (isDesign && shouldShowAttribute(needlesCategory.name, isDesign))
        || (!isDesign && !isFinal && !isProduction);
      if (showNeedles) {
        const needlesValue = (formData.attributes[needlesCategory.name] || formData.attributes[needlesCategory.id] || '').toString().trim();
        if (!needlesValue) {
          alert('Needles is a required field. Please select a value before saving.');
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      console.log('Submitting with attributes:', formData.attributes);
      
      // Prepare the base product data
      const productData: any = {};
    productData.productionType = normalizeProductionType(formData.productionType);

      // Style codes: send only IDs (entries with valid styleCodeId)
      const styleCodeIds = (formData.styleCodes || [])
        .filter(sc => sc.styleCodeId && String(sc.styleCodeId).trim())
        .map(sc => sc.styleCodeId);

      console.log('=== STYLE CODES (IDs only) ===');
      console.log('Original styleCodes:', formData.styleCodes);
      console.log('styleCodeIds:', styleCodeIds);

      if (isProduction) {
        // Production user: Only Factory Code
        productData.factoryCode = formData.factoryCode.trim();
      } else if (isFinal) {
        // Final user: Style Codes (IDs only) and Description
        productData.styleCodes = styleCodeIds;
        productData.description = formData.description.trim();
      } else if (isDesign) {
        productData.name = formData.name.trim();
        productData.softwareCode = formData.softwareCode?.trim() ?? '';
        productData.internalCode = formData.internalCode?.trim() ?? '';
        productData.articleName = formData.articleName?.trim() ?? '';
        productData.knittingCode = formData.knittingCode?.trim() ?? '';
        productData.vendorCode = formData.vendorCode?.trim() ?? '';
        productData.hsnCode = formData.hsnCode?.trim() ?? '';
        productData.gst = formData.gst?.trim() ?? '';
        productData.category = formData.category?.id || '';
      } else {
        productData.name = formData.name.trim();
        productData.softwareCode = formData.softwareCode?.trim() ?? '';
        productData.internalCode = formData.internalCode?.trim() ?? '';
        productData.articleName = formData.articleName?.trim() ?? '';
        productData.knittingCode = (formData.knittingCode || '').trim();
        productData.vendorCode = formData.vendorCode?.trim() ?? '';
        productData.hsnCode = formData.hsnCode?.trim() ?? '';
        productData.gst = formData.gst?.trim() ?? '';
        productData.category = formData.category?.id || '';
        productData.factoryCode = formData.factoryCode.trim();
        productData.styleCodes = styleCodeIds;
        productData.description = formData.description.trim();
      }

      console.log('=== PRODUCT DATA TO BE SENT ===');
      console.log('Product Data:', JSON.stringify(productData, null, 2));

      // Attributes - filter based on user type
      let allowedAttributes;
      if (isProduction) {
        // Production user: Only "needles" attribute
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category && category.name.toLowerCase() === 'needles';
          })
        );
      } else if (isFinal) {
        // Final user: Only Brand, Age group, MRP
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category ? shouldShowAttributeForFinal(category.name, isFinal) : false;
          })
        );
      } else if (isDesign) {
        // Design user: Only allowed attributes
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category ? shouldShowAttribute(category.name, isDesign) : false;
          })
        );
      } else {
        // Other users: All attributes
        allowedAttributes = formData.attributes;
      }
      
      // Send attributes as attribute name -> option value name (string from masters; backend accepts e.g. Needles: "7 GG")
      const attrsFiltered = Object.entries(allowedAttributes).filter(([key]) => !['brand', 'pack'].includes(key.toLowerCase()));
      productData.attributes = Object.fromEntries(
        attrsFiltered
          .map(([key, valueName]) => {
            const category = attributeCategories.find(c => c.name === key || c.id === key);
            const option = category?.optionValues?.find((o: any) =>
              o.name === valueName || String(o._id || o.id) === String(valueName)
            );
            return [key, option ? option.name : valueName];
          })
          .filter(([, v]) => v)
      );

      // BOM, rawMaterials and Processes for production users and non-design/non-final/non-production users
      if (isProduction || (!isDesign && !isFinal && !isProduction)) {
        productData.bom = formData.bom.filter(item => item.fabricCatalogId && item.quantity > 0).map(item => ({
          fabricCatalogId: item.fabricCatalogId,
          fabricName: item.fabricName,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost) || 0,
        }));
        productData.rawMaterials = (formData.rawMaterials || [])
          .filter(item => item.rawMaterialId && (item.quantity ?? 0) >= 0)
          .map(item => ({
            rawMaterialId: item.rawMaterialId,
            quantity: Number(item.quantity) || 0,
            unitCost: Number(item.unitCost) || 0,
          }));
        productData.processes = formData.processes.filter(proc => proc.processId).map(proc => ({
          processId: proc.processId
        }));
      }

      if (typeof formData.image === 'string') {
        productData.image = formData.image.trim();
      }

      await axios.patch(`${API_ENDPOINTS.products}/${productId}`, productData, {
        headers: { 'Content-Type': 'application/json' }
      });

      alert('Product updated successfully!');
      router.push('/catalog/items');
    } catch (error: any) {
      console.error('Error updating product:', error);
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Error updating product';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content catalog-master-form">
        <div className="text-center py-10">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content catalog-master-form">
      <Seo title="Edit Product" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Edit Product</h3>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {['general', 'attributes', ...(isDesign || isFinal ? [] : ['bom', 'processes'])].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isProduction ? (
                      // Production user: only Production Type + Factory Code
                      <>
                        <div>
                          <label className="form-label">Production Type *</label>
                          <select
                            name="productionType"
                            className="form-control"
                            value={normalizeProductionType(formData.productionType)}
                            onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                            required
                          >
                            <option value="normal">Normal</option>
                            <option value="embroidery">Embroidery</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Factory Code *</label>
                          <input
                            type="text"
                            name="factoryCode"
                            className="form-control"
                            value={formData.factoryCode}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </>
                    ) : isFinal ? (
                      // Final user: Production Type + Factory Code above Style Codes, then Style Codes + Description
                      <>
                        <div>
                          <label className="form-label">Production Type *</label>
                          <select
                            name="productionType"
                            className="form-control"
                            value={normalizeProductionType(formData.productionType)}
                            onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                            required
                          >
                            <option value="normal">Normal</option>
                            <option value="embroidery">Embroidery</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Factory Code *</label>
                          <input
                            type="text"
                            name="factoryCode"
                            className="form-control"
                            value={formData.factoryCode}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-4">
                            <label className="form-label">Style Codes</label>
                            <button
                              type="button"
                              onClick={addStyleCode}
                              className="ti-btn ti-btn-primary"
                            >
                              <i className="ri-add-line me-2"></i> Add Style Code
                            </button>
                          </div>
                          <div className="space-y-4">
                            {(formData.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]).map((styleCodeItem, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                  {(formData.styleCodes || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeStyleCode(index)}
                                      className="ti-btn ti-btn-danger ti-btn-sm"
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </button>
                                  )}
                                </div>
                                <StyleCodeDetailFields
                                  styleCode={styleCodeItem.styleCode}
                                  eanCode={styleCodeItem.eanCode}
                                  mrp={styleCodeItem.mrp}
                                  brand={styleCodeItem.brand}
                                  pack={styleCodeItem.pack}
                                  onBrowseStyleCode={() => {
                                    setStyleCodeModalIndex(index);
                                    setStyleCodeModalOpen(true);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label">Description</label>
                          <textarea
                            name="description"
                            className="form-control"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {!isDesign && (
                          <>
                            <div>
                              <label className="form-label">Name *</label>
                              <input
                                type="text"
                                name="name"
                                className="form-control"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Category *</label>
                              <select
                                name="category"
                                className="form-control"
                                value={formData.category?.id || ''}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Software Code *</label>
                              <input
                                type="text"
                                name="softwareCode"
                                className="form-control"
                                value={formData.softwareCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Internal Code / Design Code *</label>
                              <input
                                type="text"
                                name="internalCode"
                                className="form-control"
                                value={formData.internalCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Knitting Code (optional)</label>
                              <input
                                type="text"
                                name="knittingCode"
                                className="form-control"
                                value={formData.knittingCode || ''}
                                onChange={handleInputChange}
                                                              />
                            </div>
                            <div>
                              <label className="form-label">Article Name</label>
                              <input
                                type="text"
                                name="articleName"
                                className="form-control"
                                value={formData.articleName || ''}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="form-label">HSN Code</label>
                                <input
                                  type="text"
                                  name="hsnCode"
                                  className="form-control"
                                  value={formData.hsnCode || ''}
                                  onChange={handleInputChange}
                                />
                              </div>
                              <div>
                                <label className="form-label">GST</label>
                                <input
                                  type="text"
                                  name="gst"
                                  className="form-control"
                                  value={formData.gst || ''}
                                  onChange={handleInputChange}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="form-label">Vendor Code *</label>
                              <input
                                type="text"
                                name="vendorCode"
                                className="form-control"
                                value={formData.vendorCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Production Type *</label>
                              <select
                                name="productionType"
                                className="form-control"
                                value={normalizeProductionType(formData.productionType)}
                                onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                                required
                              >
                                <option value="normal">Normal</option>
                            <option value="embroidery">Embroidery</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Factory Code *</label>
                              <input
                                type="text"
                                name="factoryCode"
                                className="form-control"
                                value={formData.factoryCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="flex justify-between items-center mb-4">
                                <label className="form-label">Style Codes</label>
                                <button
                                  type="button"
                                  onClick={addStyleCode}
                                  className="ti-btn ti-btn-primary"
                                >
                                  <i className="ri-add-line me-2"></i> Add Style Code
                                </button>
                              </div>
                              <div className="space-y-4">
                                {(formData.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]).map((styleCodeItem, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                      {(formData.styleCodes || []).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeStyleCode(index)}
                                          className="ti-btn ti-btn-danger ti-btn-sm"
                                        >
                                          <i className="ri-delete-bin-line"></i>
                                        </button>
                                      )}
                                    </div>
                                    <StyleCodeDetailFields
                                      styleCode={styleCodeItem.styleCode}
                                      eanCode={styleCodeItem.eanCode}
                                      mrp={styleCodeItem.mrp}
                                      brand={styleCodeItem.brand}
                                      pack={styleCodeItem.pack}
                                      onBrowseStyleCode={() => {
                                        setStyleCodeModalIndex(index);
                                        setStyleCodeModalOpen(true);
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Description</label>
                              <textarea
                                name="description"
                                className="form-control"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Product Image</label>
                              <ProductImageUploadField
                                value={formData.image ?? ''}
                                onChange={handleProductImageChange}
                                disabled={isLoading}
                              />
                            </div>
                          </>
                        )}
                        {isDesign && (
                          <>
                            <div>
                              <label className="form-label">Name *</label>
                              <input
                                type="text"
                                name="name"
                                className="form-control"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Category *</label>
                              <select
                                name="category"
                                className="form-control"
                                value={formData.category?.id || ''}
                                onChange={handleInputChange}
                                required
                              >
                                <option value="">Select Category</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Software Code *</label>
                              <input
                                type="text"
                                name="softwareCode"
                                className="form-control"
                                value={formData.softwareCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Internal Code / Design Code *</label>
                              <input
                                type="text"
                                name="internalCode"
                                className="form-control"
                                value={formData.internalCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Knitting Code (optional)</label>
                              <input
                                type="text"
                                name="knittingCode"
                                className="form-control"
                                value={formData.knittingCode || ''}
                                onChange={handleInputChange}
                                                              />
                            </div>
                            <div>
                              <label className="form-label">Article Name</label>
                              <input
                                type="text"
                                name="articleName"
                                className="form-control"
                                value={formData.articleName || ''}
                                onChange={handleInputChange}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="form-label">HSN Code</label>
                                <input
                                  type="text"
                                  name="hsnCode"
                                  className="form-control"
                                  value={formData.hsnCode || ''}
                                  onChange={handleInputChange}
                                />
                              </div>
                              <div>
                                <label className="form-label">GST</label>
                                <input
                                  type="text"
                                  name="gst"
                                  className="form-control"
                                  value={formData.gst || ''}
                                  onChange={handleInputChange}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="form-label">Vendor Code *</label>
                              <input
                                type="text"
                                name="vendorCode"
                                className="form-control"
                                value={formData.vendorCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Production Type *</label>
                              <select
                                name="productionType"
                                className="form-control"
                                value={normalizeProductionType(formData.productionType)}
                                onChange={(e) => handleInputChange({ target: { name: 'productionType', value: e.target.value } } as any)}
                                required
                              >
                                <option value="normal">Normal</option>
                            <option value="embroidery">Embroidery</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Factory Code *</label>
                              <input
                                type="text"
                                name="factoryCode"
                                className="form-control"
                                value={formData.factoryCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Product Image</label>
                              <ProductImageUploadField
                                value={formData.image ?? ''}
                                onChange={handleProductImageChange}
                                disabled={isLoading}
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Attributes Tab - split by Manufacturing / Warehouse */}
                {activeTab === 'attributes' && (() => {
                  const baseFilter = (category: AttributeCategory) => {
                    const nameLower = category.name.toLowerCase();
                    if (nameLower === 'brand' || nameLower === 'pack') return false;
                    if (isProduction) return nameLower === 'needles';
                    if (isFinal) return shouldShowAttributeForFinal(category.name, isFinal);
                    if (isDesign) return shouldShowAttribute(category.name, isDesign);
                    return true;
                  };
                  const filtered = attributeCategories.filter(baseFilter);
                  const manufacturingAttrs = filtered.filter((c) => (c.attributeType ?? 'Manufacturing') === 'Manufacturing');
                  const warehouseAttrs = filtered.filter((c) => c.attributeType === 'Warehouse');

                  const renderAttributeField = (category: AttributeCategory) => {
                    const valueById = formData.attributes[category.id] || '';
                    const valueByName = formData.attributes[category.name] || '';
                    const rawValue = valueById || valueByName;
                    // Resolve ID to option name so select shows correct option (options use value={option.name})
                    const optionValues = category.optionValues || [];
                    const currentValue = !rawValue ? '' : (optionValues.find((o: any) => o.name === rawValue)
                      ? rawValue
                      : (optionValues.find((o: any) => String(o._id || o.id) === String(rawValue))?.name ?? rawValue));
                    const isNeedlesRequired = category.name.toLowerCase() === 'needles' && (
                      isProduction || (isFinal && shouldShowAttributeForFinal(category.name, isFinal)) ||
                      (isDesign && shouldShowAttribute(category.name, isDesign)) || (!isDesign && !isFinal && !isProduction)
                    );
                    return (
                      <div key={category.id} className="space-y-2">
                        <label className="form-label">{category.name}{isNeedlesRequired ? ' *' : ''}</label>
                        <select
                          className="form-control"
                          value={currentValue}
                          onChange={(e) => handleAttributeChange(category.name, e.target.value)}
                        >
                          <option value="">Select {category.name}</option>
                          {category.optionValues?.length ? (
                            category.optionValues.map((option) => (
                              <option key={option._id || (option as any).id} value={option.name}>{option.name}</option>
                            ))
                          ) : (
                            <option value="" disabled>No options available</option>
                          )}
                        </select>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-8">
                      {attributeCategories.length === 0 ? (
                        <div className="text-center py-4">
                          <p>No attribute categories found.</p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                              Manufacturing Attributes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {manufacturingAttrs.length === 0 ? (
                                <p className="text-gray-500 text-sm col-span-2">No manufacturing attributes.</p>
                              ) : (
                                manufacturingAttrs.map(renderAttributeField)
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
                              Warehouse Attributes
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {warehouseAttrs.length === 0 ? (
                                <p className="text-gray-500 text-sm col-span-2">No warehouse attributes.</p>
                              ) : (
                                warehouseAttrs.map(renderAttributeField)
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* BOM Tab */}
                {!isDesign && !isFinal && activeTab === 'bom' && (
                  <ProductBomTab
                    fabricItems={formData.bom}
                    onFabricChange={(bom) => setFormData((prev) => ({ ...prev, bom }))}
                    packagingItems={formData.rawMaterials || []}
                    onPackagingChange={(rawMaterials) => setFormData((prev) => ({ ...prev, rawMaterials }))}
                    disabled={isLoading}
                  />
                )}

                {!isDesign && !isFinal && activeTab === 'processes' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="ti-btn ti-btn-outline-primary" onClick={() => applyProcessTemplate('normal')} disabled={isLoading}>
                        Apply Normal template
                      </button>
                      <button type="button" className="ti-btn ti-btn-outline-primary" onClick={() => applyProcessTemplate('embroidery')} disabled={isLoading}>
                        Apply Embroidery template
                      </button>
                    </div>
                    <ProcessSequenceEditor
                      items={formData.processes.map((proc) => ({
                        processId:
                          typeof proc.processId === 'object' &&
                          proc.processId !== null &&
                          'id' in proc.processId
                            ? String((proc.processId as { id: string }).id)
                            : String(proc.processId ?? ''),
                      }))}
                      availableProcesses={processes}
                      onChange={(items) =>
                        setFormData((prev) => ({ ...prev, processes: items }))
                      }
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/catalog/items')}
                    className="ti-btn ti-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <StyleCodeSelectModal
        open={styleCodeModalOpen}
        onClose={() => { setStyleCodeModalOpen(false); setStyleCodeModalIndex(null); }}
        onSelect={handleStyleCodeSelectFromModal}
      />
    </div>
  );
};

export default function EditProductPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Items" action="update">
      <EditProductPage />
    </RequireCrudPermission>
  );
} 