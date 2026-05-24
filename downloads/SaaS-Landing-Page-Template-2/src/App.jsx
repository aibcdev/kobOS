import React, { useState, useEffect } from 'react';

export default function App() {
  // Mobile Nav Drawer State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsDropdownOpen, setProductsDropdownOpen] = useState(false);

  // Hero interactive state
  const [addedNaan, setAddedNaan] = useState(false);
  const [checkoutTriggered, setCheckoutTriggered] = useState(false);

  // Bento Box state
  const [addedCookie, setAddedCookie] = useState(false);

  // Tab state for the Complete Ecosystem section
  const [activeTab, setActiveTab] = useState('traffic');

  // Audit Form Simulator states
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [auditStep, setAuditStep] = useState(0); // 0: idle, 1: scanning, 2: parsing, 3: completed
  const [showAuditModal, setShowAuditModal] = useState(false);

  const handleAuditSubmit = (e) => {
    e.preventDefault();
    if (!websiteUrl) return;

    setShowAuditModal(true);
    setAuditStep(1);

    // Step 1: SEO scan
    setTimeout(() => {
      setAuditStep(2);
    }, 1500);

    // Step 2: Leak calculations
    setTimeout(() => {
      setAuditStep(3);
    }, 3200);
  };

  return (
    <div className="relative min-h-screen bg-[#f9f3ed]">
      {/* ==================== HEADER / NAVIGATION ==================== */}
      <header className="sticky top-0 z-50 w-full bg-[#f9f3ed]/80 backdrop-blur-md border-b border-[#2c2c2c]/5 transition-all duration-300">
        <div className="max-w-[83rem] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          {/* Logo Left */}
          <a href="#" className="flex items-center gap-1.5 group">
            <span className="text-xl font-bold text-[#094413] tracking-tight transition-colors">
              owner
              <span class="text-[#088924] font-medium">OS</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-[#088924] block transition-transform group-hover:scale-125"></span>
          </a>

          {/* Compact Nav Links Center */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#2c2c2c]/80">
            <div className="relative">
              <button 
                onClick={() => setProductsDropdownOpen(!productsDropdownOpen)}
                onBlur={() => setTimeout(() => setProductsDropdownOpen(false), 200)}
                className="flex items-center gap-1 hover:text-[#094413] transition-colors py-2"
              >
                Products
                <iconify-icon icon="solar:alt-arrow-down-linear" stroke-width="1.5" className={`text-xs transition-transform ${productsDropdownOpen ? 'rotate-180' : ''}`}></iconify-icon>
              </button>
              
              {/* Mega Dropdown Mock */}
              <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-[#fbf8f5] border border-[#2c2c2c]/10 rounded-2xl shadow-xl transition-all duration-200 p-4 ${productsDropdownOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <a href="#ordering" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#094413]/5 transition-colors">
                  <iconify-icon icon="solar:global-linear" className="text-[#088924] text-xl mt-0.5"></iconify-icon>
                  <div>
                    <p className="font-medium text-[#094413] text-sm">Direct Ordering</p>
                    <p className="text-xs text-[#2c2c2c]/60">Commission-free menu builder</p>
                  </div>
                </a>
                <a href="#apps" className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#094413]/5 transition-colors mt-1">
                  <iconify-icon icon="solar:smartphone-linear" className="text-[#088924] text-xl mt-0.5"></iconify-icon>
                  <div>
                    <p className="font-medium text-[#094413] text-sm">Branded Mobile Apps</p>
                    <p className="text-xs text-[#2c2c2c]/60">Launch on iOS & Android</p>
                  </div>
                </a>
              </div>
            </div>
            <a href="#success-stories" className="hover:text-[#094413] transition-colors py-2">Customers</a>
            <a href="#ecosystem" className="hover:text-[#094413] transition-colors py-2">Pricing</a>
            <a href="#beliefs" className="hover:text-[#094413] transition-colors py-2">Resources</a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4 md:gap-6">
            <a href="#" className="hidden sm:inline-block text-sm font-medium text-[#2c2c2c]/80 hover:text-[#094413] transition-colors">
              Login
            </a>
            <a href="#audit-form" className="inline-flex items-center justify-center bg-[#094413] hover:bg-[#088924] text-[#fbf8f5] text-sm font-medium px-5 py-2.5 rounded-full transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm">
              Start Free Trial
            </a>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center text-[#2c2c2c] p-1"
              aria-label="Toggle Mobile Menu"
            >
              <iconify-icon icon={mobileMenuOpen ? "solar:close-square-linear" : "solar:hamburger-menu-linear"} className="text-2xl"></iconify-icon>
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#f9f3ed] border-b border-[#2c2c2c]/10 px-6 py-6 space-y-4 animate-fade-in">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-semibold text-[#088924] tracking-wider mb-2">Our Solutions</p>
              <a href="#ordering" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-[#2c2c2c] hover:text-[#094413]">Direct Ordering</a>
              <a href="#apps" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-[#2c2c2c] hover:text-[#094413]">Branded Apps</a>
            </div>
            <hr className="border-[#2c2c2c]/5" />
            <a href="#success-stories" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#2c2c2c] py-1">Customers</a>
            <a href="#ecosystem" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#2c2c2c] py-1">Pricing</a>
            <a href="#beliefs" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#2c2c2c] py-1">Resources</a>
            <hr className="border-[#2c2c2c]/5" />
            <div className="flex flex-col gap-3 pt-2">
              <a href="#" className="text-center text-sm text-[#2c2c2c] py-2 border border-[#2c2c2c]/10 rounded-full">Login</a>
              <a href="#audit-form" onClick={() => setMobileMenuOpen(false)} className="text-center text-sm bg-[#094413] text-white py-2 rounded-full">Analyze My Site</a>
            </div>
          </div>
        )}
      </header>

      {/* ==================== HERO SECTION ==================== */}
      <section id="audit-form" className="relative pt-16 pb-24 md:pt-24 md:pb-32 px-6 overflow-hidden" style={{ backgroundImage: 'radial-gradient(rgba(8, 137, 36, 0.05) 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}>
        <div className="max-w-[83rem] mx-auto text-center flex flex-col items-center">
          {/* Eyebrow */}
          <span className="font-mono-brand text-xs uppercase tracking-widest text-[#088924] font-medium mb-4 bg-[#088924]/5 px-3 py-1 rounded-full">
            The Autonomous Restaurant Growth Engine
          </span>

          {/* Title: Exactly 2-line wrap constraint with tight tracking */}
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-[#2c2c2c] max-w-4xl leading-[1.05] mb-8 font-heading">
            Your online guests are leaving.
            <br className="hidden md:inline" />
            Let AI build your commission-free storefront.
          </h1>

          {/* Integrated High-Impact Hero Input Area */}
          <div className="w-full max-w-xl mb-16 px-2">
            <form onSubmit={handleAuditSubmit} className="bg-white shadow-[0_12px_32px_rgba(61,60,60,0.12)] border border-[#2c2c2c]/5 rounded-full p-2 flex items-center gap-2 transition-all duration-300 focus-within:ring-2 focus-within:ring-[#088924]">
              <div className="flex items-center gap-2.5 pl-4 flex-1">
                <iconify-icon icon="solar:global-linear" stroke-width="1.5" className="text-xl text-[#2c2c2c]/40"></iconify-icon>
                <input 
                  type="url" 
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="Enter your restaurant's website URL..." 
                  className="w-full bg-transparent border-none outline-none text-sm text-[#2c2c2c] placeholder-[#2c2c2c]/40 py-2.5" 
                  required 
                />
              </div>
              <button type="submit" className="bg-[#094413] hover:bg-black text-[#fbf8f5] font-medium text-xs md:text-sm px-6 py-3 rounded-full transition-all duration-300 shrink-0 shadow-sm flex items-center gap-1.5">
                Analyze My Site
                <iconify-icon icon="solar:arrow-right-linear" className="text-sm"></iconify-icon>
              </button>
            </form>
          </div>

          {/* Symmetrical Framed Mockup on Green Gradient Panel */}
          <div className="w-full relative rounded-[3rem] bg-gradient-to-tr from-[#094413] to-[#088924] p-8 md:p-16 overflow-hidden shadow-2xl flex justify-center items-center">
            {/* Abstract gradient decorative background lines */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {/* Premium Mobile Device Container Mockup */}
            <div className="relative w-full max-w-[340px] aspect-[9/19] bg-black rounded-[3.5rem] p-3.5 shadow-2xl border-4 border-gray-800 flex flex-col overflow-hidden">
              {/* Screen Glass reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-10"></div>

              {/* Inner Layout with real UI elements representing app conversion */}
              <div className="w-full h-full bg-[#fbf8f5] rounded-[2.75rem] flex flex-col overflow-hidden relative p-4 text-left select-none">
                {/* App Header Status */}
                <div className="flex justify-between items-center mb-4 text-[11px] font-mono-brand text-[#2c2c2c]/60">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1.5">
                    <iconify-icon icon="solar:connection-status-linear" className="text-xs"></iconify-icon>
                    <iconify-icon icon="solar:battery-charge-linear" className="text-xs"></iconify-icon>
                  </div>
                </div>

                {/* Restaurant App Demo Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-[10px] font-mono-brand uppercase text-[#088924] tracking-wider font-semibold">
                      ORDER DIRECT
                    </span>
                    <h4 className="text-sm font-bold tracking-tight text-[#2c2c2c] font-heading">
                      Basil & Clover
                    </h4>
                  </div>
                  <span className="bg-[#094413]/5 text-[#094413] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#088924] animate-pulse"></span>
                    Open
                  </span>
                </div>

                {/* Product Card Showcase */}
                <div className="bg-white rounded-2xl p-2.5 shadow-sm border border-[#2c2c2c]/5 mb-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="w-full aspect-[4/3] bg-cover bg-center rounded-xl mb-2.5" style={{ backgroundImage: "url('https://cdn.prod.website-files.com/69b9330c8b70142e4e5f7d3c/69d2e0dd1ef87a76018e6c8c_72874c8877deb022dd35906d595c09ff_karv.jpg')" }}></div>
                    <h5 className="text-xs font-bold text-[#2c2c2c] leading-tight font-heading">
                      Spicy Crispy Chicken Bowl
                    </h5>
                    <p className="text-[10px] text-[#2c2c2c]/60 mt-0.5 line-clamp-2">
                      Avocado wild rice, warm chicken breast, spicy house aioli.
                    </p>
                  </div>

                  {/* AI Smart Upsell Overlay in mini screen */}
                  <div className="mt-2 pt-2 border-t border-dashed border-gray-100 flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-mono-brand uppercase text-[#088924] block font-semibold">
                        AI RECOMMENDED
                      </span>
                      <span className="text-[10px] font-medium text-[#2c2c2c]">
                        Add Garlic Naan?
                      </span>
                    </div>
                    <button 
                      onClick={() => setAddedNaan(!addedNaan)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${addedNaan ? 'bg-[#094413] text-white' : 'bg-[#088924] text-white hover:bg-[#094413]'}`}
                    >
                      {addedNaan ? 'Added ✓' : '+$1.50'}
                      {!addedNaan && <iconify-icon icon="solar:add-circle-linear" className="text-xs"></iconify-icon>}
                    </button>
                  </div>
                </div>

                {/* Commission Counter Block */}
                <div className="bg-[#094413] text-[#fbf8f5] rounded-xl p-3 text-center shadow-md mb-2 transition-all">
                  <span className="text-[10px] font-mono-brand uppercase text-[#088924] tracking-widest block font-bold">
                    YOUR PROFITS
                  </span>
                  <p className="text-base font-semibold mt-0.5 font-heading">
                    Saved {addedNaan ? '$15.32' : '$14.20'} on this order
                  </p>
                  <p className="text-[9px] text-white/60">
                    0% third-party commission paid
                  </p>
                </div>

                {/* Floating checkout CTA bar */}
                <div className="bg-white rounded-full p-1.5 shadow-md flex items-center justify-between border border-[#2c2c2c]/5 mt-auto">
                  <span className="text-xs font-bold pl-3 text-[#2c2c2c]">
                    {addedNaan ? '$20.49' : '$18.99'}
                  </span>
                  <button 
                    onClick={() => setCheckoutTriggered(true)}
                    className="bg-[#094413] text-white text-[11px] font-medium px-4 py-2 rounded-full flex items-center gap-1 hover:bg-black transition-colors"
                  >
                    Checkout Direct
                    <iconify-icon icon="solar:arrow-right-linear" className="text-xs"></iconify-icon>
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Stats Widgets inside gradient */}
            <div className="hidden lg:block absolute left-16 top-1/3 bg-[#fbf8f5]/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-left max-w-[180px] transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <iconify-icon icon="solar:graph-up-linear" className="text-[#088924] text-2xl mb-1"></iconify-icon>
              <h4 className="text-lg font-bold text-[#094413] tracking-tight font-heading">
                +210%
              </h4>
              <p className="text-[11px] text-[#2c2c2c]/70 leading-normal">
                Direct order traffic growth within 60 days
              </p>
            </div>

            <div className="hidden lg:block absolute right-16 bottom-1/4 bg-[#fbf8f5]/90 backdrop-blur-md rounded-2xl p-4 shadow-xl text-left max-w-[200px] transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <iconify-icon icon="solar:dollar-linear" className="text-[#088924] text-2xl mb-1"></iconify-icon>
              <h4 className="text-lg font-bold text-[#094413] tracking-tight font-heading">
                Zero commission
              </h4>
              <p className="text-[11px] text-[#2c2c2c]/70 leading-normal">
                Say goodbye to Grubhub and UberEats margins
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== GROW SALES SUCCESS GALLERY ==================== */}
      <section id="success-stories" className="py-24 px-6 bg-[#fbf8f5]">
        <div className="max-w-[83rem] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <span className="font-mono-brand text-xs uppercase text-[#088924] tracking-wider block mb-2 font-semibold">
                REVENUE REVOLUTION
              </span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#2c2c2c] font-heading">
                Join the shift to direct restaurant revenue
              </h2>
            </div>
            <p className="text-[#2c2c2c]/60 max-w-sm text-sm mt-4 md:mt-0">
              Hundreds of neighborhood establishments have taken control of their online presence and direct revenue flow.
            </p>
          </div>

          {/* Symmetrical Responsive Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="relative group aspect-[3/4] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://cdn.prod.website-files.com/69b9330c8b70142e4e5f7d3c/6a0742c2032ddc0c6f4f96a5_og-image-split-m.jpg')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#094413]/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                <span className="font-mono-brand text-[10px] tracking-wider text-[#088924] bg-white px-2.5 py-0.5 rounded-full uppercase font-semibold">
                  Cyclo Noodles
                </span>
                <p className="text-2xl font-bold mt-2 leading-none tracking-tight font-heading">
                  +210%
                </p>
                <p className="text-xs text-white/80 mt-1">
                  Direct order volume growth
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="relative group aspect-[3/4] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://cdn.prod.website-files.com/69b9330c8b70142e4e5f7d3c/69cbbba4f97666a6e816977b_d961bd3d071ed066d5b05b02a3db4f00_about_local-bg.avif')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#094413]/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                <span className="font-mono-brand text-[10px] tracking-wider text-[#088924] bg-white px-2.5 py-0.5 rounded-full uppercase font-semibold">
                  Saffron Indian
                </span>
                <p className="text-2xl font-bold mt-2 leading-none tracking-tight font-heading">
                  Saved $4.8K
                </p>
                <p className="text-xs text-white/80 mt-1">
                  Monthly commission fees saved
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="relative group aspect-[3/4] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://cdn.prod.website-files.com/69b9330c8b70142e4e5f7d3c/69d2e0dd1ef87a76018e6c8c_72874c8877deb022dd35906d595c09ff_karv.jpg')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#094413]/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                <span className="font-mono-brand text-[10px] tracking-wider text-[#088924] bg-white px-2.5 py-0.5 rounded-full uppercase font-semibold">
                  Karv Mediterranean
                </span>
                <p className="text-2xl font-bold mt-2 leading-none tracking-tight font-heading">
                  +85%
                </p>
                <p className="text-xs text-white/80 mt-1">
                  Profit margin on delivery sales
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="relative group aspect-[3/4] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: "url('https://cdn.prod.website-files.com/69b9330c8b70142e4e5f7d3c/69c19abd76bf20834f6fe7f2_2539546c327ca18314bbec352952f7ef_restaurant-gradient_bg.avif')" }}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#094413]/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 text-white text-left">
                <span className="font-mono-brand text-[10px] tracking-wider text-[#088924] bg-white px-2.5 py-0.5 rounded-full uppercase font-semibold">
                  Talkin' Taco
                </span>
                <p className="text-2xl font-bold mt-2 leading-none tracking-tight font-heading">
                  +148%
                </p>
                <p className="text-xs text-white/80 mt-1">
                  Growth in online conversion
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== VALUE PROPOSITION / INTERACTIVE TABS ==================== */}
      <section id="ecosystem" className="py-24 px-6 bg-[#f9f3ed]">
        <div className="max-w-[83rem] mx-auto">
          <div className="max-w-3xl mb-12 text-left">
            <span className="font-mono-brand text-xs uppercase text-[#088924] tracking-wider block mb-2 font-semibold">
              COMPLETE ECOSYSTEM
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#2c2c2c] leading-tight font-heading">
              With Owner, you get more traffic, more sales, and more repeat customers.
            </h2>
          </div>

          {/* Functional Tabs Switcher */}
          <div className="flex flex-wrap gap-2.5 mb-8 border-b border-[#2c2c2c]/10 pb-6">
            <button 
              onClick={() => setActiveTab('traffic')} 
              className={`px-5 py-3 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'traffic' ? 'bg-[#094413] text-[#fbf8f5] shadow-sm' : 'bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]'}`}
            >
              <iconify-icon icon="solar:globus-linear" className="text-base"></iconify-icon>
              1. Search Domination
            </button>
            <button 
              onClick={() => setActiveTab('conversions')} 
              className={`px-5 py-3 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'conversions' ? 'bg-[#094413] text-[#fbf8f5] shadow-sm' : 'bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]'}`}
            >
              <iconify-icon icon="solar:ticket-sale-linear" className="text-base"></iconify-icon>
              2. Direct Ordering AI
            </button>
            <button 
              onClick={() => setActiveTab('loyalty')} 
              className={`px-5 py-3 rounded-full text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'loyalty' ? 'bg-[#094413] text-[#fbf8f5] shadow-sm' : 'bg-transparent text-[#2c2c2c]/60 hover:text-[#094413]'}`}
            >
              <iconify-icon icon="solar:users-group-two-rounded-linear" className="text-base"></iconify-icon>
              3. Smart Loyalty CRM
            </button>
          </div>

          {/* Tab Content Area: Pale Beige Bento Panel */}
          <div className="bg-[#f6eee5] rounded-[3rem] p-8 md:p-12 border border-[#2c2c2c]/5 min-h-[400px] flex flex-col md:flex-row justify-between items-center gap-12 relative overflow-hidden">
            
            {/* Tab Content: Traffic */}
            {activeTab === 'traffic' && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-12 w-full animate-fade-in">
                <div className="w-full md:w-1/2 space-y-6 text-left">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#094413] font-heading">
                    Dominate local search engine results
                  </h3>
                  <p className="text-sm md:text-base text-[#2c2c2c]/80 leading-relaxed">
                    When food lovers near you search for top-rated cuisines, your restaurant shouldn't be hidden behind massive aggregators. We automatically build and optimize local pages so you capture direct high-intent traffic instantly.
                  </p>
                  <ul className="space-y-3 font-medium text-xs md:text-sm text-[#2c2c2c]">
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      Auto-optimized schema formatting
                    </li>
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      Instant menu-item level local search discovery
                    </li>
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      Real-time sync to major local map platforms
                    </li>
                  </ul>
                </div>
                {/* Traffic Dashboard Mock */}
                <div className="w-full md:w-1/2 bg-[#fbf8f5] rounded-3xl p-6 border border-[#2c2c2c]/5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="text-xs font-mono-brand text-[#2c2c2c]/50 font-semibold">
                      LOCAL SEO VISIBILITY
                    </span>
                    <span className="bg-[#088924]/10 text-[#088924] text-[10px] font-semibold font-mono-brand px-2 py-0.5 rounded">
                      LIVE TRACKER
                    </span>
                  </div>
                  {/* Google mock */}
                  <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#094413]">
                        1. Saffron Indian Bistro
                      </span>
                      <span className="text-[10px] text-gray-400">Direct order site</span>
                    </div>
                    <span className="text-[11px] text-[#088924] font-semibold font-mono-brand">
                      Rank #1
                    </span>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl border border-gray-100/55 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        2. Grubhub — Saffron Indian
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono-brand">Rank #3</span>
                  </div>
                  <div className="p-3 bg-white/50 rounded-xl border border-gray-100/55 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        3. UberEats — Saffron Grill
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono-brand">Rank #4</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Conversions */}
            {activeTab === 'conversions' && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-12 w-full animate-fade-in">
                <div className="w-full md:w-1/2 space-y-6 text-left">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#094413] font-heading">
                    Smooth, frictionless mobile ordering
                  </h3>
                  <p className="text-sm md:text-base text-[#2c2c2c]/80 leading-relaxed">
                    We design menus built to maximize ticket size. Our checkout experience handles payment options, tipping presets, and dynamic order tracking instantly.
                  </p>
                  <ul className="space-y-3 font-medium text-xs md:text-sm text-[#2c2c2c]">
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      Apple Pay, Google Pay, and single-tap checkout
                    </li>
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      Dynamic up-selling system based on order analysis
                    </li>
                  </ul>
                </div>
                {/* Mockup */}
                <div className="w-full md:w-1/2 bg-[#fbf8f5] rounded-3xl p-6 border border-[#2c2c2c]/5 shadow-sm flex flex-col gap-3">
                  <div className="text-xs font-semibold text-[#094413] border-b pb-2 font-heading">
                    RECOMMENDED WITH YOUR ORDER
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <span className="text-xs font-medium">Add Loaded Truffle Fries</span>
                    <button className="bg-[#088924] text-white text-[11px] px-3 py-1 rounded-full font-semibold">+$4.99</button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <span className="text-xs font-medium">Add Soft Drink</span>
                    <button className="bg-[#088924] text-white text-[11px] px-3 py-1 rounded-full font-semibold">+$2.50</button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Loyalty */}
            {activeTab === 'loyalty' && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-12 w-full animate-fade-in">
                <div className="w-full md:w-1/2 space-y-6 text-left">
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#094413] font-heading">
                    Turn first-timers into loyal regulars
                  </h3>
                  <p className="text-sm md:text-base text-[#2c2c2c]/80 leading-relaxed">
                    Automated marketing matches consumer dining patterns. Deliver personalized email and SMS offers automatically when guests haven't ordered in a while.
                  </p>
                  <ul className="space-y-3 font-medium text-xs md:text-sm text-[#2c2c2c]">
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      AI text messaging triggers for lapsed diners
                    </li>
                    <li className="flex items-center gap-2.5">
                      <iconify-icon icon="solar:verified-check-linear" className="text-[#088924] text-lg"></iconify-icon>
                      Seamless loyalty system integrated in checkout
                    </li>
                  </ul>
                </div>
                {/* SMS Mockup */}
                <div className="w-full md:w-1/2 flex justify-center">
                  <div className="bg-white border border-[#2c2c2c]/10 rounded-2xl p-4 shadow-md max-w-[280px] text-left">
                    <div className="flex items-center gap-2 border-b pb-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-[#088924] text-white flex items-center justify-center text-[10px] font-semibold">
                        S
                      </div>
                      <div className="text-[10px] font-semibold">Saffron Indian Grill</div>
                    </div>
                    <p className="text-[11px] text-gray-700 leading-normal">
                      "Hi Sarah, we missed you! Here's 15% off your next direct order. Valid this weekend only."
                    </p>
                    <div className="mt-2 text-right">
                      <span className="text-[9px] text-[#088924] font-semibold underline cursor-pointer">
                        Redeem direct
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ==================== RATINGS & INFINITE MARQUEE BANNER ==================== */}
      <section className="py-24 bg-[#094413] rounded-[3rem] mx-6 my-12 overflow-hidden text-[#fbf8f5] text-center relative shadow-inner">
        <div className="max-w-[83rem] mx-auto px-6">
          {/* Stars and Title */}
          <div className="flex justify-center gap-1 mb-6">
            <iconify-icon icon="solar:star-bold" className="text-amber-400 text-2xl"></iconify-icon>
            <iconify-icon icon="solar:star-bold" className="text-amber-400 text-2xl"></iconify-icon>
            <iconify-icon icon="solar:star-bold" className="text-amber-400 text-2xl"></iconify-icon>
            <iconify-icon icon="solar:star-bold" className="text-amber-400 text-2xl"></iconify-icon>
            <iconify-icon icon="solar:star-bold" className="text-amber-400 text-2xl"></iconify-icon>
          </div>

          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight max-w-2xl mx-auto mb-16 font-heading">
            Rated #1 in Restaurant Tech by over 5,000+ restaurant owners
          </h2>

          {/* Infinite Testimonials Marquee Component */}
          <div className="relative w-full overflow-hidden py-4">
            <div className="animate-marquee gap-6 flex">
              {/* Card 1 */}
              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "The automated marketing system brings back guests without me lifting a finger. Saved thousands in Grubhub fees!"
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    M
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Marcus Vance</h5>
                    <p className="text-[10px] text-gray-400">Owner, The Burger Lab</p>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "Our direct orders skyrocketed. Customers love the Apple Pay option and tracking interface."
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    T
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Theresa Chen</h5>
                    <p className="text-[10px] text-gray-400">Co-founder, Dumpling House</p>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "We finally own our guest data. Seamless payouts and excellent customer service from the team."
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    R
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Robert Diaz</h5>
                    <p className="text-[10px] text-gray-400">GM, Tacos & Co.</p>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "Our bottom-line margins have never looked this healthy. The website is lightning fast!"
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    S
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Sarah Jenkins</h5>
                    <p className="text-[10px] text-gray-400">Founder, Cafe Nectar</p>
                  </div>
                </div>
              </div>

              {/* DUPLICATE SET FOR INFINITE CAROUSEL LOOP */}
              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "The automated marketing system brings back guests without me lifting a finger. Saved thousands in Grubhub fees!"
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    M
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Marcus Vance</h5>
                    <p className="text-[10px] text-gray-400">Owner, The Burger Lab</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "Our direct orders skyrocketed. Customers love the Apple Pay option and tracking interface."
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    T
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Theresa Chen</h5>
                    <p className="text-[10px] text-gray-400">Co-founder, Dumpling House</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "We finally own our guest data. Seamless payouts and excellent customer service from the team."
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    R
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Robert Diaz</h5>
                    <p className="text-[10px] text-gray-400">GM, Tacos & Co.</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#fbf8f5] text-[#2c2c2c] p-6 rounded-2xl w-[320px] shrink-0 text-left shadow-md">
                <p className="text-xs text-[#2c2c2c]/80 italic">
                  "Our bottom-line margins have never looked this healthy. The website is lightning fast!"
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full bg-[#094413] text-white flex items-center justify-center text-xs font-semibold font-heading">
                    S
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold font-heading">Sarah Jenkins</h5>
                    <p className="text-[10px] text-gray-400">Founder, Cafe Nectar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BRAND TECH / GRID SECTION ==================== */}
      <section className="py-24 px-6 bg-[#fbf8f5]">
        <div className="max-w-[83rem] mx-auto text-center">
          <div className="max-w-2xl mx-auto mb-16">
            <span className="font-mono-brand text-xs uppercase text-[#088924] tracking-wider block mb-2 font-semibold">
              RESTAURANT FIRST TECH
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#2c2c2c] font-heading">
              The same technology big brands use, built for you.
            </h2>
          </div>

          {/* Bento Grid Architecture (1 large, 2 small) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Large Card: Top / Left (Spans 3 cols on small, 2 on lg) */}
            <div className="lg:col-span-2 bg-[#f6eee5] rounded-3xl p-8 md:p-12 border border-[#2c2c2c]/5 flex flex-col justify-between min-h-[460px]">
              <div>
                <span className="font-mono-brand text-xs text-[#088924] tracking-widest uppercase font-semibold">
                  01 // PREMIUM WEB BUILDER
                </span>
                <h3 className="text-2xl md:text-3xl font-semibold text-[#094413] mt-3 tracking-tight font-heading">
                  Your restaurant website is your digital storefront
                </h3>
                <p className="text-sm md:text-base text-[#2c2c2c]/75 mt-3 max-w-lg">
                  Fully customized websites optimized to rank high on search engines. Built specifically to secure first-click direct orders instead of third-party platform diversion.
                </p>
              </div>

              {/* Mock Website Builder Interface Container */}
              <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-4 max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#088924]/10 flex items-center justify-center">
                    <iconify-icon icon="solar:globus-linear" className="text-[#088924] text-xl"></iconify-icon>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Direct Booking Engine Active</p>
                    <p className="text-[10px] text-gray-400">Load speed 0.4s — SEO Optimized</p>
                  </div>
                </div>
                <span className="bg-[#088924] text-white text-[10px] font-semibold px-3 py-1.5 rounded-full">
                  Score: 99/100
                </span>
              </div>
            </div>

            {/* Small Card Right Bottom 1: AI Smart Ordering */}
            <div className="bg-gradient-to-br from-[#094413] to-[#088924] text-[#fbf8f5] rounded-3xl p-8 flex flex-col justify-between min-h-[460px] select-none">
              <div>
                <span className="font-mono-brand text-xs text-[#088924] bg-white/10 px-2 py-1 rounded tracking-widest uppercase font-semibold">
                  02 // CONVERSION ENGINE
                </span>
                <h3 className="text-2xl font-semibold mt-3 tracking-tight font-heading">
                  AI Smart upsells automatically increase ticket value
                </h3>
                <p className="text-xs md:text-sm text-white/80 mt-3">
                  Intelligent recommendation algorithms prompt orders dynamically, driving higher average order value naturally.
                </p>
              </div>

              {/* Checkout Upsell Pill Mock */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-3 mt-6">
                <div className="text-[10px] font-semibold tracking-wider uppercase text-white/60 font-mono-brand">
                  AI UPSELL TRIGGERED
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span>Add Chocolate Chip Cookie?</span>
                  <button 
                    onClick={() => setAddedCookie(!addedCookie)}
                    className="bg-[#fbf8f5] text-[#094413] px-2.5 py-1 rounded-lg font-semibold text-[10px] hover:bg-black hover:text-white transition-colors"
                  >
                    {addedCookie ? 'Added ✓' : '+$1.99'}
                  </button>
                </div>
              </div>
            </div>

            {/* Small Card Bottom 2: Branded Apps */}
            <div className="bg-[#f6eee5] rounded-3xl p-8 border border-[#2c2c2c]/5 flex flex-col justify-between min-h-[460px]">
              <div>
                <span className="font-mono-brand text-xs text-[#088924] tracking-widest uppercase font-semibold">
                  03 // APP STACK
                </span>
                <h3 className="text-2xl font-semibold text-[#094413] mt-3 tracking-tight font-heading">
                  Your own branded mobile app
                </h3>
                <p className="text-xs md:text-sm text-[#2c2c2c]/75 mt-3">
                  Give your regulars a native checkout experience. Cultivate community and launch push notification rewards directly to their lock screens.
                </p>
              </div>

              {/* App Store Mock Preview */}
              <div className="mt-8 bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-[#094413] flex items-center justify-center text-white font-semibold font-heading">
                  S
                </div>
                <div>
                  <p className="text-xs font-semibold">Saffron Grills App</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <iconify-icon icon="solar:star-bold" className="text-amber-400 text-xs"></iconify-icon>
                    <iconify-icon icon="solar:star-bold" className="text-amber-400 text-xs"></iconify-icon>
                    <iconify-icon icon="solar:star-bold" className="text-amber-400 text-xs"></iconify-icon>
                    <iconify-icon icon="solar:star-bold" className="text-amber-400 text-xs"></iconify-icon>
                    <iconify-icon icon="solar:star-bold" className="text-amber-400 text-xs"></iconify-icon>
                    <span className="text-[9px] text-gray-400 ml-1">
                      (1.2K Ratings)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== THE 3 BELIEFS SECTION ==================== */}
      <section id="beliefs" className="py-24 px-6 bg-[#f9f3ed] border-t border-[#2c2c2c]/5">
        <div className="max-w-[83rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          {/* Left Column: Large Heading */}
          <div className="lg:col-span-5 text-left">
            <span className="font-mono-brand text-xs uppercase text-[#088924] tracking-wider block mb-2 font-semibold">
              OUR MANIFESTO
            </span>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-[#094413] leading-none font-heading">
              3 beliefs that guide our company.
            </h2>
            <p className="text-sm md:text-base text-[#2c2c2c]/70 mt-6 leading-relaxed">
              At Owner, we succeed only when your business succeeds. Our philosophy centers on removing the parasitic layer of third-party commission models.
            </p>
          </div>

          {/* Right Column: Vertical list of beliefs */}
          <div className="lg:col-span-7 space-y-12 text-left">
            {/* Belief 1 */}
            <div className="border-b border-[#2c2c2c]/10 pb-8">
              <span className="font-mono-brand text-xs text-[#088924] font-semibold block uppercase">
                01 / Independent restaurants deserve the best tech
              </span>
              <h4 className="text-xl font-semibold text-[#2c2c2c] mt-2 tracking-tight font-heading">
                Enterprise tech shouldn't be reserved for massive chains
              </h4>
              <p className="text-sm text-[#2c2c2c]/70 mt-2">
                The neighborhood spots represent the soul of the community. We've optimized direct conversion models so your operation enjoys a matching competitive edge.
              </p>
            </div>

            {/* Belief 2 */}
            <div className="border-b border-[#2c2c2c]/10 pb-8">
              <span className="font-mono-brand text-xs text-[#088924] font-semibold block uppercase">
                02 / Keep 100% of your hard-earned sales revenue
              </span>
              <h4 className="text-xl font-semibold text-[#2c2c2c] mt-2 tracking-tight font-heading">
                Commissions are a relics of third-party aggregators
              </h4>
              <p className="text-sm text-[#2c2c2c]/70 mt-2">
                We operate on a flat SaaS model so that your expansion stays entirely inside your checkbook. No platform should tax your success.
              </p>
            </div>

            {/* Belief 3 */}
            <div className="pb-4">
              <span className="font-mono-brand text-xs text-[#088924] font-semibold block uppercase">
                03 / Own your direct relationship with customers
              </span>
              <h4 className="text-xl font-semibold text-[#2c2c2c] mt-2 tracking-tight font-heading">
                Your guest data belongs entirely to you
              </h4>
              <p className="text-sm text-[#2c2c2c]/70 mt-2">
                Collect consumer profiles, trace dietary dynamics, and grow direct relations with automated retargeting that works under your absolute ownership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FINAL CALL TO ACTION ==================== */}
      <section className="py-24 px-6 bg-[#fbf8f5]">
        <div className="max-w-[83rem] mx-auto">
          <div className="bg-gradient-to-tr from-[#094413] to-[#088924] rounded-[3.5rem] p-12 md:p-20 text-center text-[#fbf8f5] relative overflow-hidden shadow-2xl">
            {/* Background texture overlay */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <span className="font-mono-brand text-xs uppercase tracking-widest text-[#088924] font-semibold mb-4 bg-white px-3 py-1 rounded-full">
                READY TO SCALE?
              </span>
              <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-tight mb-8 font-heading">
                Take control of your digital sales channel today.
              </h2>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <a href="#audit-form" className="bg-[#094413] hover:bg-black text-[#fbf8f5] text-sm font-medium px-8 py-4 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 shadow-md">
                  Get Your Free AI Audit
                </a>
                <a href="mailto:expert@owner.com" target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-8 py-4 rounded-xl backdrop-blur-sm transition-all duration-300 border border-white/10 flex items-center justify-center gap-1.5">
                  Talk to an Expert
                  <iconify-icon icon="solar:arrow-right-linear" className="text-base"></iconify-icon>
                </a>
              </div>

              <p className="text-xs text-white/60 mt-6 font-mono-brand">
                * Complete website analysis and commission savings estimation included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-[#094413] text-[#fbf8f5] pt-20 pb-12 border-t border-white/5 px-6">
        <div className="max-w-[83rem] mx-auto">
          {/* Top Grid: Brand Column + Resource Link Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 pb-16 border-b border-white/10">
            {/* Brand identity */}
            <div className="lg:col-span-2 text-left space-y-6">
              <a href="#" className="flex items-center gap-1.5 group">
                <span className="text-2xl font-bold text-white tracking-tight font-heading">
                  owner
                  <span className="text-[#088924] font-medium">OS</span>
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#088924] block"></span>
              </a>
              <p className="text-xs text-white/70 max-w-sm leading-relaxed">
                The specialized operating system for neighborhood restaurants. Turn online operations into direct commission-free growth engines automatically.
              </p>
              <div className="flex items-center gap-4 text-white/50 text-lg">
                <a href="#" className="hover:text-white transition-colors">
                  <iconify-icon icon="solar:global-linear"></iconify-icon>
                </a>
                <a href="#" class="hover:text-white transition-colors">
                  <iconify-icon icon="solar:smartphone-linear"></iconify-icon>
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  <iconify-icon icon="solar:graph-up-linear"></iconify-icon>
                </a>
              </div>
            </div>

            {/* Links Col 1 */}
            <div className="text-left space-y-4">
              <h5 className="font-mono-brand text-xs tracking-wider text-white/40 uppercase font-semibold">
                Products
              </h5>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li><a href="#ordering" className="hover:text-white transition-colors">Direct Ordering</a></li>
                <li><a href="#apps" className="hover:text-white transition-colors">Branded Mobile Apps</a></li>
                <li><a href="#ecosystem" className="hover:text-white transition-colors">Local SEO Dominance</a></li>
                <li><a href="#conversions" className="hover:text-white transition-colors">AI Retargeting SMS</a></li>
              </ul>
            </div>

            {/* Links Col 2 */}
            <div className="text-left space-y-4">
              <h5 className="font-mono-brand text-xs tracking-wider text-white/40 uppercase font-semibold">
                Company
              </h5>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li><a href="#beliefs" className="hover:text-white transition-colors">Our Beliefs</a></li>
                <li><a href="#success-stories" className="hover:text-white transition-colors">Success Stories</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Press</a></li>
              </ul>
            </div>

            {/* Links Col 3 */}
            <div className="text-left space-y-4">
              <h5 className="font-mono-brand text-xs tracking-wider text-white/40 uppercase font-semibold">
                Resources
              </h5>
              <ul className="space-y-2.5 text-xs text-white/70">
                <li><a href="#" className="hover:text-white transition-colors">Free Marketing Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Calculator Insights</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Developer API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Compliance Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-white/40 gap-4">
            <p>© 2025 Owner Inc. All direct rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">CCPA Request</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ==================== INTERACTIVE AUDIT MODAL MODIFIER ==================== */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#fbf8f5] rounded-3xl p-6 md:p-8 max-w-md w-full border border-[#2c2c2c]/10 shadow-2xl relative text-left">
            <button 
              onClick={() => setShowAuditModal(false)}
              className="absolute top-4 right-4 text-[#2c2c2c]/60 hover:text-black"
            >
              <iconify-icon icon="solar:close-square-linear" className="text-2xl"></iconify-icon>
            </button>

            {auditStep === 1 && (
              <div className="text-center py-12 space-y-4 animate-fade-in">
                <div className="animate-spin inline-block w-12 h-12 border-4 border-[#088924] border-t-transparent rounded-full"></div>
                <h3 className="text-lg font-semibold font-heading text-[#094413]">Analyzing SEO Coordinates...</h3>
                <p className="text-xs text-gray-500">Checking indexing metadata of {websiteUrl}</p>
              </div>
            )}

            {auditStep === 2 && (
              <div className="text-center py-12 space-y-4 animate-fade-in">
                <div className="animate-pulse inline-block w-12 h-12 bg-[#088924]/10 text-[#088924] rounded-full flex items-center justify-center">
                  <iconify-icon icon="solar:calculator-linear" className="text-2xl"></iconify-icon>
                </div>
                <h3 className="text-lg font-semibold font-heading text-[#094413]">Estimating Aggregator Leaks...</h3>
                <p className="text-xs text-gray-500">Calculating commission payouts to third party marketplaces</p>
              </div>
            )}

            {auditStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 bg-[#088924]/10 text-[#088924] rounded-full flex items-center justify-center mb-2">
                    <iconify-icon icon="solar:verified-check-linear" className="text-2xl"></iconify-icon>
                  </div>
                  <h3 className="text-xl font-semibold font-heading text-[#094413]">Site Audit Complete!</h3>
                  <p className="text-xs text-gray-400">Diagnosis for {websiteUrl}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-xs font-semibold">SEO Ranking Score</span>
                    <span className="text-xs font-mono-brand text-[#088924] font-semibold bg-[#088924]/10 px-2 py-0.5 rounded">
                      Poor (34/100)
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-xs font-semibold">Annual Commission Leakage</span>
                    <span className="text-xs font-mono-brand text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                      -$14,800/yr
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                    <span className="text-xs font-semibold">Page-Load Speed</span>
                    <span className="text-xs font-mono-brand text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                      3.8 seconds
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#094413] text-[#fbf8f5] text-xs rounded-xl flex items-center gap-3">
                  <iconify-icon icon="solar:verified-check-linear" className="text-lg text-[#088924] shrink-0"></iconify-icon>
                  <span>Owner OS can save you $1,200+ monthly and increase load speeds to 0.4s automatically.</span>
                </div>

                <button 
                  onClick={() => {
                    setShowAuditModal(false);
                    setWebsiteUrl('');
                    alert('An operations specialist will follow up at your website address shortly!');
                  }}
                  className="w-full bg-[#088924] hover:bg-[#094413] text-white py-3 rounded-xl text-center text-xs font-semibold transition-colors"
                >
                  Claim My Free Branded Storefront Setup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout confirmation overlay */}
      {checkoutTriggered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#fbf8f5] rounded-3xl p-6 md:p-8 max-w-sm w-full border border-[#2c2c2c]/10 shadow-2xl relative text-center space-y-4">
            <iconify-icon icon="solar:chef-hat-heart-linear" className="text-5xl text-[#088924]"></iconify-icon>
            <h3 className="text-lg font-bold font-heading text-[#094413]">Direct Order Placed!</h3>
            <p className="text-xs text-[#2c2c2c]/70 leading-normal">
              You just processed a direct checkout ticket value of <strong className="text-black">{addedNaan ? '$20.49' : '$18.99'}</strong> with <strong className="text-[#088924]">0% commission fees</strong> paid to third party networks.
            </p>
            <div className="bg-white p-3 rounded-xl border border-gray-100 text-left space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-400">Total Charged:</span>
                <span className="font-semibold">{addedNaan ? '$20.49' : '$18.99'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-400">Merchant Payout:</span>
                <span className="font-semibold text-[#088924]">{addedNaan ? '$20.49 (100%)' : '$18.99 (100%)'}</span>
              </div>
            </div>
            <button 
              onClick={() => setCheckoutTriggered(false)}
              className="w-full bg-[#094413] hover:bg-[#088924] text-white py-2.5 rounded-xl text-xs font-medium transition-colors"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      )}
    </div>
  );
}