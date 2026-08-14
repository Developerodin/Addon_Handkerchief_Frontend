"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { uploadOptionalImage } from '@/shared/utils/imageUpload';
import HelpIcon from '@/shared/components/HelpIcon';
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService';
import { StyleCodeSelectModal } from '@/app/catalog/style-codes/components/StyleCodeSelectModal';
import { StyleCodeDetailFields } from '@/app/catalog/items/components/StyleCodeDetailFields';
import { mapStyleCodeToItemRow } from '@/shared/utils/styleCodeFields';
import { ProcessSequenceEditor } from '@/app/catalog/items/components/ProcessSequenceEditor';
import { ProductBomTab } from '@/app/catalog/items/components/ProductBomTab';
import { RawMaterialBomItem } from '@/app/catalog/items/components/RawMaterialBomTable';
import RequireCrudPermission from '@/shared/components/auth/RequireCrudPermission';
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';

const normalizeProductionType = (value?: string): 'normal' | 'embroidery' =>
  value === 'embroidery' ? 'embroidery' : 'normal';

interface AttributeOptionValue {
  _id: string;
  name: string;
  image: string;
  sortOrder: number;
}

interface AttributeOption {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  optionValues: AttributeOptionValue[];
}

interface ProcessStep {
  _id: string;
  stepTitle: string;
  stepDescription: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

interface Process {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  sortOrder: number;
  steps: ProcessStep[];
}

interface ProcessApiResponse {
  results: Process[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface AttributesApiResponse {
  results: AttributeOption[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface Attributes {
  [key: string]: AttributeOptionValue[];
}

interface BomItem {
  fabricCatalogId: string;
  fabricName: string;
  quantity: number;
  unitCost: number;
}

interface ProcessItem {
  processId: string;
}

interface FormData {
  [key: string]: string;
}

interface Category {
  id: string;
  name: string;
}

// API endpoints
const API_ENDPOINTS = {
  attributes: `${API_BASE_URL}/product-attributes?page=1&limit=200`,
  processes: `${API_BASE_URL}/processes?page=1&limit=200`,
  createProduct: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories?page=1&limit=200`
};

const generateSoftwareCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `PRD-${timestamp}-${random}`.toUpperCase();
};

const AddProductPage = () => {
  const { user } = useSelector((state: any) => state.auth);
  const isDesign = isDesignUser(user);
  const isProduction = isProductionUser(user);
  const isFinal = isFinalUser(user);
  
  const [activeTab, setActiveTab] = useState('general');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [rawMaterialItems, setRawMaterialItems] = useState<RawMaterialBomItem[]>([]);
  const [processItems, setProcessItems] = useState<ProcessItem[]>([{ processId: '' }]);
  const [softwareCode, setSoftwareCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // API data states
  const [attributes, setAttributes] = useState<Attributes>({});
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeOption[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<Process[]>([]);
  
  // Add categories state
  const [categories, setCategories] = useState<Category[]>([]);

  // Add general form state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    internalCode: '',
    articleName: '',
    knittingCode: '',
    vendorCode: '',
    factoryCode: '',
    hsnCode: '',
    gst: '',
    productionType: 'normal' as 'normal' | 'embroidery',
    description: '',
    category: '',
  });

  // Style codes array state
  interface StyleCodeItem {
    styleCodeId?: string;
    styleCode: string;
    eanCode: string;
    mrp: number;
    brand?: string;
    pack?: string;
  }

  const [styleCodes, setStyleCodes] = useState<StyleCodeItem[]>([
    { styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }
  ]);
  const [styleCodeOptions, setStyleCodeOptions] = useState<StyleCodeItem[]>([]);

  // Add image state
  const [productImage, setProductImage] = useState<File | null>(null);

  // Style code select modal
  const [styleCodeModalOpen, setStyleCodeModalOpen] = useState(false);
  const [styleCodeModalIndex, setStyleCodeModalIndex] = useState<number | null>(null);

  useEffect(() => {
    // Generate software code on component mount
    setSoftwareCode(generateSoftwareCode());
    
    // Fetch data from APIs
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [attributesRes, processesRes, categoriesRes, styleCodesRes] = await Promise.all([
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.processes),
          axios.get(API_ENDPOINTS.categories),
          styleCodeService.list({ limit: 500, sortBy: 'styleCode:asc' })
        ]);

        console.log('Product Attributes Response:', attributesRes.data);
        console.log('Processes Response:', processesRes.data);
        console.log('Categories Response:', categoriesRes.data);

        // Map the attributes response
        const attrResponse = attributesRes.data as AttributesApiResponse;
        setAttributeDefinitions(attrResponse.results || []);
        
        // Transform the attributes into a more usable format
        const transformedAttributes = attrResponse.results.reduce((acc, attr) => {
          acc[attr.name.toLowerCase()] = attr.optionValues;
          return acc;
        }, {} as Attributes);
        
        setAttributes(transformedAttributes);
        console.log('Transformed attributes:', transformedAttributes);
        
        // Set processes from results array
        const processResponse = processesRes.data as ProcessApiResponse;
        console.log('Setting processes:', processResponse.results);
        setAvailableProcesses(processResponse.results || []);

        // Set categories
        const categoriesResponse = categoriesRes.data;
        setCategories(categoriesResponse.results || []);

        // Style code options for lookup (read-only in UI)
        const styleCodesResponse = (styleCodesRes as any)?.results || [];
        const options = styleCodesResponse.map((sc: any) => ({
          styleCodeId: sc.id,
          styleCode: sc.styleCode,
          eanCode: sc.eanCode,
          mrp: sc.mrp,
          brand: sc.brand,
          pack: sc.pack,
        }));
        setStyleCodeOptions(options);

      } catch (error) {
        console.error('Error fetching data:', error);
        // Show error state or notification to user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const applyProcessTemplate = (mode: 'normal' | 'embroidery') => {
    const sorted = [...availableProcesses].sort(
      (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
    );
    const filtered = sorted.filter((p) => {
      const isEmbroidery = (p.name || '').toLowerCase().includes('embroidery');
      return mode === 'embroidery' ? true : !isEmbroidery;
    });
    setProcessItems(
      filtered.length > 0
        ? filtered.map((p) => ({ processId: p.id }))
        : [{ processId: '' }]
    );
  };

  // Add form state
  const [formData, setFormData] = useState<FormData>({});

  // Handle attribute change
  const handleAttributeChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle general form changes
  const handleGeneralChange = (field: string, value: string) => {
    setGeneralForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle style code changes
  const handleStyleCodeChange = (index: number, field: 'styleCode' | 'eanCode' | 'mrp' | 'brand' | 'pack', value: string | number) => {
    const newStyleCodes = [...styleCodes];
    if (field === 'mrp') {
      const numValue = typeof value === 'string' 
        ? (value.trim() === '' ? 0 : parseFloat(value)) 
        : value;
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        mrp: isNaN(numValue) ? 0 : numValue
      };
    } else {
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        [field]: value
      };
    }
    setStyleCodes(newStyleCodes);
  };

  const getBrandPackOptions = () => {
    const brandOptions =
      attributeDefinitions.find((a) => a.name.toLowerCase() === 'brand')?.optionValues ?? [];
    const packOptions =
      attributeDefinitions.find((a) => a.name.toLowerCase() === 'pack')?.optionValues ?? [];
    return { brandOptions, packOptions };
  };

  const handleStyleCodeSelect = (index: number, styleCodeId: string) => {
    const option = styleCodeOptions.find((sc) => sc.styleCodeId === styleCodeId);
    if (!option) return;
    const { brandOptions, packOptions } = getBrandPackOptions();
    const newStyleCodes = [...styleCodes];
    newStyleCodes[index] = mapStyleCodeToItemRow(option, brandOptions, packOptions);
    setStyleCodes(newStyleCodes);
  };

  const handleStyleCodeInput = (index: number, value: string) => {
    const match = styleCodeOptions.find(
      (sc) => sc.styleCode.toLowerCase() === value.trim().toLowerCase()
    );
    if (match) {
      handleStyleCodeSelect(index, match.styleCodeId || '');
      return;
    }
    // No match: keep typed value, clear details
    const newStyleCodes = [...styleCodes];
    newStyleCodes[index] = {
      styleCodeId: '',
      styleCode: value,
      eanCode: '',
      mrp: 0,
      brand: '',
      pack: '',
    };
    setStyleCodes(newStyleCodes);
  };

  const handleAddStyleCode = () => {
    setStyleCodes([...styleCodes, { styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]);
  };

  const handleRemoveStyleCode = (index: number) => {
    if (styleCodes.length > 1) {
      setStyleCodes(styleCodes.filter((_, i) => i !== index));
    }
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
    const newStyleCodes = [...styleCodes];
    newStyleCodes[styleCodeModalIndex] = mapStyleCodeToItemRow(source, brandOptions, packOptions);
    setStyleCodes(newStyleCodes);
    setStyleCodeModalOpen(false);
    setStyleCodeModalIndex(null);
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProductImage(event.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Console log all form data before validation
    console.log('=== FORM DATA BEFORE VALIDATION ===');
    console.log('General Form:', generalForm);
    console.log('Style Codes:', styleCodes);
    console.log('BOM Items:', bomItems);
    console.log('Process Items:', processItems);
    console.log('Attributes:', formData);
    console.log('User Type - isDesign:', isDesign, 'isProduction:', isProduction, 'isFinal:', isFinal);

    // Validate required fields based on user type
    if (isProduction) {
      if (!generalForm.factoryCode || generalForm.factoryCode.trim() === '') {
        alert('Please fill in all required fields');
        return;
      }
    } else if (isFinal) {
      // Final user: Style Codes and Description are optional
    } else if (isDesign) {
      if (!generalForm.name || generalForm.name.trim() === '' || !generalForm.category) {
        alert('Please fill in all required fields');
        return;
      }
      if (
          !generalForm.internalCode || generalForm.internalCode.trim() === '' ||
          !generalForm.vendorCode || generalForm.vendorCode.trim() === '') {
        alert('Please fill in all required fields');
        return;
      }
    } else {
      if (!generalForm.name || generalForm.name.trim() === '' || !generalForm.category ||
          (!generalForm.factoryCode || generalForm.factoryCode.trim() === '')) {
        alert('Please fill in all required fields.');
        return;
      }
      if (
          !generalForm.internalCode || generalForm.internalCode.trim() === '' ||
          !generalForm.vendorCode || generalForm.vendorCode.trim() === '') {
        alert('Please fill in all required fields.');
        return;
      }
    }

    // Needles attribute is required when it is shown on the form
    const needlesAttr = attributeDefinitions.find(a => a.name.toLowerCase() === 'needles');
    if (needlesAttr) {
      const showNeedles = isProduction
        || (isFinal && shouldShowAttributeForFinal(needlesAttr.name, isFinal))
        || (isDesign && shouldShowAttribute(needlesAttr.name, isDesign))
        || (!isDesign && !isFinal && !isProduction);
      if (showNeedles) {
        const needlesValue = (formData['needles'] || '').toString().trim();
        if (!needlesValue) {
          alert('Needles is a required field. Please select a value before saving.');
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      // Prepare the product data
      const productData: any = {};

      productData.productionType = normalizeProductionType(generalForm.productionType);

      // Style codes: send only IDs
      const styleCodeIds = styleCodes
        .filter(sc => (sc as { styleCodeId?: string }).styleCodeId && String((sc as { styleCodeId?: string }).styleCodeId).trim())
        .map(sc => (sc as { styleCodeId: string }).styleCodeId);

      console.log('=== STYLE CODES (IDs only) ===');
      console.log('styleCodeIds:', styleCodeIds);

      if (isProduction) {
        // Production user: Only Factory Code
        productData.factoryCode = generalForm.factoryCode.trim();
      } else if (isFinal) {
        // Final user: Style Codes and Description are optional
        if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
        const description = generalForm.description.trim();
        if (description) productData.description = description;
      } else if (isDesign) {
        productData.name = generalForm.name.trim();
        productData.softwareCode = softwareCode;
        productData.internalCode = generalForm.internalCode?.trim() ?? '';
        productData.articleName = generalForm.articleName?.trim() ?? '';
        productData.knittingCode = generalForm.knittingCode?.trim() ?? '';
        productData.vendorCode = generalForm.vendorCode?.trim() ?? '';
        productData.hsnCode = generalForm.hsnCode?.trim() ?? '';
        productData.gst = generalForm.gst?.trim() ?? '';
        productData.category = generalForm.category;
      } else {
        productData.name = generalForm.name.trim();
        productData.softwareCode = softwareCode || '';
        productData.internalCode = generalForm.internalCode?.trim() ?? '';
        productData.articleName = generalForm.articleName?.trim() ?? '';
        productData.knittingCode = generalForm.knittingCode?.trim() ?? '';
        productData.vendorCode = generalForm.vendorCode?.trim() ?? '';
        productData.hsnCode = generalForm.hsnCode?.trim() ?? '';
        productData.gst = generalForm.gst?.trim() ?? '';
        productData.category = generalForm.category;
        productData.factoryCode = generalForm.factoryCode.trim();
        if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
        const description = generalForm.description.trim();
        if (description) productData.description = description;
      }

      console.log('=== PRODUCT DATA TO BE SENT ===');
      console.log('Product Data:', JSON.stringify(productData, null, 2));

      // Attributes - filter based on user type
      let allowedAttributes;
      if (isProduction) {
        // Production user: Only "needles" attribute
        allowedAttributes = attributeDefinitions.filter(attr => 
          attr.name.toLowerCase() === 'needles'
        );
      } else if (isFinal) {
        // Final user: Only Brand, Age group, MRP
        allowedAttributes = attributeDefinitions.filter(attr => 
          shouldShowAttributeForFinal(attr.name, isFinal)
        );
      } else if (isDesign) {
        // Design user: Only allowed attributes
        allowedAttributes = attributeDefinitions.filter(attr => 
          shouldShowAttribute(attr.name, isDesign)
        );
      } else {
        // Other users: All attributes
        allowedAttributes = attributeDefinitions;
      }
      // Brand and Pack are in style codes, not product-level attributes
      allowedAttributes = allowedAttributes.filter(
        attr => !['brand', 'pack'].includes(attr.name.toLowerCase())
      );

      // Send attributes as attribute name -> option value name (string from masters; backend accepts e.g. Needles: "7 GG")
      productData.attributes = Object.fromEntries(
        allowedAttributes
          .map(attr => {
            const valueName = formData[attr.name.toLowerCase()];
            if (!valueName) return null;
            const option = attr.optionValues.find((o: any) => o.name === valueName || String(o._id) === String(valueName));
            return [attr.name, option ? option.name : valueName];
          })
          .filter((e): e is [string, string] => !!e && !!e[1])
      );

      // BOM, rawMaterials and Processes for production users and non-design/non-final/non-production users
      if (isProduction || (!isDesign && !isFinal && !isProduction)) {
        productData.bom = bomItems
          .filter(item => item.fabricCatalogId && item.quantity > 0)
          .map(item => ({
            fabricCatalogId: item.fabricCatalogId,
            fabricName: item.fabricName,
            quantity: item.quantity,
            unitCost: Number(item.unitCost) || 0,
          }));

        productData.rawMaterials = rawMaterialItems
          .filter(item => item.rawMaterialId && (item.quantity ?? 0) >= 0)
          .map(item => ({
            rawMaterialId: item.rawMaterialId,
            quantity: Number(item.quantity) || 0,
            unitCost: Number(item.unitCost) || 0,
          }));

        productData.processes = processItems
          .filter(item => item.processId)
          .map(item => ({
            processId: item.processId
          }));
      }

      const imageUrl = await uploadOptionalImage(productImage);
      if (imageUrl) {
        productData.image = imageUrl;
      }

      console.log('=== SENDING REQUEST ===');
      console.log('Request Data:', productData);

      const response = await axios.post(API_ENDPOINTS.createProduct, productData, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('=== RESPONSE RECEIVED ===');
      console.log('Product created:', response.data);
      
      // Show success message
      alert('Product created successfully!');
      
      // Redirect to products list
      window.location.href = '/catalog/items';
      
    } catch (error: any) {
      console.error('Error creating product:', error);
      alert(error.response?.data?.message || 'Error creating product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content catalog-master-form">
      <Seo title="Add Product"/>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            {/* Page Header */}
            <div className="box !bg-transparent border-0 shadow-none">
              <div className="box-header flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <h1 className="box-title text-2xl font-semibold">Add New Product</h1>
                  <HelpIcon
                    title="Add New Product"
                    content={
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                          <p className="text-gray-700">
                            This is the Add New Product page where you can create and configure new products with detailed specifications, attributes, Bill of Materials (BOM), and manufacturing processes.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>General Information:</strong> Set basic product details like name, codes, category, and description</li>
                            <li><strong>Product Attributes:</strong> Define custom attributes and their values for the product</li>
                            <li><strong>Bill of Materials (BOM):</strong> Specify fabric catalogs, metres per piece, and packaging materials</li>
                            <li><strong>Manufacturing Processes:</strong> Define the production processes and their sequence</li>
                            <li><strong>Image Upload:</strong> Add product images for visual reference</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Tab Details:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>General:</strong> Basic product information, codes, category, and description</li>
                            <li><strong>Attributes:</strong> Custom product attributes with predefined values</li>
                            <li><strong>BOM:</strong> Fabric catalogues, metres, and packaging needed for production</li>
                            <li><strong>Processes:</strong> Manufacturing processes and their sequence</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Required Fields:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>Product Name:</strong> Must be unique and descriptive</li>
                            <li><strong>Style Code:</strong> Required for product identification</li>
                            <li><strong>Category:</strong> Must select a valid product category</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li>Software Code is auto-generated, but you can customize it</li>
                            <li>Use the search functionality in BOM and Processes tabs to find fabric catalogs and processes</li>
                            <li>Attributes are optional but help in product categorization and filtering</li>
                            <li>Save your work frequently to avoid losing data</li>
                          </ul>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="box-tools">
                  <Link href="/catalog/items" className="ti-btn ti-btn-outline-primary">
                    <i className="ri-arrow-left-line me-2"></i> Back to List
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Box */}
            <div className="box">
              <div className="box-body">
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="flex space-x-4" aria-label="Tabs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('general')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'general'
                          ? 'bg-primary text-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('attributes')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'attributes'
                          ? 'bg-primary text-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Attributes
                    </button>
                    {!isDesign && !isFinal && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab('bom')}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            activeTab === 'bom'
                              ? 'bg-primary text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          BOM
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('processes')}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            activeTab === 'processes'
                              ? 'bg-primary text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Processes
                        </button>
                      </>
                    )}
                  </nav>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-12 gap-6">
                    {isProduction ? (
                      // Production user: only Production Type + Factory Code
                      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Production Type *</label>
                          <select
                            className="form-control"
                            value={generalForm.productionType}
                            onChange={(e) => handleGeneralChange('productionType', e.target.value)}
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
                            className="form-control"
                            value={generalForm.factoryCode}
                            onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    ) : isFinal ? (
                      // Final user: Production Type + Factory Code above Style Codes, then Style Codes + Description
                      <div className="col-span-12">
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="form-label">Production Type *</label>
                              <select
                                className="form-control"
                                value={generalForm.productionType}
                                onChange={(e) => handleGeneralChange('productionType', e.target.value)}
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
                                className="form-control"
                                value={generalForm.factoryCode}
                                onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <label className="form-label">Style Codes</label>
                              <button
                                type="button"
                                onClick={handleAddStyleCode}
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add Style Code
                              </button>
                            </div>
                            <div className="space-y-4">
                              {styleCodes.map((styleCodeItem, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                    {styleCodes.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveStyleCode(index)}
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
                                    browseDisabled={isLoading}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="form-label">Description</label>
                            <textarea 
                              className="form-control" 
                              rows={4}
                              value={generalForm.description}
                              onChange={(e) => handleGeneralChange('description', e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="col-span-12 lg:col-span-8">
                          <div className="space-y-6">
                            {!isDesign && (
                              <>
                                <div>
                                  <label className="form-label">Product Name *</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.name}
                                    onChange={(e) => handleGeneralChange('name', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label">Software Code</label>
                                    <input type="text" className="form-control" value={softwareCode} readOnly />
                                  </div>
                                  <div>
                                    <label className="form-label">Internal Code / Design Code *</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.internalCode}
                                      onChange={(e) => handleGeneralChange('internalCode', e.target.value)}
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Article Name</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.articleName}
                                    onChange={(e) => handleGeneralChange('articleName', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Knitting Code (optional)</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.knittingCode}
                                    onChange={(e) => handleGeneralChange('knittingCode', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Vendor Code *</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.vendorCode}
                                    onChange={(e) => handleGeneralChange('vendorCode', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label">HSN Code</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.hsnCode}
                                      onChange={(e) => handleGeneralChange('hsnCode', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">GST</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.gst}
                                      onChange={(e) => handleGeneralChange('gst', e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Production Type *</label>
                                  <select
                                    className="form-control"
                                    value={generalForm.productionType}
                                    onChange={(e) => handleGeneralChange('productionType', e.target.value)}
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
                                    className="form-control"
                                    value={generalForm.factoryCode}
                                    onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="col-span-12">
                                  <div className="flex justify-between items-center mb-4">
                                    <label className="form-label">Style Codes</label>
                                    <button
                                      type="button"
                                      onClick={handleAddStyleCode}
                                      className="ti-btn ti-btn-primary"
                                    >
                                      <i className="ri-add-line me-2"></i> Add Style Code
                                    </button>
                                  </div>
                                  <div className="space-y-4">
                                    {styleCodes.map((styleCodeItem, index) => (
                                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                          <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                          {styleCodes.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveStyleCode(index)}
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
                                          browseDisabled={isLoading}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Description</label>
                                  <textarea 
                                    className="form-control" 
                                    rows={4}
                                    value={generalForm.description}
                                    onChange={(e) => handleGeneralChange('description', e.target.value)}
                                  ></textarea>
                                </div>
                              </>
                            )}
                            {isDesign && (
                              <>
                                <div>
                                  <label className="form-label">Product Name *</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.name}
                                    onChange={(e) => handleGeneralChange('name', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label">Software Code</label>
                                    <input type="text" className="form-control" value={softwareCode} readOnly />
                                  </div>
                                  <div>
                                    <label className="form-label">Internal Code / Design Code *</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.internalCode}
                                      onChange={(e) => handleGeneralChange('internalCode', e.target.value)}
                                      required
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Article Name</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.articleName}
                                    onChange={(e) => handleGeneralChange('articleName', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Knitting Code (optional)</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.knittingCode}
                                    onChange={(e) => handleGeneralChange('knittingCode', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Vendor Code *</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.vendorCode}
                                    onChange={(e) => handleGeneralChange('vendorCode', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label">HSN Code</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.hsnCode}
                                      onChange={(e) => handleGeneralChange('hsnCode', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">GST</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.gst}
                                      onChange={(e) => handleGeneralChange('gst', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="col-span-12 lg:col-span-4">
                          <div className="space-y-6">
                            {!isDesign && (
                              <div>
                                <label className="form-label">Category *</label>
                                <select 
                                  className="form-select"
                                  value={generalForm.category}
                                  onChange={(e) => handleGeneralChange('category', e.target.value)}
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
                            )}
                            {isDesign && (
                              <div>
                                <label className="form-label">Category *</label>
                                <select 
                                  className="form-select"
                                  value={generalForm.category}
                                  onChange={(e) => handleGeneralChange('category', e.target.value)}
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
                            )}
                            {!isDesign && (
                              <div>
                                <label className="form-label">Product Image</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="productImage"
                                    onChange={handleImageUpload}
                                  />
                                  <label htmlFor="productImage" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                      <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2"></i>
                                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                                      <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}
                            {isDesign && (
                              <div>
                                <label className="form-label">Product Image</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="productImage"
                                    onChange={handleImageUpload}
                                  />
                                  <label htmlFor="productImage" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                      <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2"></i>
                                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                                      <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Attributes Tab */}
                {activeTab === 'attributes' && (
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12">
                      <div className="grid grid-cols-2 gap-6">
                        {attributeDefinitions
                          .filter((attrDef) => {
                            // Brand and Pack are in Style Code section, not in Attributes form
                            const nameLower = attrDef.name.toLowerCase();
                            if (nameLower === 'brand' || nameLower === 'pack') return false;
                            if (isProduction) {
                              return nameLower === 'needles';
                            }
                            if (isFinal) {
                              return shouldShowAttributeForFinal(attrDef.name, isFinal);
                            }
                            if (isDesign) {
                              return shouldShowAttribute(attrDef.name, isDesign);
                            }
                            return true;
                          })
                          .map((attrDef) => {
                            const isNeedlesRequired = attrDef.name.toLowerCase() === 'needles' && (
                              isProduction || (isFinal && shouldShowAttributeForFinal(attrDef.name, isFinal)) ||
                              (isDesign && shouldShowAttribute(attrDef.name, isDesign)) || (!isDesign && !isFinal && !isProduction)
                            );
                            return (
                            <div key={attrDef.id} className="space-y-2">
                              <label className="form-label">{attrDef.name}{isNeedlesRequired ? ' *' : ''}</label>
                              <select 
                                className="form-select" 
                                disabled={isLoading}
                                value={formData[attrDef.name.toLowerCase()] || ''}
                                onChange={(e) => handleAttributeChange(attrDef.name.toLowerCase(), e.target.value)}
                              >
                                <option value="">Select {attrDef.name}</option>
                                {attrDef.optionValues.map((option) => (
                                  <option key={option._id} value={option.name}>
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );})}
                      </div>
                    </div>
                  </div>
                )}

                {/* BOM Tab */}
                {!isDesign && !isFinal && activeTab === 'bom' && (
                  <ProductBomTab
                    fabricItems={bomItems}
                    onFabricChange={setBomItems}
                    packagingItems={rawMaterialItems}
                    onPackagingChange={setRawMaterialItems}
                    disabled={isLoading}
                  />
                )}

                {/* Processes Tab */}
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
                      items={processItems}
                      availableProcesses={availableProcesses}
                      onChange={setProcessItems}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 mt-6">
                  <Link href="/catalog/items" className="ti-btn ti-btn-secondary">
                    Cancel
                  </Link>
                  <button 
                    type="submit" 
                    className="ti-btn ti-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <StyleCodeSelectModal
        open={styleCodeModalOpen}
        onClose={() => { setStyleCodeModalOpen(false); setStyleCodeModalIndex(null); }}
        onSelect={handleStyleCodeSelectFromModal}
      />
    </div>
  );
};

export default function AddProductPageWrapper() {
  return (
    <RequireCrudPermission path="Catalog.Items" action="create">
      <AddProductPage />
    </RequireCrudPermission>
  );
}
