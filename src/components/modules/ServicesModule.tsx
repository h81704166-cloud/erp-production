import React, { useState } from 'react';
import {
  Wrench,
  Calendar,
  Plus,
  Search,
  Clock,
  User,
  CheckCircle2,
  Edit3,
  Trash2,
  DollarSign,
  Phone,
  Briefcase,
  MapPin,
  Sparkles,
  Layers,
  ChevronDown,
  Upload
} from 'lucide-react';
import { ServiceCatalogItem, ServiceBooking, Company, Party, Sale, SaleItem, AdditionalCharge } from '../../types/erp';
import { ERPDatabase } from '../../services/db';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { CsvImportModal } from '../common/CsvImportModal';

interface ServicesModuleProps {
  company: Company;
  parties: Party[];
  onRefreshData: () => void;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({
  company,
  parties,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'quick_bill'>('bookings');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Database items
  const services: ServiceCatalogItem[] = ERPDatabase.getServices();
  const bookings: ServiceBooking[] = ERPDatabase.getServiceBookings();

  // Modals state
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceCatalogItem | null>(null);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ServiceBooking | null>(null);

  const [deleteServiceTarget, setDeleteServiceTarget] = useState<ServiceCatalogItem | null>(null);
  const [deleteBookingTarget, setDeleteBookingTarget] = useState<ServiceBooking | null>(null);

  // Industry Preset Picker Modal State
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Completed Bill Receipt State
  const [lastGeneratedSale, setLastGeneratedSale] = useState<Sale | null>(null);

  // Service Form State
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<string>('repair_maintenance');
  const [servicePrice, setServicePrice] = useState('200');
  const [serviceDuration, setServiceDuration] = useState('30');
  const [serviceGst, setServiceGst] = useState('0');
  const [serviceStaff, setServiceStaff] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');

  // Booking Form State
  const [bookingCustomerName, setBookingCustomerName] = useState('');
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState('');
  const [bookingServiceId, setBookingServiceId] = useState('');
  const [bookingLocationType, setBookingLocationType] = useState<'in_shop' | 'doorstep'>('in_shop');
  const [bookingAddress, setBookingAddress] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTimeSlot, setBookingTimeSlot] = useState('11:00 AM');
  const [bookingStaff, setBookingStaff] = useState('');
  const [bookingEstPrice, setBookingEstPrice] = useState('200');
  const [bookingAdvance, setBookingAdvance] = useState('0');
  const [bookingNotes, setBookingNotes] = useState('');

  // Quick Service Billing State
  const [quickBillCustomerName, setQuickBillCustomerName] = useState('Walk-in Customer');
  const [quickBillCustomerPhone, setQuickBillCustomerPhone] = useState('');
  const [selectedServicesList, setSelectedServicesList] = useState<{ service: ServiceCatalogItem; qty: number }[]>([]);
  const [quickBillAdditionalCharges, setQuickBillAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [isQuickBillChargeModalOpen, setIsQuickBillChargeModalOpen] = useState(false);
  const [quickChargeName, setQuickChargeName] = useState('Delivery / Doorstep Charge');
  const [quickChargeAmount, setQuickChargeAmount] = useState('50');
  const [quickChargeGstRate, setQuickChargeGstRate] = useState('18');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'khata'>('cash');
  const [discountAmount, setDiscountAmount] = useState('0');

  // --- Handlers: Service Catalog ---
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceName('');
    setServiceCategory('repair_maintenance');
    setServicePrice('200');
    setServiceDuration('30');
    setServiceGst('0');
    setServiceStaff('');
    setServiceDescription('');
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: ServiceCatalogItem) => {
    setEditingService(srv);
    setServiceName(srv.name);
    setServiceCategory(srv.category);
    setServicePrice(String(srv.price));
    setServiceDuration(String(srv.durationMins));
    setServiceGst(String(srv.gstRate));
    setServiceStaff(srv.assignedStaff || '');
    setServiceDescription(srv.description || '');
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    if (editingService) {
      ERPDatabase.updateService(editingService.id, {
        name: serviceName,
        category: serviceCategory,
        price: parseFloat(servicePrice) || 0,
        durationMins: parseInt(serviceDuration) || 30,
        gstRate: parseFloat(serviceGst) || 0,
        assignedStaff: serviceStaff,
        description: serviceDescription,
      });
    } else {
      ERPDatabase.addService({
        companyId: company.id,
        name: serviceName,
        category: serviceCategory,
        price: parseFloat(servicePrice) || 0,
        durationMins: parseInt(serviceDuration) || 30,
        gstRate: parseFloat(serviceGst) || 0,
        assignedStaff: serviceStaff,
        description: serviceDescription,
        status: 'active',
      });
    }

    setIsServiceModalOpen(false);
    onRefreshData();
  };

  const handleConfirmDeleteService = () => {
    if (!deleteServiceTarget) return;
    ERPDatabase.deleteService(deleteServiceTarget.id);
    setDeleteServiceTarget(null);
    onRefreshData();
  };

  // --- Generic Industry Preset Loaders ---
  const handleLoadPresetGroup = (groupType: 'repair' | 'salon' | 'laundry' | 'auto' | 'consulting') => {
    let presetsToAdd: { name: string; category: string; price: number; durationMins: number; assignedStaff: string }[] = [];

    switch (groupType) {
      case 'repair':
        presetsToAdd = [
          { name: 'AC Jet Cleaning & Service (एसी सर्विस)', category: 'repair_maintenance', price: 499, durationMins: 45, assignedStaff: 'AC Technician' },
          { name: 'RO Water Purifier Service (आरओ सर्विस)', category: 'repair_maintenance', price: 350, durationMins: 30, assignedStaff: 'RO Technician' },
          { name: 'Electrical Fault Check Visit (इलेक्ट्रिशियन)', category: 'repair_maintenance', price: 250, durationMins: 30, assignedStaff: 'Electrician' },
          { name: 'Plumbing Leak Repair Visit (प्लंबर सर्विस)', category: 'repair_maintenance', price: 300, durationMins: 35, assignedStaff: 'Plumber' },
        ];
        break;

      case 'salon':
        presetsToAdd = [
          { name: 'Haircut & Styling (हेयर कटिंग)', category: 'salon_beauty', price: 150, durationMins: 25, assignedStaff: 'Senior Stylist' },
          { name: 'Beard Grooming & Shave (दाढ़ी सेट/सेविंग)', category: 'salon_beauty', price: 80, durationMins: 15, assignedStaff: 'Senior Stylist' },
          { name: 'Glow Facial & Massage (फेशियल सर्विस)', category: 'salon_beauty', price: 450, durationMins: 45, assignedStaff: 'Beauty Specialist' },
          { name: 'Hair Color Application (हेयर कलर)', category: 'salon_beauty', price: 300, durationMins: 30, assignedStaff: 'Beauty Specialist' },
        ];
        break;

      case 'laundry':
        presetsToAdd = [
          { name: 'Clothes Steam Ironing (स्टीम प्रेस)', category: 'laundry_cleaning', price: 20, durationMins: 10, assignedStaff: 'Press Specialist' },
          { name: 'Suit / Coat Dry Cleaning (कोट ड्राई क्लीनिंग)', category: 'laundry_cleaning', price: 250, durationMins: 30, assignedStaff: 'Laundry Specialist' },
          { name: 'Heavy Blanket / Carpet Wash (कंबल धुलाई)', category: 'laundry_cleaning', price: 200, durationMins: 20, assignedStaff: 'Cleaning Staff' },
        ];
        break;

      case 'auto':
        presetsToAdd = [
          { name: 'Car Washing & Foam Polish (कार वाशिंग)', category: 'automobile_wash', price: 350, durationMins: 40, assignedStaff: 'Detailing Staff' },
          { name: 'Two-Wheeler Foam Wash & Lube (बाइक वाशिंग)', category: 'automobile_wash', price: 120, durationMins: 20, assignedStaff: 'Detailing Staff' },
          { name: 'Car Interior Deep Cleaning (कार इंटीरियर)', category: 'automobile_wash', price: 899, durationMins: 60, assignedStaff: 'Detailing Specialist' },
        ];
        break;

      case 'consulting':
        presetsToAdd = [
          { name: 'Professional On-Site Consultation (कंसल्टेशन)', category: 'professional_consulting', price: 500, durationMins: 60, assignedStaff: 'Consultant' },
          { name: 'Technical Diagnostics Visit (टेक्निकल विजिट)', category: 'professional_consulting', price: 350, durationMins: 45, assignedStaff: 'Tech Expert' },
        ];
        break;
    }

    presetsToAdd.forEach((p) => {
      ERPDatabase.addService({
        companyId: company.id,
        name: p.name,
        category: p.category,
        price: p.price,
        durationMins: p.durationMins,
        gstRate: 0,
        assignedStaff: p.assignedStaff,
        status: 'active',
      });
    });

    setIsPresetModalOpen(false);
    onRefreshData();
  };

  // --- Handlers: Service Bookings ---
  const handleOpenAddBooking = () => {
    setEditingBooking(null);
    setBookingCustomerName('');
    setBookingCustomerPhone('');
    setBookingServiceId(services[0]?.id || '');
    setBookingLocationType('in_shop');
    setBookingAddress('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTimeSlot('11:00 AM');
    setBookingStaff(services[0]?.assignedStaff || '');
    setBookingEstPrice(String(services[0]?.price || 200));
    setBookingAdvance('0');
    setBookingNotes('');
    setIsBookingModalOpen(true);
  };

  const handleSelectServiceInBooking = (srvId: string) => {
    setBookingServiceId(srvId);
    const selected = services.find((s) => s.id === srvId);
    if (selected) {
      setBookingEstPrice(String(selected.price));
      if (selected.assignedStaff) setBookingStaff(selected.assignedStaff);
    }
  };

  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCustomerName.trim() || !bookingServiceId) return;

    const srv = services.find((s) => s.id === bookingServiceId);
    const estPrice = parseFloat(bookingEstPrice) || 0;
    const advance = parseFloat(bookingAdvance) || 0;

    let payStatus: 'pending' | 'advance' | 'fully_paid' = 'pending';
    if (advance >= estPrice) payStatus = 'fully_paid';
    else if (advance > 0) payStatus = 'advance';

    if (editingBooking) {
      ERPDatabase.updateServiceBooking(editingBooking.id, {
        customerName: bookingCustomerName,
        customerPhone: bookingCustomerPhone,
        serviceId: bookingServiceId,
        serviceName: srv ? srv.name : 'Custom Service',
        category: srv ? srv.category : 'general',
        bookingDate,
        timeSlot: bookingTimeSlot,
        assignedStaff: bookingStaff,
        serviceAddress: bookingLocationType === 'doorstep' ? bookingAddress : undefined,
        estimatedPrice: estPrice,
        advancePaid: advance,
        paymentStatus: payStatus,
        notes: bookingNotes,
      });
    } else {
      ERPDatabase.addServiceBooking({
        companyId: company.id,
        customerName: bookingCustomerName,
        customerPhone: bookingCustomerPhone,
        serviceId: bookingServiceId,
        serviceName: srv ? srv.name : 'Custom Service',
        category: srv ? srv.category : 'general',
        bookingDate,
        timeSlot: bookingTimeSlot,
        assignedStaff: bookingStaff,
        serviceAddress: bookingLocationType === 'doorstep' ? bookingAddress : undefined,
        estimatedPrice: estPrice,
        advancePaid: advance,
        status: 'booked',
        paymentStatus: payStatus,
        notes: bookingNotes,
      });
    }

    setIsBookingModalOpen(false);
    onRefreshData();
  };

  const handleUpdateBookingStatus = (booking: ServiceBooking, newStatus: 'booked' | 'in_progress' | 'completed' | 'cancelled') => {
    ERPDatabase.updateServiceBooking(booking.id, { status: newStatus });
    onRefreshData();
  };

  const handleConfirmDeleteBooking = () => {
    if (!deleteBookingTarget) return;
    ERPDatabase.deleteServiceBooking(deleteBookingTarget.id);
    setDeleteBookingTarget(null);
    onRefreshData();
  };

  // Convert Booking to Final Service Bill
  const handleConvertBookingToBill = (booking: ServiceBooking) => {
    const saleItem: SaleItem = {
      productId: `service-${booking.serviceId}`,
      productName: `[SERVICE] ${booking.serviceName}`,
      sku: 'SRV',
      unit: 'service',
      hsnCode: '9997',
      unitPrice: booking.estimatedPrice,
      qty: 1,
      discountAmount: 0,
      taxableAmount: booking.estimatedPrice,
      gstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: booking.estimatedPrice,
    };

    const grandTotal = booking.estimatedPrice;

    const newSale = ERPDatabase.addSale({
      companyId: company.id,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      items: [saleItem],
      subtotal: grandTotal,
      totalDiscount: 0,
      totalTaxable: grandTotal,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      totalTax: 0,
      grandTotal,
      paidAmount: grandTotal,
      dueAmount: 0,
      paymentMode: 'cash',
      status: 'completed',
      billedByName: 'Service Desk',
    });

    // Update booking status
    ERPDatabase.updateServiceBooking(booking.id, {
      status: 'completed',
      paymentStatus: 'fully_paid',
      invoiceNo: newSale.invoiceNo,
    });

    setLastGeneratedSale(newSale);
    onRefreshData();
  };

  // --- Handlers: Quick Direct Service Billing ---
  const handleAddServiceToQuickBill = (srv: ServiceCatalogItem) => {
    setSelectedServicesList((prev) => {
      const existing = prev.find((item) => item.service.id === srv.id);
      if (existing) {
        return prev.map((item) => (item.service.id === srv.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { service: srv, qty: 1 }];
    });
  };

  const handleUpdateQuickBillQty = (srvId: string, delta: number) => {
    setSelectedServicesList((prev) =>
      prev
        .map((item) => {
          if (item.service.id === srvId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { service: ServiceCatalogItem; qty: number }[]
    );
  };

  const handleAddQuickChargeSubmit = () => {
    const amt = parseFloat(quickChargeAmount) || 0;
    const gstRate = parseFloat(quickChargeGstRate) || 0;
    if (!quickChargeName.trim() || amt <= 0) {
      alert('Please enter a valid charge name and amount.');
      return;
    }

    const tax = (amt * gstRate) / 100;
    const newCharge: AdditionalCharge = {
      id: `chg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: quickChargeName.trim(),
      amount: amt,
      gstRate,
      taxableAmount: amt,
      cgstAmount: tax / 2,
      sgstAmount: tax / 2,
      igstAmount: 0,
      totalAmount: amt + tax,
    };

    setQuickBillAdditionalCharges((prev) => [...prev, newCharge]);
    setIsQuickBillChargeModalOpen(false);
  };

  const removeQuickCharge = (id: string) => {
    setQuickBillAdditionalCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const handleGenerateQuickBill = () => {
    if (selectedServicesList.length === 0) return;

    let totalAmount = 0;
    const items: SaleItem[] = selectedServicesList.map((entry) => {
      const lineTotal = entry.service.price * entry.qty;
      totalAmount += lineTotal;
      return {
        productId: `srv-${entry.service.id}`,
        productName: `[SERVICE] ${entry.service.name}`,
        sku: 'SRV',
        unit: 'job',
        hsnCode: '9997',
        unitPrice: entry.service.price,
        qty: entry.qty,
        discountAmount: 0,
        taxableAmount: lineTotal,
        gstRate: entry.service.gstRate || 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalAmount: lineTotal,
      };
    });

    const totalAddCharges = quickBillAdditionalCharges.reduce((acc, c) => acc + c.totalAmount, 0);
    const totalAddTaxable = quickBillAdditionalCharges.reduce((acc, c) => acc + c.taxableAmount, 0);
    const totalAddTax = quickBillAdditionalCharges.reduce((acc, c) => acc + c.cgstAmount + c.sgstAmount, 0);

    const disc = parseFloat(discountAmount) || 0;
    const finalGrandTotal = Math.max(0, totalAmount + totalAddCharges - disc);

    const newSale = ERPDatabase.addSale({
      companyId: company.id,
      customerName: quickBillCustomerName || 'Walk-in Customer',
      customerPhone: quickBillCustomerPhone || '',
      items,
      additionalCharges: quickBillAdditionalCharges,
      totalAdditionalCharges: totalAddCharges,
      subtotal: totalAmount,
      totalDiscount: disc,
      totalTaxable: totalAmount + totalAddTaxable,
      totalCgst: totalAddTax / 2,
      totalSgst: totalAddTax / 2,
      totalIgst: 0,
      totalTax: totalAddTax,
      grandTotal: finalGrandTotal,
      paidAmount: paymentMode === 'khata' ? 0 : finalGrandTotal,
      dueAmount: paymentMode === 'khata' ? finalGrandTotal : 0,
      paymentMode: paymentMode,
      status: 'completed',
      billedByName: 'Service Desk',
    });

    setLastGeneratedSale(newSale);
    setSelectedServicesList([]);
    setQuickBillAdditionalCharges([]);
    setDiscountAmount('0');
    onRefreshData();
  };

  // Filtering
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.assignedStaff && s.assignedStaff.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === 'all' || s.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Universal Category Badge Label helper
  const renderCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'repair_maintenance':
        return <Badge variant="amber">🛠️ Repair & Maintenance</Badge>;
      case 'salon_beauty':
        return <Badge variant="purple">💈 Salon & Beauty</Badge>;
      case 'laundry_cleaning':
        return <Badge variant="sky">🧺 Laundry & Cleaning</Badge>;
      case 'automobile_wash':
        return <Badge variant="indigo">🚗 Auto & Detailing</Badge>;
      case 'professional_consulting':
        return <Badge variant="emerald">💼 Professional Visit</Badge>;
      default:
        return <Badge variant="gray">✨ General Service</Badge>;
    }
  };

  // Status Badge helper
  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'booked':
        return <Badge variant="amber">📅 Booked</Badge>;
      case 'in_progress':
        return <Badge variant="sky">⏳ In Progress</Badge>;
      case 'completed':
        return <Badge variant="emerald">✅ Completed</Badge>;
      case 'cancelled':
        return <Badge variant="rose">❌ Cancelled</Badge>;
      default:
        return <Badge variant="gray">{st}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Universal Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-lg border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-400" />
            <h1 className="text-xl font-black tracking-tight">Service & Booking Desk (सर्विस & बुकिंग मैनेजमेंट)</h1>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Universal desk for Repair Technicians, Salons, Laundry, Auto Detailing, Doorstep Visits & Consultations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow transition-colors"
            title="Import Services from CSV"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 font-bold text-xs rounded-xl border border-indigo-600/50 flex items-center gap-1.5 cursor-pointer shadow"
            title="Load sample service presets for your business type"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Load Industry Presets</span>
          </button>
          <button
            onClick={handleOpenAddBooking}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>+ New Booking (बुकिंग रखें)</span>
          </button>
          <button
            onClick={handleOpenAddService}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Service (सर्विस जोड़ें)</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'bookings'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Appointments & Bookings ({bookings.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'services'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Service Catalog ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('quick_bill')}
            className={`px-4 py-2.5 font-bold text-xs border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'quick_bill'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span>Quick Service Billing (डायरेक्ट बिलिंग)</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64 mb-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search service or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tab 1: Bookings & Appointments List */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
              >
                <option value="all">All Bookings</option>
                <option value="booked">Booked (Scheduled)</option>
                <option value="in_progress">In Progress (जारी है)</option>
                <option value="completed">Completed (पूरा हुआ)</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Showing {filteredBookings.length} booking records
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="p-3">Booking #</th>
                  <th className="p-3">Customer Details</th>
                  <th className="p-3">Service Name</th>
                  <th className="p-3">Assigned Staff / Tech</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3 text-right">Estimated Fee (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No service bookings found. Click "+ New Booking" to schedule a customer appointment or doorstep visit.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {b.bookingNo}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{b.customerName}</div>
                        {b.customerPhone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />
                            <span>{b.customerPhone}</span>
                          </div>
                        )}
                        {b.serviceAddress && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{b.serviceAddress}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{b.serviceName}</div>
                        <div className="mt-1">{renderCategoryBadge(b.category)}</div>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {b.assignedStaff || 'Unassigned'}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{b.bookingDate}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{b.timeSlot}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        ₹{b.estimatedPrice.toLocaleString()}
                        {b.advancePaid > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            Adv: ₹{b.advancePaid}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {renderStatusBadge(b.status)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {b.status === 'booked' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(b, 'in_progress')}
                              className="px-2 py-1 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-bold rounded-lg hover:bg-sky-200 transition-colors cursor-pointer"
                              title="Mark In Progress"
                            >
                              Start
                            </button>
                          )}
                          {b.status !== 'completed' && b.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleConvertBookingToBill(b)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow cursor-pointer flex items-center gap-1"
                              title="Complete & Generate Invoice"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Complete & Bill</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteBookingTarget(b)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Service Catalog List */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Category Filter:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
              >
                <option value="all">All Service Categories</option>
                <option value="repair_maintenance">🛠️ Repair & Maintenance</option>
                <option value="salon_beauty">💈 Salon & Beauty</option>
                <option value="laundry_cleaning">🧺 Laundry & Cleaning</option>
                <option value="automobile_wash">🚗 Auto & Detailing</option>
                <option value="professional_consulting">💼 Professional Visit</option>
                <option value="general">✨ General Services</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map((srv) => (
              <div
                key={srv.id}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm">{srv.name}</h3>
                    <div className="mt-1">{renderCategoryBadge(srv.category)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{srv.price}
                    </span>
                  </div>
                </div>

                {srv.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {srv.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <div className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{srv.durationMins} mins</span>
                  </div>
                  {srv.assignedStaff && (
                    <div className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{srv.assignedStaff}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditService(srv)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg cursor-pointer"
                    title="Edit Service"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteServiceTarget(srv)}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                    title="Delete Service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddServiceToQuickBill(srv);
                      setActiveTab('quick_bill');
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Bill</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Quick Direct Service Billing */}
      {activeTab === 'quick_bill' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Service Selector Panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span>Select Services (सर्विस चुनें)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {services.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => handleAddServiceToQuickBill(srv)}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 rounded-xl text-left transition-all group cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {srv.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {srv.durationMins} mins {srv.assignedStaff && `• ${srv.assignedStaff}`}
                      </div>
                    </div>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                      +₹{srv.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Service Cart & Billing Summary */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
                Service Invoice Summary (सर्विस बिल)
              </h3>

              {/* Customer Info */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Customer Name / Client (ग्राहक का नाम)
                </label>
                <input
                  type="text"
                  value={quickBillCustomerName}
                  onChange={(e) => setQuickBillCustomerName(e.target.value)}
                  placeholder="e.g. Walk-in or Client Name"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />

                <input
                  type="text"
                  value={quickBillCustomerPhone}
                  onChange={(e) => setQuickBillCustomerPhone(e.target.value)}
                  placeholder="Mobile Number (optional)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
                />
              </div>

              {/* Selected Services List */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Selected Services ({selectedServicesList.length})
                </label>

                {selectedServicesList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    Click services from the left panel to add to this invoice.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedServicesList.map((item) => (
                      <div
                        key={item.service.id}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {item.service.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ₹{item.service.price} × {item.qty} = ₹{item.service.price * item.qty}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuickBillQty(item.service.id, -1)}
                            className="w-6 h-6 bg-slate-200 dark:bg-slate-700 font-bold rounded cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-5 text-center font-bold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuickBillQty(item.service.id, 1)}
                            className="w-6 h-6 bg-slate-200 dark:bg-slate-700 font-bold rounded cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Service Charges (Delivery, Visit Fee, Labour) */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Additional Service Charges (अतिरिक्त शुल्क)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickChargeName('Delivery / Doorstep Charge');
                      setQuickChargeAmount('50');
                      setQuickChargeGstRate('18');
                      setIsQuickBillChargeModalOpen(true);
                    }}
                    className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded border border-blue-200 dark:border-blue-800 flex items-center gap-1 hover:bg-blue-100"
                  >
                    <Plus className="w-3 h-3" /> Add Charge
                  </button>
                </div>

                {/* Quick Presets for Quick Bill */}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const tax = (50 * 18) / 100;
                      setQuickBillAdditionalCharges((prev) => [
                        ...prev,
                        {
                          id: `chg-${Date.now()}`,
                          name: 'Delivery Charge',
                          amount: 50,
                          gstRate: 18,
                          taxableAmount: 50,
                          cgstAmount: tax / 2,
                          sgstAmount: tax / 2,
                          igstAmount: 0,
                          totalAmount: 50 + tax,
                        },
                      ]);
                    }}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    🚚 +Delivery (₹50+18% GST)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tax = (100 * 18) / 100;
                      setQuickBillAdditionalCharges((prev) => [
                        ...prev,
                        {
                          id: `chg-${Date.now()}`,
                          name: 'Visiting / Labour Fee',
                          amount: 100,
                          gstRate: 18,
                          taxableAmount: 100,
                          cgstAmount: tax / 2,
                          sgstAmount: tax / 2,
                          igstAmount: 0,
                          totalAmount: 100 + tax,
                        },
                      ]);
                    }}
                    className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-[10px] font-bold text-slate-700 dark:text-slate-300 rounded flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                  >
                    🔧 +Visit Fee (₹100+18% GST)
                  </button>
                </div>

                {quickBillAdditionalCharges.length > 0 && (
                  <div className="space-y-1 bg-blue-50/50 dark:bg-slate-800/80 p-2 rounded-xl border border-blue-100 dark:border-slate-700">
                    {quickBillAdditionalCharges.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                        <span className="font-semibold">
                          {ch.name} {ch.gstRate > 0 ? `(${ch.gstRate}% GST)` : ''}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">₹{ch.totalAmount.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => removeQuickCharge(ch.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                            title="Remove Charge"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Mode
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  {(['cash', 'upi', 'card', 'khata'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 rounded-xl border text-center capitalize cursor-pointer transition-colors ${
                        paymentMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Totals & Submit */}
              {selectedServicesList.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-sm font-black">
                    <span className="text-slate-600 dark:text-slate-400">Total Payable:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                      ₹
                      {selectedServicesList
                        .reduce((sum, i) => sum + i.service.price * i.qty, 0)
                        .toLocaleString()}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateQuickBill}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Generate Service Bill (₹)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Industry Presets Selector */}
      {isPresetModalOpen && (
        <Modal
          isOpen={isPresetModalOpen}
          onClose={() => setIsPresetModalOpen(false)}
          title="Select Business Presets to Load"
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 dark:text-slate-400">
              Choose your business type to quickly import standard service catalog items:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleLoadPresetGroup('repair')}
                className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 hover:border-amber-500 rounded-xl text-left cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                  <span>🛠️ Appliance & Repair</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  AC Jet Service, RO Repair, Electrical Check, Plumbing Leak Visit
                </p>
              </button>

              <button
                onClick={() => handleLoadPresetGroup('salon')}
                className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 hover:border-purple-500 rounded-xl text-left cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-purple-900 dark:text-purple-300 text-sm flex items-center gap-1.5">
                  <span>💈 Salon & Beauty</span>
                </div>
                <p className="text-[11px] text-purple-700 dark:text-purple-400">
                  Haircut, Beard Grooming, Glow Facial, Hair Coloring
                </p>
              </button>

              <button
                onClick={() => handleLoadPresetGroup('laundry')}
                className="p-3.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 hover:border-sky-500 rounded-xl text-left cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-sky-900 dark:text-sky-300 text-sm flex items-center gap-1.5">
                  <span>🧺 Laundry & Dry Cleaning</span>
                </div>
                <p className="text-[11px] text-sky-700 dark:text-sky-400">
                  Steam Ironing, Suit Dry Clean, Heavy Blanket Washing
                </p>
              </button>

              <button
                onClick={() => handleLoadPresetGroup('auto')}
                className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 rounded-xl text-left cursor-pointer transition-all space-y-1"
              >
                <div className="font-bold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-1.5">
                  <span>🚗 Auto & Wash</span>
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  Car Foam Wash, Bike General Wash, Interior Deep Cleaning
                </p>
              </button>
            </div>

            <button
              onClick={() => handleLoadPresetGroup('consulting')}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-xl text-left cursor-pointer transition-all space-y-0.5"
            >
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>💼 Professional Consultancy & Site Visit</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                On-site Consultation Visit, Technical Inspection Fee
              </p>
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Add/Edit Service */}
      {isServiceModalOpen && (
        <Modal
          isOpen={isServiceModalOpen}
          onClose={() => setIsServiceModalOpen(false)}
          title={editingService ? 'Edit Service Details' : 'Add New Service (सर्विस जोड़े)'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveService} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Service Name (सर्विस का नाम) *
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. AC Jet Service, Hair Styling, RO Repair Visit"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category (श्रेणी)
                </label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="repair_maintenance">🛠️ Repair & Maintenance</option>
                  <option value="salon_beauty">💈 Salon & Beauty</option>
                  <option value="laundry_cleaning">🧺 Laundry & Cleaning</option>
                  <option value="automobile_wash">🚗 Auto & Detailing</option>
                  <option value="professional_consulting">💼 Professional Visit</option>
                  <option value="general">✨ General Service</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service Rate / Fee (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={serviceDuration}
                  onChange={(e) => setServiceDuration(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Technician / Staff
                </label>
                <input
                  type="text"
                  value={serviceStaff}
                  onChange={(e) => setServiceStaff(e.target.value)}
                  placeholder="e.g. Technician Name"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Description / Scope of Work
              </label>
              <textarea
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                rows={2}
                placeholder="Details about what is included in this service..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md cursor-pointer"
              >
                Save Service
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: New / Edit Booking */}
      {isBookingModalOpen && (
        <Modal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          title={editingBooking ? `Edit Booking ${editingBooking.bookingNo}` : 'New Booking / Visit (बुकिंग रखें)'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveBooking} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={bookingCustomerName}
                  onChange={(e) => setBookingCustomerName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={bookingCustomerPhone}
                  onChange={(e) => setBookingCustomerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            {/* Service Location Type */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-700 dark:text-slate-300">
                Service Mode (सर्विस स्थान)
              </label>
              <div className="grid grid-cols-2 gap-2 font-bold">
                <button
                  type="button"
                  onClick={() => setBookingLocationType('in_shop')}
                  className={`p-2 rounded-xl border text-center cursor-pointer transition-colors ${
                    bookingLocationType === 'in_shop'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🏪 In-Shop Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setBookingLocationType('doorstep')}
                  className={`p-2 rounded-xl border text-center cursor-pointer transition-colors ${
                    bookingLocationType === 'doorstep'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  🚗 Doorstep Visit
                </button>
              </div>
            </div>

            {bookingLocationType === 'doorstep' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doorstep / Site Address (पता)
                </label>
                <input
                  type="text"
                  value={bookingAddress}
                  onChange={(e) => setBookingAddress(e.target.value)}
                  placeholder="Full address for doorstep technician visit..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Service (सर्विस चुनें) *
              </label>
              <select
                value={bookingServiceId}
                onChange={(e) => handleSelectServiceInBooking(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
              >
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — ₹{srv.price}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Booking Date *
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Time Slot / Preferred Time
                </label>
                <input
                  type="text"
                  value={bookingTimeSlot}
                  onChange={(e) => setBookingTimeSlot(e.target.value)}
                  placeholder="e.g. 11:00 AM or Morning Slot"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Tech/Staff
                </label>
                <input
                  type="text"
                  value={bookingStaff}
                  onChange={(e) => setBookingStaff(e.target.value)}
                  placeholder="Staff Name"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Charge (₹)
                </label>
                <input
                  type="number"
                  value={bookingEstPrice}
                  onChange={(e) => setBookingEstPrice(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Advance Paid (₹)
                </label>
                <input
                  type="number"
                  value={bookingAdvance}
                  onChange={(e) => setBookingAdvance(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Work Details
              </label>
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                rows={2}
                placeholder="Any special instructions or complaint details..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md cursor-pointer"
              >
                Save Booking
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Quick Service Charge Modal */}
      <Modal
        isOpen={isQuickBillChargeModalOpen}
        onClose={() => setIsQuickBillChargeModalOpen(false)}
        title="Add Service Charge (अतिरिक्त सेवा शुल्क)"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Add delivery charges, technician visit fees, doorstep pick & drop, or packing charges with GST.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
              Charge Title / Name
            </label>
            <input
              type="text"
              value={quickChargeName}
              onChange={(e) => setQuickChargeName(e.target.value)}
              placeholder="e.g. Delivery Charge, Visit Fee, Doorstep Charge"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                Charge Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={quickChargeAmount}
                onChange={(e) => setQuickChargeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-emerald-300 uppercase mb-1">
                GST Tax Rate (%)
              </label>
              <select
                value={quickChargeGstRate}
                onChange={(e) => setQuickChargeGstRate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-emerald-300"
              >
                <option value="0">Exempt / 0% GST</option>
                <option value="5">5% GST</option>
                <option value="12">12% GST</option>
                <option value="18">18% GST (Services)</option>
                <option value="28">28% GST</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Base Amount:</span>
              <span className="font-bold">₹{(parseFloat(quickChargeAmount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GST Tax ({quickChargeGstRate}%):</span>
              <span className="font-bold">
                +₹{(((parseFloat(quickChargeAmount) || 0) * (parseFloat(quickChargeGstRate) || 0)) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 dark:text-emerald-300 font-extrabold pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Total Charge to Bill:</span>
              <span>
                ₹
                {(
                  (parseFloat(quickChargeAmount) || 0) +
                  ((parseFloat(quickChargeAmount) || 0) * (parseFloat(quickChargeGstRate) || 0)) / 100
                ).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsQuickBillChargeModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAddQuickChargeSubmit}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Add to Bill
            </button>
          </div>
        </div>
      </Modal>

      {/* Generated Bill Receipt Modal */}
      {lastGeneratedSale && (
        <Modal
          isOpen={!!lastGeneratedSale}
          onClose={() => setLastGeneratedSale(null)}
          title={`Service Invoice ${lastGeneratedSale.invoiceNo}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="font-black text-emerald-800 dark:text-emerald-300 text-sm">
                Service Bill Generated Successfully!
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Invoice #{lastGeneratedSale.invoiceNo} • Total: ₹{lastGeneratedSale.grandTotal}
              </p>
            </div>

            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex justify-between font-bold">
                <span>Customer:</span>
                <span>{lastGeneratedSale.customerName}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                <span>Grand Total:</span>
                <span>₹{lastGeneratedSale.grandTotal}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLastGeneratedSale(null)}
                className="px-4 py-2 font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Service Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteServiceTarget}
        onClose={() => setDeleteServiceTarget(null)}
        onConfirm={handleConfirmDeleteService}
        title="Delete Service"
        message={`Are you sure you want to PERMANENTLY DELETE service "${deleteServiceTarget?.name}"?`}
      />

      {/* Delete Booking Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteBookingTarget}
        onClose={() => setDeleteBookingTarget(null)}
        onConfirm={handleConfirmDeleteBooking}
        title="Delete Booking"
        message={`Are you sure you want to PERMANENTLY DELETE booking ${deleteBookingTarget?.bookingNo} for ${deleteBookingTarget?.customerName}?`}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        company={company}
        onRefreshData={onRefreshData}
        defaultType="services"
      />
    </div>
  );
};
