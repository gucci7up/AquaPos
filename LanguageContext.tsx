import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type Language = 'en' | 'es';

const LanguageContext = createContext<any>(null);

const translations = {
  en: {
    userMenu: {
      profile: "Profile",
      settings: "Settings",
      logout: "Sign Out",
      account: "Account"
    },
    auth: {
      welcomeBack: "Welcome Back",
      welcomeSubtitle: "Enter your credentials to access your workspace.",
      createAccount: "Create Account",
      createSubtitle: "Start your 14-day free trial today.",
      email: "Work Email",
      password: "Password",
      fullName: "Full Name",
      companyName: "Company Name",
      forgotPassword: "Forgot Password?",
      login: "Sign In",
      register: "Start Free Trial",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      signUp: "Sign Up",
      signIn: "Sign In",
      or: "OR CONTINUE WITH",
      terms: "By clicking continue, you agree to our Terms of Service and Privacy Policy."
    },
    landing: {
      nav: {
        solutions: "Solutions",
        why: "Why AquaPos",
        pricing: "Pricing",
        login: "Login",
        start: "Start Free Trial"
      },
      hero: {
        new: "New: AquaAI v2.0",
        title: "The Operating System for",
        titleHighlight: "Your Business",
        subtitle: "High-performance Point of Sale, intelligent inventory management, and 4-decimal precision finance. Everything your enterprise needs in one platform.",
        demo: "Watch Demo",
        noCard: "No credit card required · 14 days free"
      },
      solutions: {
        title: "Solutions Tailored to You",
        subtitle: "Adapted to the specific needs of leading businesses in Latin America.",
        retail: { title: "Retail", desc: "Real-time stock management, multiple branches, and unlimited barcodes." },
        restaurant: { title: "Restaurants & Cafes", desc: "Order management, table tracking, and ingredient inventory. Integrated with delivery apps." },
        wholesale: { title: "Wholesalers", desc: "Bulk handling, volume pricing, and automated customer credit tracking." },
        digital: { title: "Digital Sellers", desc: "Social media sync, payment links, and instant electronic invoicing." },
        learnMore: "Learn more"
      },
      features: {
        title: "Enterprise Power at your fingertips",
        subtitle: "We are not just a cash register. We are the engine driving your growth with cutting-edge technology.",
        sync: { title: "Local-First Sync", desc: "Internet down? No problem. AquaPos works offline and syncs your sales as soon as you reconnect." },
        precision: { title: "4-Decimal Precision", desc: "Ideal for weight-based sales or currency exchange. Not a cent is lost in rounding errors." },
        ai: { title: "AquaAI Insights", desc: "Artificial intelligence that predicts stock shortages and recommends dynamic pricing based on the market." }
      },
      pricing: {
        title: "Flexible Plans",
        subtitle: "Scale AquaPos as your business grows. No forced contracts.",
        monthly: "/mo",
        annual: "Billed annually",
        start: "Start Free",
        choose: "Choose",
        contact: "Contact Sales",
        mostPopular: "Most Popular",
        plans: {
          free: "Entrepreneur",
          pro: "Professional",
          growth: "Growth",
          corp: "Corporate"
        },
        features: {
          free: ["1 User", "100 Products", "Basic Invoicing"],
          pro: ["3 Users", "Unlimited Products", "Sales Reports", "Local-First Sync"],
          growth: ["10 Users", "AquaAI Basic", "Electronic Invoicing", "API Access"],
          corp: ["Unlimited Users", "AquaAI Enterprise", "Account Manager", "White Label Ready"]
        }
      },
      footer: {
        desc: "The first enterprise operating system designed for SMEs in Latin America. High performance and simplicity.",
        product: "Product",
        company: "Company",
        support: "Support",
        privacy: "Privacy",
        terms: "Terms",
        cookies: "Cookies"
      },
      form: {
        title: "Schedule a Demo",
        subtitle: "Fill out the form below and our team will contact you shortly.",
        name: "Full Name",
        email: "Work Email",
        company: "Company Name",
        message: "How can we help?",
        submit: "Submit Request",
        success: "Request Sent Successfully!"
      }
    },
    sidebar: {
      mainMenu: "Main Menu",
      dashboard: "Dashboard",
      pos: "POS",
      inventory: "Inventory",
      sales: "Sales",
      quotes: "Quotes",
      finance: "Finance",
      customers: "Customers",
      suppliers: "Suppliers & Purchasing",
      intelligence: "Intelligence",
      ai: "AquaAI",
      settings: "Settings",
      support: "Support",
      subscriptions: "Subscriptions",
      new: "New"
    },
    common: {
      days: { Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat", Sun: "Sun" },
      months: { Oct: "Oct", Nov: "Nov" },
      status: {
        Active: "Active",
        Inactive: "Inactive",
        Blocked: "Blocked",
        Pending: "Pending",
        Completed: "Completed",
        Shipped: "Shipped",
        Draft: "Draft",
        Sent: "Sent",
        Expired: "Expired",
        Converted: "Converted",
        Paid: "Paid",
        Overdue: "Overdue",
        Received: "Received",
        Ordered: "Ordered",
        Cancelled: "Cancelled"
      },
      roles: {
        Owner: "Owner",
        Admin: "Admin",
        Cashier: "Cashier",
        Viewer: "Viewer"
      },
      permissions: {
        full: "Full system access",
        all_except_billing: "All except Billing",
        sales_only: "Sales & POS only"
      }
    },
    data: {
      categories: {
        All: "All Items",
        Apparel: "Apparel",
        Grocery: "Grocery",
        Electronics: "Electronics",
        Home: "Home",
        Fitness: "Fitness",
        General: "General",
        Accessories: "Accessories",
        Perfumes: "Perfumes",
        Beauty: "Beauty",
        Beverages: "Beverages",
        Bakery: "Bakery",
        Snacks: "Snacks",
        Produce: "Produce"
      },
      sort: {
        LastUpdated: "Last Updated",
        Name: "Name",
        Stock: "Stock",
        Price: "Price"
      },
      filters: {
        All: "All",
        InStock: "In Stock",
        LowStock: "Low Stock",
        OutOfStock: "Out of Stock"
      }
    },
    dashboard: {
      searchPlaceholder: "Search sales, products, or customers...",
      welcomeTitle: "Business Overview",
      welcomeSubtitle: "Welcome back, here's what's happening",
      today: "today",
      lastWeek: "last week",
      dateRange: "Oct 24 - Oct 31",
      newOrder: "New Order",
      totalSales: "Total Sales",
      netProfit: "Net Profit (Oct)",
      lowStock: "Low Stock Alerts",
      activeQuotes: "Active Quotes",
      revenueTrends: "Revenue Trends",
      revenueSubtitle: "Weekly revenue performance",
      aiInsights: "AquaAI Insights",
      inventoryWarning: "Inventory Warning",
      restock: "Restock Now",
      peakHours: "Peak Hours",
      viewReport: "View Full Report",
      recentTx: "Recent Transactions",
      viewAll: "View All",
      overdueAlert: "Action Required: Overdue Payments",
      overdueDesc: "customer credit accounts past their due date.",
      viewCustomers: "View Customers",
      actions: {
        viewDetails: "View Details",
        printReceipt: "Print Receipt",
        sendEmail: "Resend Email",
        refund: "Issue Refund"
      }
    },
    pos: {
      searchPlaceholder: "Quick Scan or Search Products (F1)...",
      addCustomer: "Add Customer",
      currentTicket: "Current Ticket",
      clearCart: "Clear Cart",
      emptyCart: "Cart is empty",
      subtotal: "Subtotal",
      tax: "Tax",
      discount: "Loyalty Discount",
      total: "Total Amount",
      checkout: "PROCESS CHECKOUT",
      selectCustomer: "Select Customer",
      search: "Search",
      create: "Create New",
      searchCustomerPlaceholder: "Search by name or email...",
      payMethod: "Select Payment Method",
      payCash: "Cash",
      payCard: "Credit/Debit Card",
      payCredit: "Credit / Pay Later",
      amountTendered: "Amount Tendered",
      completePayment: "Complete Payment",
      confirmCredit: "Confirm Credit",
      processing: "Processing Transaction...",
      success: "Order Confirmed!",
      receiptSent: "Receipt has been sent to email.",
      newOrder: "Start New Order",
      creditRecorded: "Credit Recorded",
      creditReminder: "Reminder set for",
      back: "Back",
      initialDeposit: "Initial Deposit (Optional)",
      dueDate: "Payment Due Date",
      balanceRemaining: "Balance Remaining"
    },
    inventory: {
      title: "Inventory Management",
      subtitle: "Manage your enterprise product catalog and omnichannel variations.",
      manageCategories: "Manage Categories",
      addProduct: "Add Product",
      allCategories: "All Categories",
      allProducts: "All Products",
      inStock: "In Stock",
      lowStock: "Low Stock",
      outOfStock: "Out of Stock",
      sortedBy: "Sorted by:",
      table: {
        name: "Name",
        sku: "SKU / Barcode",
        category: "Category",
        stock: "Stock Level",
        cost: "Unit Cost",
        price: "Selling Price",
        actions: "Actions"
      },
      editProduct: "Edit Product",
      addNewProduct: "Add New Product",
      saveProduct: "Save Product",
      cancel: "Cancel",
      quickInsights: "Quick Insights",
      projectedStockout: "Projected Stockout",
      reorderSuggestions: "Reorder Suggestions",
      totalValue: "Total Inventory Value",
      activeSkus: "Active SKUs"
    },
    finance: {
      title: "Finance & Accounting",
      subtitle: "Comprehensive financial tracking, P&L, and margin analysis.",
      period: { month: "This Month", year: "This Year" },
      kpi: {
        revenue: "Total Revenue",
        cogs: "Cost of Goods Sold",
        expenses: "Operating Expenses",
        netProfit: "Net Profit",
        netProfitSub: "Revenue - COGS",
        grossProfit: "Gross Profit",
        margin: "Margin",
        ofRevenue: "of Revenue",
        inventoryValue: "Inventory Value (Cost)",
        retail: "Retail",
        pendingCredit: "Pending Customer Credit",
        customersWithDebt: "customers in debt",
        abonos: "Payments Received",
        payments: "payments recorded",
        sales: "sales",
        inventoryPotential: "Inventory Potential Gain",
        inventoryPotentialSub: "Retail vs Cost difference"
      },
      charts: {
        profitability: "Profitability Analysis",
        revenueVsCost: "Revenue vs Cost",
        revenueVsCostSub: "Gross profit breakdown",
        expensesBreakdown: "Expenses Breakdown",
        abonos: "Monthly Payments Received",
        abonosSub: "Customer payments toward their credit balance"
      },
      table: {
        title: "Product Margin Analysis",
        subtitle: "Unit profitability of current inventory",
        product: "Product",
        category: "Category",
        unitCost: "Unit Cost",
        unitPrice: "Unit Price",
        margin: "Margin ($)",
        marginPercent: "Margin (%)",
        roi: "ROI",
        products: "products",
        noProducts: "No products in inventory."
      },
      pnl: {
        title: "Profit & Loss Statement",
        grossProfit: "Gross Profit",
        operatingIncome: "Operating Income",
        netIncome: "NET INCOME"
      },
      inventoryValuation: {
        title: "Inventory Valuation",
        atCost: "At Cost",
        atRetail: "At Retail Price",
        potentialProfit: "Potential Profit"
      }
    },
    sales: {
      title: "Sales History & Analytics",
      subtitle: "Track performance and manage historical transaction data.",
      searchPlaceholder: "Search transactions, customers, or ID...",
      dateRange: "Date Range",
      today: "Today",
      last7Days: "Last 7 Days",
      export: "Export CSV",
      table: {
        id: "Transaction ID",
        customer: "Customer",
        method: "Payment Method",
        total: "Total Amount",
        date: "Date & Time"
      },
      avgOrder: "Average Order Value",
      volume: "Transaction Volume",
      salesGoal: "Sales Goal",
      goalMet: "Goal Met!",
      onTrack: "On Track",
      aiAnalysis: "AquaAI Analysis"
    },
    quotes: {
      searchPlaceholder: "Search quotes by ID, customer, or product...",
      title: "Active Quotes",
      subtitle: "Manage, track, and convert business proposals to sales.",
      filter: "Filter",
      createQuote: "Create New Quote",
      draft: "Draft Quotes",
      sent: "Sent to Customer",
      expired: "Expired Quotes",
      converted: "Converted Sales",
      table: {
        id: "Quote ID",
        customer: "Customer",
        amount: "Amount",
        status: "Status",
        expiry: "Expiry Date",
        actions: "Actions"
      },
      editQuote: "Edit Quote",
      newQuote: "New Quote",
      customerName: "Customer Name",
      taxId: "Tax ID / NIT",
      lineItems: "Line Items",
      addItem: "Add Item",
      saveQuote: "Save Quote",
      terms: "Terms: Quote valid until expiry date. Prices subject to change."
    },
    customers: {
      searchPlaceholder: "Search customer name, email, or phone...",
      title: "Customer Directory",
      subtitle: "Manage relationships and credit balances.",
      export: "Export",
      addCustomer: "Add Customer",
      table: {
        customer: "Customer",
        contact: "Contact Info",
        ltv: "Lifetime Value",
        balance: "Credit Balance",
        lastActive: "Last Activity"
      },
      profile: "Edit Profile",
      history: "History",
      notes: "Notes",
      newOrder: "Create New Order",
      editCustomer: "Edit Customer",
      newCustomer: "New Customer",
      fullName: "Full Name",
      email: "Email",
      phone: "Phone",
      tier: "Tier",
      status: "Status",
      internalNotes: "Internal Notes",
      saveProfile: "Save Profile"
    },
    suppliers: {
      title: "Suppliers & Purchasing",
      subtitle: "Manage suppliers and reorder stock via Purchase Orders.",
      tabOrders: "Purchase Orders",
      tabSuppliers: "Suppliers Directory",
      searchPlaceholder: "Search orders or suppliers...",
      createOrder: "New Purchase Order",
      addSupplier: "Add Supplier",
      stats: {
        pending: "Pending Orders",
        received: "Received Orders",
        activeSuppliers: "Active Suppliers",
        spending: "Spending (Mo)"
      },
      table: {
        supplier: "Supplier",
        date: "Order Date",
        expected: "Expected",
        total: "Total Cost",
        status: "Status",
        name: "Supplier Name",
        contact: "Contact",
        category: "Category",
        leadTime: "Lead Time"
      },
      selectSupplier: "Select Supplier",
      createDraft: "Create Draft Order"
    },
    ai: {
      title: "AquaAI Intelligence Hub",
      status: "AI Engine Online",
      visionTitle: "Vision-to-Inventory",
      visionSubtitle: "Snap or upload product photos for instant OCR extraction and stock entry.",
      dropPhoto: "Drop product photos here",
      analyzing: "Analyzing Image Structure...",
      results: "Scan Results",
      insightsTitle: "Predictive Insights",
      liveAnalysis: "Live Analysis",
      revenueRisers: "Revenue Risers",
      marginAdjust: "Margin Adjustments",
      stockVelocity: "Stock Velocity Analysis",
      chatPlaceholder: "Ask Aqua... (e.g., 'Update stock' or 'Show sales')"
    },
    settings: {
      title: "System Settings",
      tabs: {
        general: "General",
        branding: "Branding",
        team: "Team",
        billing: "Plans & Billing",
        integrations: "Integrations"
      },
      businessProfile: "Business Profile",
      businessDesc: "Manage your public business identity and contact details.",
      roles: "Team Roles & Permissions",
      rolesDesc: "Define access levels for your staff members.",
      team: {
        directory: "User Directory"
      },
      plans: {
        title: "Manage Subscription Plans",
        subtitle: "Create and modify the pricing tiers available to your customers."
      },
      branding: {
        title: "Branding & Customization",
        subtitle: "Customize the look and feel of your AquaPos instance.",
        landingImages: "Landing Page Visuals",
        heroImage: "Hero Section Image",
        featureImage: "Feature/Dashboard Image",
        uploadLocal: "Browse File",
        enterUrl: "Paste image URL...",
        or: "OR"
      },
      integrations: "Integration Hub",
      subscription: "Subscription",
      globalPrefs: "Global Preferences",
      darkMode: "Dark Mode Interface",
      autoAi: "Auto-generate AI Insights",
      paperless: "Paperless Receipts",
      language: "System Language",
      save: "Save Changes",
      savedSuccess: "Settings Saved Successfully!",
      inviteMember: "Invite Member",
      sendInvite: "Send Invitation",
      role: "Role",
      users: "Users",
      permissions: "Permissions",
      status: "Status",
      cancel: "Cancel"
    },
    subscriptions: {
      title: "Subscription Management",
      searchPlaceholder: "Search subscribers...",
      customer: "Customer",
      plan: "Plan",
      amount: "Amount",
      status: "Status",
      billing: "Next Billing",
      manageSub: "Manage Subscription",
      cycle: "Billing Cycle",
      update: "Update Subscription"
    },
    support: {
      title: "Support & Expert Help Center",
      searchPlaceholder: "Ask about inventory, POS setup, or billing...",
      quickHelp: "Quick Help",
      greeting: "How can we help you today?",
      subtitle: "Search for solutions, view tutorials, or talk to an AquaPos expert.",
      systemHealth: "System Health",
      cloudSync: "Cloud Sync",
      integrations: "Integrations",
      posServices: "POS Services",
      primeSupport: "Soporte Prime",
      tutorials: "Video Tutorials Library",
      browseAll: "Browse all 120+ videos",
      articles: "Popular Support Articles",
      liveExpert: "Live Expert Support",
      online: "is online"
    }
  },
  es: {
    userMenu: {
      profile: "Perfil",
      settings: "Configuración",
      logout: "Cerrar Sesión",
      account: "Cuenta"
    },
    auth: {
      welcomeBack: "Bienvenido",
      welcomeSubtitle: "Ingresa tus credenciales para acceder.",
      createAccount: "Crear Cuenta",
      createSubtitle: "Inicia tu prueba gratuita de 14 días.",
      email: "Correo Corporativo",
      password: "Contraseña",
      fullName: "Nombre Completo",
      companyName: "Nombre de la Empresa",
      forgotPassword: "¿Olvidaste tu contraseña?",
      login: "Iniciar Sesión",
      register: "Empezar Prueba Gratis",
      noAccount: "¿No tienes una cuenta?",
      hasAccount: "¿Ya tienes una cuenta?",
      signUp: "Regístrate",
      signIn: "Ingresa",
      or: "O CONTINÚA CON",
      terms: "Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad."
    },
    landing: {
      nav: {
        solutions: "Soluciones",
        why: "Por qué AquaPos",
        pricing: "Precios",
        login: "Ingresar",
        start: "Empezar Prueba Gratis"
      },
      hero: {
        new: "NUEVO: AQUAAI V2.0",
        title: "El Sistema Operativo de",
        titleHighlight: "tu Negocio",
        subtitle: "Punto de venta de alto rendimiento, gestión de inventario inteligente y finanzas con precisión de 4 decimales. Todo lo que tu empresa necesita en una sola plataforma.",
        demo: "Ver Demo",
        noCard: "No se requiere tarjeta de crédito · 14 días gratis"
      },
      solutions: {
        title: "Soluciones a tu Medida",
        subtitle: "Adaptado a las necesidades específicas de los negocios líderes en Latinoamérica.",
        retail: { title: "Retail", desc: "Gestión de stock en tiempo real, múltiples sucursales y códigos de barra ilimitados." },
        restaurant: { title: "Restaurantes y Cafés", desc: "Control de comandas, gestión de mesas e ingredientes. Integrado con apps de delivery." },
        wholesale: { title: "Mayoristas", desc: "Manejo de bultos, precios por volumen y créditos a clientes con seguimiento automatizado." },
        digital: { title: "Vendedores Digitales", desc: "Sincronización con redes sociales, links de pago y facturación electrónica instantánea." },
        learnMore: "Saber más"
      },
      features: {
        title: "Potencia Enterprise al alcance de tu mano",
        subtitle: "No somos solo una caja registradora. Somos el motor que impulsa tu crecimiento con tecnología de punta.",
        sync: { title: "Local-First Sync", desc: "¿Se cayó el internet? No hay problema. AquaPos funciona offline y sincroniza tus ventas apenas recuperes la conexión." },
        precision: { title: "Precisión de 4 Decimales", desc: "Ideal para venta por peso o cambio de divisas. Ni un centavo se pierde en redondeos imprecisos." },
        ai: { title: "AquaAI Insights", desc: "Inteligencia artificial que predice faltantes de stock y recomienda precios dinámicos según el mercado." }
      },
      pricing: {
        title: "Planes Flexibles",
        subtitle: "Escala AquaPos a medida que tu negocio crece. Sin contratos forzosos.",
        monthly: "/mes",
        annual: "Pago anual",
        start: "Empezar Gratis",
        choose: "Elegir",
        contact: "Contactar Ventas",
        mostPopular: "MOST POPULAR",
        plans: {
          free: "EMPRENDEDOR",
          pro: "PROFESIONAL",
          growth: "CRECIMIENTO",
          corp: "CORPORATIVO"
        },
        features: {
          free: ["1 Usuario", "100 Productos", "Facturación Básica"],
          pro: ["3 Usuarios", "Productos Ilimitados", "Reportes de Ventas", "Local-First Sync"],
          growth: ["10 Usuarios", "AquaAI Básico", "Facturación Electrónica", "API Access"],
          corp: ["Usuarios Ilimitados", "AquaAI Enterprise", "Account Manager", "White Label Ready"]
        }
      },
      footer: {
        desc: "El primer sistema operativo empresarial diseñado para las PYMEs de América Latina. Alto rendimiento y simplicidad.",
        product: "Producto",
        company: "Compañía",
        support: "Soporte",
        privacy: "Privacidad",
        terms: "Términos",
        cookies: "Cookies"
      },
      form: {
        title: "Solicita una Demo",
        subtitle: "Completa el formulario y nuestro equipo te contactará en breve.",
        name: "Nombre Completo",
        email: "Email de Trabajo",
        company: "Nombre de la Empresa",
        message: "¿Cómo podemos ayudarte?",
        submit: "Enviar Solicitud",
        success: "¡Solicitud Enviada con Éxito!"
      }
    },
    sidebar: {
      mainMenu: "Menú Principal",
      dashboard: "Inicio",
      pos: "Punto de Venta",
      inventory: "Inventario",
      sales: "Ventas",
      quotes: "Cotizaciones",
      finance: "Finanzas",
      customers: "Clientes",
      suppliers: "Proveedores y Compras",
      intelligence: "Inteligencia",
      ai: "AquaAI",
      settings: "Configuración",
      support: "Soporte",
      subscriptions: "Suscripciones",
      new: "Nuevo"
    },
    common: {
      days: { Mon: "Lun", Tue: "Mar", Wed: "Mié", Thu: "Jue", Fri: "Vie", Sat: "Sáb", Sun: "Dom" },
      months: { Oct: "Oct", Nov: "Nov" },
      status: {
        Active: "Activo",
        Inactive: "Inactivo",
        Blocked: "Bloqueado",
        Pending: "Pendiente",
        Completed: "Completado",
        Shipped: "Enviado",
        Draft: "Borrador",
        Sent: "Enviado",
        Expired: "Vencido",
        Converted: "Convertido",
        Paid: "Pagado",
        Overdue: "Vencido",
        Received: "Recibido",
        Ordered: "Ordenado",
        Cancelled: "Cancelado"
      },
      roles: {
        Owner: "Dueño",
        Admin: "Admin",
        Cashier: "Cajero",
        Viewer: "Visor"
      },
      permissions: {
        full: "Acceso total al sistema",
        all_except_billing: "Todo excepto facturación",
        sales_only: "Solo ventas y POS"
      }
    },
    data: {
      categories: {
        All: "Todos los ítems",
        Apparel: "Ropa",
        Grocery: "Abarrotes",
        Electronics: "Electrónica",
        Home: "Hogar",
        Fitness: "Fitness",
        General: "General",
        Accessories: "Accesorios",
        Perfumes: "Perfumes",
        Beauty: "Belleza",
        Beverages: "Bebidas",
        Bakery: "Panadería",
        Snacks: "Snacks",
        Produce: "Frutas/Verduras"
      },
      sort: {
        LastUpdated: "Últ. Actualización",
        Name: "Nombre",
        Stock: "Stock",
        Price: "Price"
      },
      filters: {
        All: "Todos",
        InStock: "En Stock",
        LowStock: "Stock Bajo",
        OutOfStock: "Sin Stock"
      }
    },
    dashboard: {
      searchPlaceholder: "Buscar ventas, productos o clientes...",
      welcomeTitle: "Resumen del Negocio",
      welcomeSubtitle: "Bienvenido, esto es lo que pasa",
      today: "hoy",
      lastWeek: "semana pasada",
      dateRange: "24 Oct - 31 Oct",
      newOrder: "Nueva Orden",
      totalSales: "Ventas Totales",
      netProfit: "Ganancia Neta (Oct)",
      lowStock: "Alertas Stock Bajo",
      activeQuotes: "Cotizaciones Activas",
      revenueTrends: "Tendencia de Ingresos",
      revenueSubtitle: "Rendimiento semanal",
      aiInsights: "Insights AquaAI",
      inventoryWarning: "Advertencia de Inventario",
      restock: "Reabastecer",
      peakHours: "Horas Pico",
      viewReport: "Ver Reporte Completo",
      recentTx: "Transacciones Recientes",
      viewAll: "Ver Todo",
      overdueAlert: "Acción Requerida: Pagos Vencidos",
      overdueDesc: "clientes con cuentas de crédito vencidas.",
      viewCustomers: "Ver Clientes",
      actions: {
        viewDetails: "Ver Detalles",
        printReceipt: "Imprimir Recibo",
        sendEmail: "Reenviar Email",
        refund: "Reembolsar"
      }
    },
    pos: {
      searchPlaceholder: "Escanear o Buscar Productos (F1)...",
      addCustomer: "Asignar Cliente",
      currentTicket: "Ticket Actual",
      clearCart: "Vaciar Carrito",
      emptyCart: "El carrito está vacío",
      subtotal: "Subtotal",
      tax: "Impuesto",
      discount: "Descuento Lealtad",
      total: "Monto Total",
      checkout: "PROCESAR PAGO",
      selectCustomer: "Seleccionar Cliente",
      search: "Buscar",
      create: "Crear Nuevo",
      searchCustomerPlaceholder: "Buscar por nombre o email...",
      payMethod: "Método de Pago",
      payCash: "Efectivo",
      payCard: "Tarjeta Crédito/Débito",
      payCredit: "Crédito / Pagar Después",
      amountTendered: "Monto Recibido",
      completePayment: "Completar Pago",
      confirmCredit: "Confirmar Crédito",
      processing: "Procesando Transacción...",
      success: "¡Orden Confirmada!",
      receiptSent: "El recibo ha sido enviado al email.",
      newOrder: "Nueva Orden",
      creditRecorded: "Crédito Registrado",
      creditReminder: "Recordatorio para",
      back: "Atrás",
      initialDeposit: "Depósito Inicial (Opcional)",
      dueDate: "Fecha de Vencimiento",
      balanceRemaining: "Saldo Restante"
    },
    inventory: {
      title: "Gestión de Inventario",
      subtitle: "Gestiona tu catálogo de productos y variaciones omnicanal.",
      manageCategories: "Categorías",
      addProduct: "Agregar Producto",
      allCategories: "Todas las Categorías",
      allProducts: "Todos los Productos",
      inStock: "En Stock",
      lowStock: "Stock Bajo",
      outOfStock: "Sin Stock",
      sortedBy: "Ordenado por:",
      table: {
        name: "Nombre",
        sku: "SKU / Código",
        category: "Categoría",
        stock: "Nivel Stock",
        cost: "Costo Unit.",
        price: "Precio Venta",
        actions: "Acciones"
      },
      editProduct: "Editar Producto",
      addNewProduct: "Nuevo Producto",
      saveProduct: "Guardar Producto",
      cancel: "Cancelar",
      quickInsights: "Insights Rápidos",
      projectedStockout: "Agotamiento Proyectado",
      reorderSuggestions: "Sugerencias Reorden",
      totalValue: "Valor Total Inventario",
      activeSkus: "SKUs Activos"
    },
    finance: {
      title: "Finanzas y Contabilidad",
      subtitle: "Rastreo financiero completo, P&G y análisis de márgenes.",
      period: { month: "Este Mes", year: "Este Año" },
      kpi: {
        revenue: "Ingresos Totales",
        cogs: "Costo de Ventas (COGS)",
        expenses: "Gastos Operativos",
        netProfit: "Ganancia Neta",
        netProfitSub: "Ingresos - COGS",
        grossProfit: "Ganancia Bruta",
        margin: "Margen",
        ofRevenue: "del ingreso",
        inventoryValue: "Valor de Inventario (Costo)",
        retail: "Retail",
        pendingCredit: "Crédito Pendiente (Total)",
        customersWithDebt: "clientes con deuda",
        abonos: "Abonos Recibidos",
        payments: "pagos registrados",
        sales: "ventas",
        inventoryPotential: "Ganancia Potencial Inventario",
        inventoryPotentialSub: "Diferencia retail vs costo"
      },
      charts: {
        profitability: "Análisis de Rentabilidad",
        revenueVsCost: "Ingresos vs Costos",
        revenueVsCostSub: "Desglose de ganancia bruta",
        expensesBreakdown: "Desglose de Gastos",
        abonos: "Abonos Recibidos por Mes",
        abonosSub: "Pagos de clientes hacia su crédito"
      },
      table: {
        title: "Margen por Producto",
        subtitle: "Rentabilidad unitaria del inventario actual",
        product: "Producto",
        category: "Categoría",
        unitCost: "Costo Unit.",
        unitPrice: "Precio Unit.",
        margin: "Margen ($)",
        marginPercent: "Margen (%)",
        roi: "ROI",
        products: "productos",
        noProducts: "No hay productos en el inventario."
      },
      pnl: {
        title: "Estado de Resultados",
        grossProfit: "Ganancia Bruta",
        operatingIncome: "Utilidad Operativa",
        netIncome: "GANANCIA NETA"
      },
      inventoryValuation: {
        title: "Valoración de Inventario",
        atCost: "Al Costo",
        atRetail: "Al Precio Retail",
        potentialProfit: "Ganancia Potencial"
      }
    },
    sales: {
      title: "Historial y Analítica",
      subtitle: "Rastrea el rendimiento y datos históricos de transacciones.",
      searchPlaceholder: "Buscar transacciones, clientes o ID...",
      dateRange: "Rango de Fechas",
      today: "Hoy",
      last7Days: "Últimos 7 Días",
      export: "Exportar CSV",
      table: {
        id: "ID Transacción",
        customer: "Cliente",
        method: "Método Pago",
        total: "Monto Total",
        date: "Fecha y Hora"
      },
      avgOrder: "Valor Promedio Orden",
      volume: "Volumen Transacciones",
      salesGoal: "Meta de Ventas",
      goalMet: "¡Meta Cumplida!",
      onTrack: "En Camino",
      aiAnalysis: "Análisis AquaAI"
    },
    quotes: {
      searchPlaceholder: "Buscar cotizaciones por ID, cliente o producto...",
      title: "Cotizaciones Activas",
      subtitle: "Gestiona y convierte propuestas de negocio en ventas.",
      filter: "Filtrar",
      createQuote: "Crear Cotización",
      draft: "Borradores",
      sent: "Enviadas",
      expired: "Expiradas",
      converted: "Convertidas",
      table: {
        id: "ID Cotización",
        customer: "Cliente",
        amount: "Monto",
        status: "Estado",
        expiry: "Vencimiento",
        actions: "Acciones"
      },
      editQuote: "Editar Cotización",
      newQuote: "Nueva Cotización",
      customerName: "Nombre Cliente",
      taxId: "NIT / RFC / ID Fiscal",
      lineItems: "Ítems",
      addItem: "Agregar Ítem",
      saveQuote: "Guardar Cotización",
      terms: "Términos: Cotización válida hasta fecha de vencimiento. Precios sujetos a cambio."
    },
    customers: {
      searchPlaceholder: "Buscar por nombre, email o teléfono...",
      title: "Directorio de Clientes",
      subtitle: "Gestiona relaciones y balances de crédito.",
      export: "Exportar",
      addCustomer: "Agregar Cliente",
      table: {
        customer: "Cliente",
        contact: "Contacto",
        ltv: "Valor de Vida (LTV)",
        balance: "Saldo Crédito",
        lastActive: "Última Actividad"
      },
      profile: "Editar Perfil",
      history: "Historial",
      notes: "Notas",
      newOrder: "Crear Nueva Orden",
      editCustomer: "Editar Cliente",
      newCustomer: "Nuevo Cliente",
      fullName: "Nombre Completo",
      email: "Email",
      phone: "Teléfono",
      tier: "Nivel",
      status: "Estado",
      internalNotes: "Notas Internas",
      saveProfile: "Guardar Perfil"
    },
    suppliers: {
      title: "Proveedores y Compras",
      subtitle: "Gestiona proveedores y reabastece inventario mediante Órdenes de Compra.",
      tabOrders: "Órdenes de Compra",
      tabSuppliers: "Directorio Proveedores",
      searchPlaceholder: "Buscar órdenes o proveedores...",
      createOrder: "Nueva Orden de Compra",
      addSupplier: "Agregar Proveedor",
      stats: {
        pending: "Órdenes Pendientes",
        received: "Órdenes Recibidas",
        activeSuppliers: "Prov. Activos",
        spending: "Gasto Mensual"
      },
      table: {
        supplier: "Proveedor",
        date: "Fecha Orden",
        expected: "Fecha Esperada",
        total: "Costo Total",
        status: "Estado",
        name: "Nombre Proveedor",
        contact: "Contacto",
        category: "Categoría",
        leadTime: "Tiempo Entrega"
      },
      selectSupplier: "Seleccionar Proveedor",
      createDraft: "Crear Borrador"
    },
    ai: {
      title: "Centro de Inteligencia AquaAI",
      status: "Motor IA En Línea",
      visionTitle: "Visión-a-Inventario",
      visionSubtitle: "Sube fotos de productos para extracción OCR y entrada de stock.",
      dropPhoto: "Arrastra fotos aquí",
      analyzing: "Analizando Estructura...",
      results: "Resultados Escaneo",
      insightsTitle: "Insights Predictivos",
      liveAnalysis: "Análisis en Vivo",
      revenueRisers: "Tendencia Ingresos",
      marginAdjust: "Ajuste Márgenes",
      stockVelocity: "Velocidad de Stock",
      chatPlaceholder: "Pregunta a Aqua... (ej. 'Actualizar stock' o 'Ver ventas')"
    },
    settings: {
      title: "Configuración del Sistema",
      tabs: {
        general: "General",
        branding: "Marca",
        team: "Equipo",
        billing: "Planes y Facturación",
        integrations: "Integraciones"
      },
      businessProfile: "Perfil de Negocio",
      businessDesc: "Administra tu identidad pública y contacto.",
      roles: "Roles y Permisos",
      rolesDesc: "Define niveles de acceso para tu equipo.",
      team: {
        directory: "Directorio de Usuarios"
      },
      plans: {
        title: "Gestionar Planes de Suscripción",
        subtitle: "Crea y modifica los niveles de precios disponibles para tus clientes."
      },
      branding: {
        title: "Marca y Personalización",
        subtitle: "Personaliza la apariencia de tu instancia AquaPos.",
        landingImages: "Imágenes Landing Page",
        heroImage: "Imagen Sección Hero",
        featureImage: "Imagen Destacada/Dashboard",
        uploadLocal: "Subir Archivo",
        enterUrl: "Pegar URL de imagen...",
        or: "O"
      },
      integrations: "Centro de Integración",
      subscription: "Suscripción",
      globalPrefs: "Preferencias Globales",
      darkMode: "Interfaz Modo Oscuro",
      autoAi: "Generar Insights IA Auto",
      paperless: "Recibos Digitales",
      language: "Idioma del Sistema",
      save: "Guardar Cambios",
      savedSuccess: "¡Configuración Guardada Exitosamente!",
      inviteMember: "Invitar Miembro",
      sendInvite: "Enviar Invitación",
      role: "Rol",
      users: "Usuarios",
      permissions: "Permisos",
      status: "Estado",
      cancel: "Cancelar"
    },
    subscriptions: {
      title: "Gestión de Suscripciones",
      searchPlaceholder: "Buscar suscriptores...",
      customer: "Cliente",
      plan: "Plan",
      amount: "Monto",
      status: "Estado",
      billing: "Próx. Factura",
      manageSub: "Gestionar Suscripción",
      cycle: "Ciclo Facturación",
      update: "Actualizar Suscripción"
    },
    support: {
      title: "Centro de Ayuda y Soporte",
      searchPlaceholder: "Pregunta sobre inventario, POS o facturación...",
      quickHelp: "Ayuda Rápida",
      greeting: "¿Cómo podemos ayudarte?",
      subtitle: "Busca soluciones, ver tutoriales o habla con un experto.",
      systemHealth: "Estado del Sistema",
      cloudSync: "Sincronización Nube",
      integrations: "Integraciones",
      posServices: "Servicios POS",
      primeSupport: "Soporte Prime",
      tutorials: "Librería de Tutoriales",
      browseAll: "Ver los 120+ videos",
      articles: "Artículos Populares",
      liveExpert: "Soporte Experto en Vivo",
      online: "está en línea"
    }
  }
};

export const LanguageProvider = ({ children }: { children?: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('aquapos-lang') as Language) || 'es';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    return localStorage.getItem('aquapos-dark') === 'true';
  });

  // Apply dark class to <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('aquapos-dark', String(isDark));
  }, [isDark]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('aquapos-lang', language);
  }, [language]);

  const toggleDark = () => setIsDark(prev => !prev);

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isDark, toggleDark }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};